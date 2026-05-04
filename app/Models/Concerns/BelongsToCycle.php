<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

trait BelongsToCycle
{
    public function scopeForCycle(Builder $query, int $cycleId): Builder
    {
        return $query->where('cycle_id', $cycleId);
    }
}
