<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BindCycleFromRoute
{
    public function handle(Request $request, Closure $next)
    {
        $id = null;

        // 1) Route params (your existing logic)
        $route = $request->route();
        if ($route) {
            foreach ($route->parameters() as $key => $value) {
                if (is_object($value) && isset($value->id)) {
                    $id = (int) $value->id;
                    break;
                }
                if (in_array($key, ['cycle', 'cycle_id', 'cycleId'], true)) {
                    $id = (int) $value;
                    break;
                }
            }
        }

        // 2) FALLBACK: query string ?cycle_id=...
        if (!$id) {
            $q = (int) $request->query('cycle_id');
            if ($q > 0) $id = $q;
        }

        if ($id && $id > 0) {
            $request->session()->put('active_cycle_id', $id);
        }

        return $next($request);
    }
}
