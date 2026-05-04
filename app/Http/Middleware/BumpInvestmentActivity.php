<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Support\ToolActivity;

class BumpInvestmentActivity
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        try {
            // Only bump for write methods, and only on 2xx or 3xx responses
            $isWrite = in_array($request->getMethod(), ['POST','PUT','PATCH','DELETE']);
            $ok = method_exists($response, 'isSuccessful') && $response->isSuccessful();
            $redirect = method_exists($response, 'isRedirection') && $response->isRedirection();

            if ($isWrite && ($ok || $redirect) && $request->user()) {
                ToolActivity::bump('investment', $request->user()->id);
            }
        } catch (\Throwable $e) {
            \Log::warning('BumpInvestmentActivity failed', ['error' => $e->getMessage()]);
        }

        return $response;
    }
}
