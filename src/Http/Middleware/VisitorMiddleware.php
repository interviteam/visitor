<?php

namespace InteractiveVision\Visitor\Http\Middleware;


use Closure;
use Illuminate\Http\Request;
use InteractiveVision\Visitor\Facades\Visitor;


class VisitorMiddleware
{
    /**
     * Declare guard for React middleware handling requests.
     * You can define explicitly which guard should be used to load user.
     * Set {@code null} to use default guard.
     *
     * When you don't need auth at all, set to {@code false}.
     *
     * @var string|false|null
     */
    protected string|null|false $guard = false;


    /**
     * Specify path for your assets manifest. It will be used to generate
     * a version hash of your application and handle auto updates.
     *
     * By default, we look for standard Vite's manifest path in Laravel app.
     *
     * @var string
     */
    protected string $manifest = 'public/build/manifest.json';


    /**
     * Specify path for root template of your app.
     * By default, we look for {@code app.blade.php} file within views.
     *
     * @var string
     */
    protected string $root = 'app';


    public function handle(Request $request, Closure $next)
    {
        Visitor::setView($this->root($request));
        Visitor::setManifest($this->manifest($request));

        return $next($request);
    }


    public function manifest(Request $request): string
    {
        return $this->manifest;
    }


    public function root(Request $request): string
    {
        return $this->root;
    }
}
