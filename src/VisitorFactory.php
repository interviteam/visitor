<?php

namespace InteractiveVision\Visitor;


use Closure;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Session\Store;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Traits\Macroable;
use InteractiveVision\Globals\Facades\Globals;
use InteractiveVision\Visitor\Config\VisitorConfiguration;
use InteractiveVision\Visitor\Http\Node\ServerRenderingGateway;
use LogicException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;


class VisitorFactory implements Responsable
{
    use Macroable;


    private const MODE_CSR = 'CSR';


    private const MODE_SSG = 'SSG';


    private const MODE_SSR = 'SSR';


    private ?string $cacheKey = null;


    private string $component;


    private VisitorConfiguration $config;


    private Dispatcher $dispatcher;


    private string|null|false $guard = false;


    private string $location;


    private string $manifest;


    private string $mode = self::MODE_CSR;


    private Closure|array $props = [];


    private Store $session;


    private array $shared = [];


    private ?string $target = null;


    private string $version = '';


    private string $view = '';


    public function __construct(
        VisitorConfiguration $config,
        Dispatcher           $dispatcher,
        Store                $session
    ) {
        $this->config = $config;
        $this->dispatcher = $dispatcher;
        $this->session = $session;
    }


    public function back(): static
    {
        return $this->redirect(Redirect::back());
    }


    public function getGuard(): string|null|false
    {
        return $this->guard;
    }


    public function setGuard(string|null|false $guard): static
    {
        $this->guard = $guard;

        return $this;
    }


    public function getView(): string
    {
        return $this->view;
    }


    public function setView(string $name): static
    {
        $this->view = $name;

        return $this;
    }


    public function redirect(RedirectResponse|string $url): static
    {
        $this->target = $url instanceof RedirectResponse ? $url->getTargetUrl() : $url;

        return $this;
    }


    public function renderClient(string $component, array $props = []): static
    {
        $this->mode = self::MODE_CSR;
        $this->component = $component;
        $this->props = $props;

        return $this;
    }


    public function renderServer(string $component, array $props = []): static
    {
        if (! $this->config->isServerRenderingEnabled()) {
            return $this->renderClient($component, $props);
        }

        $this->mode = self::MODE_SSR;
        $this->component = $component;
        $this->props = $props;

        return $this;
    }


    public function renderStatic(string $component, Closure $callback = null): static
    {
        if (! $this->config->isServerRenderingEnabled()) {
            return $this->renderClient($component, is_null($callback) ? [] : $callback());
        }

        $this->mode = self::MODE_SSG;
        $this->component = $component;
        $this->props = is_null($callback) ? [] : $callback;

        return $this;
    }


    public function renderStaticLazy(Closure $callback = null): static
    {
        return $this->renderStatic('', $callback);
    }


    public function setCacheKey(Closure|string $key): static
    {
        $this->cacheKey = value($key);

        return $this;
    }


    public function setManifest(string $manifest): static
    {
        if (file_exists($manifest = App::basePath($manifest))) {
            $this->version = md5_file($manifest) ?: '';
        }

        return $this;
    }


    public function share(Arrayable|array|string $key, mixed $value = null): static
    {
        if (is_array($key)) {
            $this->shared = array_merge($this->shared, $key);
        } elseif ($key instanceof Arrayable) {
            $this->shared = array_merge($this->shared, $key->toArray());
        } else {
            Arr::set($this->shared, $key, $value);
        }

        return $this;
    }


