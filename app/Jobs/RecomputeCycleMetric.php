<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\Middleware\WithoutOverlapping; // <-- import this!
use App\Services\CycleMetricService;
use App\Models\CycleMetric;

class RecomputeCycleMetric implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var int */
    public int $cycleId; // <-- explicit property fixes IDE underline

    public function __construct(int $cycleId)
    {
        $this->cycleId = $cycleId; // <-- assign
    }

    /** prevent overlapping recomputes for the SAME cycle */
    public function middleware(): array
    {
        return [
            // The key must be identical for duplicates; using class+id is perfect.
            (new WithoutOverlapping("recompute-cycle-{$this->cycleId}"))->dontRelease(),
        ];
    }

    public function handle(CycleMetricService $svc): void
    {
        $data = $svc->computeFor($this->cycleId);
        CycleMetric::updateOrCreate(
            ['cycle_id' => $this->cycleId],
            $data + ['computed_at' => now()]
        );
    }
}
