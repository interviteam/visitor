<?php

namespace InteractiveVision\Visitor;


use Closure;
use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Contracts\Support\Responsable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Traits\Macroable;
use InteractiveVision\Visitor\Config\VisitorConfiguration;
use InteractiveVision\Visitor\Http\Node\ServerRenderingGateway;
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


    private string|null|false $guard = false;


    private string $location;


    private string $manifest;


    private string $mode = self::MODE_CSR;


    private Closure|array $props = [];


    private array $shared = [];


    private ?string $target = null;


    private string $version = '';


    private string $view = 'app';


    public function __construct(VisitorConfiguration $config)
    {
        $this->config = $config;
    }


    public function back(): static
    {
        return $this->redirect(Redirect::back());
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
            return $this->renderClient($component, $callback());
        }

        $this->mode = self::MODE_SSG;
        $this->component = $component;
        $this->props = $callback;

        return $this;
    }


    public function setCacheKey(Closure|string $key): static
    {
        $this->cacheKey = value($key);

        return $this;
    }


    public function setGuard(string|null|false $guard): static
    {
        $this->guard = $guard;

        return $this;
    }


    public function setManifest(string $manifest): static
    {
        if (file_exists($manifest = App::basePath($manifest))) {
            $this->version = md5_file($manifest) ?: '';
        }

        return $this;
    }


    public function setView(string $name): static
    {
        $this->view = $name;

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
        // Redirects always goes first. Visitor router component detects the `X-Visitor-Location` header
        // and follows redirects until proper visit response is received.
        if ($this->target) {
            return Response::noContent(302, ['X-Visitor-Location' => $this->target]);
        }

        $this->location = $request->getBaseUrl() . $request->getRequestUri();
        $this->cacheKey = $this->cacheKey ?: $this->location;

        $data = $this->resolveVisitData();

        // For "X-Visitor" requests we simply return a JSON data with visit details.
        // These requests are sent when in hydrated SPA already, so everything will be rendered on client side.
        if ($request->visitor()) {
            return Response::json($this->attachSession($data), 200, ['X-Visitor' => 'true']);
        }

        // For initial page load, we have to respond with root view and the initial visit data to be hydrated into
        // SPA by client. Optionally you can pre-render content in SSR in SSG modes for indexing.
        $rendered = $this->resolveVisitView($data);

        // Once initial page is rendered we can now safely attach session information about user. Visitors SSR and SSG
        // always works in anonymous mode to avoid user specific data leaks when content is cached. Instead, we attach
        // the data now, and the client router component is made such way, that it will update its session context
        // just once it's hydrated.
        $data = $this->attachSession($data);

        return Response::view($this->view, compact('data', 'rendered'));
    }


    private function attachSession(array $data): array
    {
        if ($this->guard === false) {
            return $data;
        }

        $guard = Auth::guard($this->guard);

        $data['session'] = [
            'is_authenticated' => $guard->check(),
            'user' => $guard->user(),
            'via_remember' => $guard->viaRemember(),
        ];

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
        return [
            'view' => $this->component,
            'shared' => $this->shared,
            'props' => value($this->props),
            'version' => $this->version,
        ];
    }


    private function resolveVisitData(): array
    {
        // For SSG we want to cache built data to speed up server response. We use separate cache store since
        // we always want to load data from cache, when views are loaded only on initial page loads.
        if ($this->mode === self::MODE_SSG) {
            return Cache::driver('visitor.data')->rememberForever(
                key: $this->cacheKey,
                callback: fn() => $this->makeData()
            );
        }

        // SSR should be used when you need indexing, but data changes so often there is no point to cache anything.
        // CSR should be used for other cases.
        return $this->makeData();
    }


    private function resolveVisitView(array $data): string
    {
        // For CSR mode we don't render anything since everything will be rendered on the client side.
        // There is no need to waste resources here for rendering on server.
        if ($this->mode === self::MODE_CSR) {
            return '';
        }

        // When in SSG mode we want to cache the rendered view in separate store. We want to keep separate
        // the cached data and views, since when a request is an "X-Visitor" request we don't need view at all,
        // since we're in SPA already, only data will be delivered for client to render client side. This case
        // will be used only for initial page loads.
        if ($this->mode === self::MODE_SSG) {
            return Cache::driver('visitor.views')->rememberForever(
                key: $this->cacheKey,
                callback: fn() => $this->sendServerRenderingRequest($data)
            );
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
