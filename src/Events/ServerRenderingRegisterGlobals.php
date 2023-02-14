<?php

namespace InteractiveVision\Visitor\Events;


use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;


class ServerRenderingRegisterGlobals
{
    use InteractsWithSockets, SerializesModels;


    private Collection $globals;


    public function __construct()
    {
        $this->globals = new Collection();
    }


    public function all(): array
    {
        return $this->globals->all();
    }


    public function provide(string $name, mixed $value): static
    {
        $this->globals->put($name, $value);

        return $this;
    }
}
