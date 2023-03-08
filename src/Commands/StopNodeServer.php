<?php

namespace InteractiveVision\Visitor\Commands;


use Illuminate\Console\Command;
use InteractiveVision\Visitor\Config\VisitorConfiguration;


class StopNodeServer extends Command
{
    protected $description = 'Stop the SSR server';


    protected $name = 'visitor:stop';


    public function handle(VisitorConfiguration $config): int
    {
        $ch = curl_init($config->getServerShutdownUrl());
        curl_exec($ch);

        if (curl_error($ch) !== 'Empty reply from server') {
            $this->error('Unable to connect to SSR server.');

            return self::FAILURE;
        }

        $this->info('SSR server stopped.');

        curl_close($ch);

        return self::SUCCESS;
    }
}
