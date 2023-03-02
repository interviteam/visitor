<?php

namespace InteractiveVision\Visitor\Http\Node;


use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Support\Facades\Http;
use InteractiveVision\Visitor\Config\VisitorConfiguration;
use InteractiveVision\Visitor\Events\RegisteringGlobals;
use InteractiveVision\Visitor\Exceptions\ServerRenderingException;
use Throwable;


class ServerRenderingGateway
{
    private VisitorConfiguration $config;


    private Dispatcher $dispatcher;


    public function __construct(Dispatcher $dispatcher, VisitorConfiguration $config)
    {
        $this->config = $config;
        $this->dispatcher = $dispatcher;
    }


    public function render(array $visit): ?string
    {
        if (! $this->config->isServerRenderingEnabled()) {
            throw new ServerRenderingException("Invalid SSR configuration or JS bundle missing!");
        }

        $url = rtrim($this->config->getServerRenderingHost(), '/') . '/render';
        $globals = tap(new RegisteringGlobals(), fn($event) => $this->dispatcher->dispatch($event))->all();

        try {
            $rendered = Http::post($url, compact('visit', 'globals'))->throw()->body();
        }
        catch (Throwable $e) {
            throw new ServerRenderingException("SSR request failed!", previous: $e);
        }

        if (is_null($rendered)) {
            throw new ServerRenderingException("Empty SSR response detected!");
        }

        return $rendered;
    }
}
