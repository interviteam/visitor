<?php

namespace InteractiveVision\Visitor\View\Directives;


class RenderVisitorGlobals
{
    public static function compile(): string
    {
        $template = '
            <script type="text/javascript">
              <?php foreach(app(\'InteractiveVision\\\\Visitor\\\\VisitorFactory\')->registerGlobals() as $name => $value): ?>
              var <?php echo $name ?> = <?php echo json_encode($value) ?>;
              <?php endforeach; ?>
            </script>
        ';

        return implode('', array_map('trim', explode("\n", $template)));
    }
}
