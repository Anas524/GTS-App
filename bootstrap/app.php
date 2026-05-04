<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\AdminOnly;
use App\Http\Middleware\RedirectIfUnauthenticated;
use App\Http\Middleware\BindCycleFromRoute;
use App\Http\Middleware\BumpInvestmentActivity;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => \App\Http\Middleware\AdminOnly::class,
            'adminOrConsultant' => \App\Http\Middleware\AdminOrConsultant::class,
            'auth.redirect' => RedirectIfUnauthenticated::class,
            'bind.cycle' => BindCycleFromRoute::class,
            'bump.investment' => BumpInvestmentActivity::class,
            'auth' => \App\Http\Middleware\Authenticate::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
