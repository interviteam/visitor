<?php

namespace InteractiveVision\Visitor\View\Directives;


class RenderVisitorApp
{
    public static function compile($expression = ''): string
    {
        $id = trim(trim($expression), "\'\"") ?: 'app';

        return '<div id="' . $id . '"><?php echo $rendered; ?></div>';
    }
}
