<?php

namespace InteractiveVision\Visitor\View\Directives;


class RenderVisitorApp
{
    public static function compile($expression = ''): string
    {
        $id = trim(trim($expression), "\'\"") ?: 'app';

        $template = '
            <div id="' . $id . '"><?php echo $rendered; ?></div>
            <script id="__VISITOR__" type="application/json"><?php echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); ?></script>
        ';

        return implode('', array_map('trim', explode("\n", $template)));
    }
}
