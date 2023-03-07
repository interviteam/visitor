<?php

namespace InteractiveVision\Visitor\View\Directives;


class RenderVisitorScript
{
    public static function compile(): string
    {
        return '<script id="__VISITOR__" type="application/json"><?php echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?></script>';
    }
}
