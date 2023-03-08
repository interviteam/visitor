<?php

namespace InteractiveVision\Visitor\Config;


use Illuminate\Contracts\Config\Repository;
use InteractiveVision\Visitor\Exceptions\InvalidConfigurationException;


class VisitorConfiguration
{
    private string $bundle;


    private bool $enabled;


    private mixed $port;


    private string $url;


    public function __construct(Repository $config)
    {
        $this->bundle = $config->get('visitor.ssr.bundle', 'bootstrap/ssr/ssr.mjs');
        $this->port = $config->get('visitor.ssr.port', 2137);
        $this->url = $config->get('visitor.ssr.url', 'http://127.0.0.1:2137');
        $this->enabled = (bool) $config->get('visitor.ssr.enabled', false);
    }


    public function getServerRenderingBundle(): string
    {
        if (! file_exists($this->bundle)) {
            throw new InvalidConfigurationException("SSR bundle was not found in specified path \"{$this->bundle}\".");
        }

        return $this->bundle;
    }


    public function getServerRenderingHost(): string
    {
        return $this->url;
    }


    public function getServerRenderingPort(): mixed
    {
        return $this->port;
    }


    public function isServerRenderingEnabled(): bool
    {
        return $this->enabled;
    }
}