    public function toResponse($request): SymfonyResponse
    {
        // Redirects always goes first. Visitor router component detects
        // the `X-Visitor-Location` header and follows redirects until
        // proper visit response is received.
        if ($this->target) {
            return Response::noContent(302, ['X-Visitor-Location' => $this->target]);
        }

        $this->location = $request->fullUrl();
        $this->cacheKey = $this->cacheKey ?: $this->location;

        $data = $this->resolveVisitData();

        // For "X-Visitor" requests we simply return a JSON data with visit
        // details. These requests are sent when in hydrated SPA already,
        // so everything will be rendered on client side.
        if ($request->visitor()) {
            return Response::json($this->attachSession($data), 200, ['X-Visitor' => 'true']);
        }

        // We want to attach globals for the initial page load only.
        // It might provide some global stuff from plugins like,
        // for example translations or routes.
        $data = $this->attachGlobals($data);

        // For initial page load, we have to respond with root view and
        // the initial visit data to be hydrated into SPA by client.
        // Optionally you can pre-render content in SSR in SSG modes
        // for indexing.
        $rendered = $this->resolveVisitView($data);

        // Once initial page is rendered we can now safely attach session
        // information about user. Visitors SSR and SSG always works in
        // anonymous mode to avoid user specific data leaks when content
        // is cached. Instead, we attach the data now, and the client router
        // component is made such way, that it will update its session context
        // just once it's hydrated.
        $data = $this->attachSession($data);

        return Response::view($this->view, compact('data', 'rendered'));
    }


    private function attachGlobals(array $data): array
    {
        if (class_exists(Globals::class)) {
            $data['globals'] = Globals::register()->all();
        }

        return $data;
    }


    private function attachSession(array $data): array
    {
        $data['session'] = [
            'is_authenticated' => false,
            'user' => null,
            'via_remember' => true,
            'flash' => (object) $this->session->get('_flash.old', []),
        ];

        if ($this->guard === false) {
            return $data;
        }

        $guard = Auth::guard($this->guard);

        $data['session']['is_authenticated'] = $guard->check();
        $data['session']['user'] = $guard->user();
        $data['session']['via_remember'] = $guard->viaRemember();

        return $data;
    }


    private function makeAnonymousSession(): array
    {
        return [
            'is_authenticated' => false,
            'user' => null,
            'via_remember' => false,
        ];
    }


    private function makeData(): array
    {
        return [
            'session' => $this->makeAnonymousSession(),
            'location' => $this->location,
            'visit' => $this->makeVisit(),
        ];
    }


    private function makeVisit(): array
    {
        // Resolve closure before return statement so any other calls
        // to this service within closure might be done.
        $props = value($this->props);
        $component = Arr::get($props, 'component', $this->component);

        throw_if(empty($component), new LogicException(
            'You must provide component within props when resolving view lazily.'
        ));

        return [
            'view' => $component,
            'shared' => $this->shared,
            'props' => $props,
            'version' => $this->version,
        ];
    }


    private function resolveVisitData(): array
    {
        // For SSG we want to cache built data to speed up server response.
        // We use separate cache store since we always want to load data
        // from cache, when views are loaded only on initial page loads.
        if ($this->mode === self::MODE_SSG && App::environment('production')) {
            // TODO: Temporarily disable caching, until some solution for cache keys is found.
            // return Cache::driver('visitor.data')->rememberForever(
            //     key: $this->cacheKey,
            //     callback: fn() => $this->makeData()
            // );
        }

        // SSR should be used when you need indexing, but data changes
        // so often there is no point to cache anything.
        // CSR should be used for other cases.
        return $this->makeData();
    }


    private function resolveVisitView(array $data): string
    {
        // For CSR mode we don't render anything since everything will be
        // rendered on the client side. There is no need to waste resources
        // here for rendering on server.
        if ($this->mode === self::MODE_CSR) {
            return '';
        }

        // When in SSG mode we want to cache the rendered view
        // in separate store. We want to keep separate the cached data
        // and views, since when a request is an "X-Visitor" request
        // we don't need view at all, since we're in SPA already,
        // only data will be delivered for client to render client side.
        // This case will be used only for initial page loads.
        if ($this->mode === self::MODE_SSG && App::environment('production')) {
            // TODO: Temporarily disable caching, until some solution for cache keys is found.
            // return Cache::driver('visitor.views')->rememberForever(
            //     key: $this->cacheKey,
            //     callback: fn() => $this->sendServerRenderingRequest($data)
            // );
        }

        // SSR mode is simply the same but without caching.
        // It will be used only for initial page loads.
        return $this->sendServerRenderingRequest($data);
    }


    private function sendServerRenderingRequest(array $data): string
    {
        return App::make(ServerRenderingGateway::class)->render($data);
    }
}
