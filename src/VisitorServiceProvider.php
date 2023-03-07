<?php

namespace InteractiveVision\Visitor;


use Illuminate\Http\Request;
use Illuminate\Support\ServiceProvider;
use InteractiveVision\Globals\View\Directives\RenderVisitorGlobals;
use InteractiveVision\Visitor\Config\VisitorConfiguration;
use InteractiveVision\Visitor\View\Directives\RenderVisitorApp;
use InteractiveVision\Visitor\View\Directives\RenderVisitorHead;


class VisitorServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->registerConsoleCommands();

        $this->publishes([
            __DIR__ . '/../config/visitor.php' => $this->app->basePath('config/visitor.php'),
        ], ['interactivevision:config']);
    }


    public function register(): void
    {
        $this->app->singleton(VisitorConfiguration::class);
        $this->app->singleton(VisitorFactory::class);

        $this->mergeConfigFrom(__DIR__ . '/../config/visitor.php', 'visitor');

        $this->registerBladeDirectives();
        $this->registerRequestMacro();
    }


    protected function registerBladeDirectives(): void
    {
        $this->callAfterResolving('blade.compiler', function ($blade) {
            $blade->directive('visitor', [RenderVisitorApp::class, 'compile']);
            $blade->directive('head', [RenderVisitorHead::class, 'compile']);
            $blade->directive('globals', [RenderVisitorGlobals::class, 'compile']);
        });
    }


    protected function registerConsoleCommands(): void
    {
        if (! $this->app->runningInConsole()) {
            return;
        }

        $this->commands([
            Commands\StartNodeServer::class,
            Commands\StopNodeServer::class,
        ]);
    }


    protected function registerRequestMacro(): void
    {
        Request::macro('visitor', function () {
            return (bool) $this->header('X-Visitor');
        });
    }
}
