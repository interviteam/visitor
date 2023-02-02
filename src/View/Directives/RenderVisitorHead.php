<?php

namespace InteractiveVision\Visitor\View\Directives;


class RenderVisitorHead
{
    public static function compile(): string
    {
        $template = '
            <?php foreach($data[\'visit\'][\'props\'][\'meta\'] ?? [] as $meta): ?>
                <?php if($meta[\'type\'] === \'title\'): ?>
                    <title visitor><?php echo $meta[\'content\'] ?></title>
                <?php endif; ?>
                
                <?php if($meta[\'type\'] === \'meta\'): ?>
                    <meta visitor name="<?php echo $meta[\'name\'] ?>" content="<?php echo $meta[\'content\'] ?>"/>
                <?php endif; ?>
                
                <?php if($meta[\'type\'] === \'snippet\'): ?>
                    <script visitor type="application/ld+json">
                      <?php echo $meta[\'content\'] ?>
                    </script>
                <?php endif; ?>
            <?php endforeach; ?>
        ';

        return implode('', array_map('trim', explode("\n", $template)));
    }
}
