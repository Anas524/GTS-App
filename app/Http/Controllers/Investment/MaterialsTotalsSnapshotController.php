<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\Cycle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class MaterialsTotalsSnapshotController extends Controller
{
    public function store(Request $request, Cycle $cycle)
    {
        $data = $request->validate([
            'material'   => ['required','numeric'],
            'shipping'   => ['required','numeric'],
            'investment' => ['required','numeric'],
            'ts'         => ['nullable','integer'],
        ]);

        // Keep for e.g. 1 day (tune as you like)
        Cache::put($this->key($cycle->id), [
            'material'   => round((float)$data['material'], 2),
            'shipping'   => round((float)$data['shipping'], 2),
            'investment' => round((float)$data['investment'], 2),
            'ts'         => $data['ts'] ?? now()->getTimestampMs(),
        ], now()->addDay());

        return response()->json(['ok' => true]);
    }

    public static function key(int $cycleId): string
    {
        return "materials_totals_snapshot:{$cycleId}";
    }
}