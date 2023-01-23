<?php

namespace InteractiveVision\Visitor\Facades;


use Illuminate\Support\Facades\Facade;
use InteractiveVision\Visitor\VisitorFactory;


final class Visitor extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return VisitorFactory::class;
    }
}
