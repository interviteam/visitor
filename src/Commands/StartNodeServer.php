<?php

namespace InteractiveVision\Visitor\Commands;


use Illuminate\Console\Command;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Support\Facades\App;
use InteractiveVision\Visitor\Config\VisitorConfiguration;
use InteractiveVision\Visitor\Exceptions\ServerRenderingException;
use Symfony\Component\Process\Process;


class StartNodeServer extends Command
{
    protected $description = 'Start the SSR node server.';


    protected $name = 'visitor:start';


    public function handle(VisitorConfiguration $config): int
    {
        if (! $config->isServerRenderingEnabled()) {
            $this->error('SSR is not enabled. Enable it via the `visitor.ssr.enabled` config option.');

            return self::FAILURE;
        }

        $this->callSilently('visitor:stop');

        $process = new Process(['node', $config->getServerRenderingBundle()]);
        $process->setTimeout(null);
        $process->start();

        $stop = function () use ($process) {
            $process->stop();
        };

        pcntl_async_signals(true);
        pcntl_signal(SIGINT, $stop);
        pcntl_signal(SIGQUIT, $stop);
        pcntl_signal(SIGTERM, $stop);

        foreach ($process as $type => $data) {
            if ($process::OUT === $type) {
                $this->info(trim($data));
            } else {
                $this->error(trim($data));

                App::make(ExceptionHandler::class)->report(new ServerRenderingException($data));
            }
        }

        return self::SUCCESS;
    }
}
