<?php

namespace App\Support;

use Illuminate\Http\Request;

class ActiveCycle
{
    /**
     * Resolve the active cycle ID from (in order):
     *  - route param {cycle} (int or bound Cycle model)
     *  - ?cycle_id= query
     *  - session('active_cycle_id')
     *  - config('investment.default_cycle_id', 5)
     */
    public static function id(Request $request): int
    {
        // 1) Route param: /c/{cycle}/...
        $routeVal = $request->route('cycle') ?? $request->route('cycle_id');
        if ($routeVal !== null) {
            $id = is_object($routeVal) && method_exists($routeVal, 'getKey')
                ? (int) $routeVal->getKey()     // Cycle model binding
                : (int) $routeVal;              // plain integer
            if ($id > 0) {
                $request->session()->put('active_cycle_id', $id);
                return $id;
            }
        }

        // 2) Explicit query ?cycle_id=...
        if ($request->has('cycle_id')) {
            $id = (int) $request->query('cycle_id');
            if ($id > 0) {
                $request->session()->put('active_cycle_id', $id);
                return $id;
            }
            // ignore invalid (<=0) values; fall through
        }

        // 3) Session
        $sid = (int) $request->session()->get('active_cycle_id', 0);
        if ($sid > 0) {
            return $sid;
        }

        // 4) Config fallback (keeps your “5” default but configurable)
        return (int) config('investment.default_cycle_id', 5);
    }

    /** Manually set the active cycle id (e.g., after create). */
    public static function set(Request $request, int $id): void
    {
        if ($id > 0) {
            $request->session()->put('active_cycle_id', $id);
        }
    }
}
