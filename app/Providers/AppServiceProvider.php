<?php

namespace App\Providers\Investment;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Log;

use Throwable;

// KPI recompute bits
use App\Jobs\RecomputeCycleMetric;
use App\Services\CycleMetricService;

// Models...
use App\Models\GtsMaterial;
use App\Models\GtsInvestment;
use App\Models\UsClient;
use App\Models\SqClient;
use App\Models\Local;
use App\Models\LocalItem;
use App\Models\CustomerSheetEntry;
use App\Models\CustomerLoanLedgerEntry;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        // A) View share: skip only the DB call in console, not the observers
        if (Schema::hasTable('customer_sheets') && !app()->runningInConsole()) {
            $names = DB::table('customer_sheets')->pluck('sheet_name')->all();
            View::share('sheetNames', $names);
        } else {
            View::share('sheetNames', []);
        }

        // Register item observer (keeps gts_materials.ui_total_material correct)
        if (class_exists(\App\Models\GtsMaterialItem::class)) {
            \App\Models\GtsMaterialItem::observe(\App\Observers\GtsMaterialsItemObserver::class);
        }

        // B) KPI auto-recompute observers (single shared handler)
        $recalc = function ($model) {
            $cid = $this->resolveCycleId($model);
            if (!$cid) return;

            // If the metrics table isn't there yet, skip gracefully
            if (!Schema::hasTable('cycle_metrics')) {
                Log::info('cycle_metrics table missing; skipping metrics recompute for cycle '.$cid);
                return;
            }

            $run = function () use ($cid) {
                try {
                    app(CycleMetricService::class)->recomputeAndPersist($cid); // sync write-through
                } catch (Throwable $e) {
                    Log::warning('Cycle metrics recompute skipped: '.$e->getMessage());
                    return;
                }

                // queued safety net / de-dupe
                dispatch(new RecomputeCycleMetric($cid));
            };

            if (DB::transactionLevel() > 0) {
                DB::afterCommit($run);
            } else {
                $run();
            }
        };

        foreach ([
            GtsMaterial::class,
            GtsInvestment::class,
            UsClient::class,
            SqClient::class,
            Local::class,
            LocalItem::class,
            CustomerSheetEntry::class,
            CustomerLoanLedgerEntry::class,
        ] as $cls) {
            $cls::saved($recalc);
            $cls::deleted($recalc);
        }

        // NOTE: removed the extra GtsMaterial::saved(...) block to avoid double recompute
    }

    private function resolveCycleId($model): ?int
    {
        if (isset($model->cycle_id) && $model->cycle_id) return (int) $model->cycle_id;

        if ($model instanceof \App\Models\LocalItem) {
            $localId = $model->local_id ?? null;
            if ($localId) return (int) (\App\Models\Local::where('id', $localId)->value('cycle_id') ?? 0) ?: null;
        }

        if ($model instanceof \App\Models\CustomerSheetEntry) {
            $sheetId = $model->customer_sheet_id ?? $model->sheet_id ?? null;
            if ($sheetId) return (int) (DB::table('customer_sheets')->where('id', $sheetId)->value('cycle_id') ?? 0) ?: null;
        }

        if ($model instanceof \App\Models\CustomerLoanLedgerEntry) {
            $sheetId = $model->customer_sheet_id ?? null;
            if ($sheetId) return (int) (DB::table('customer_sheets')->where('id', $sheetId)->value('cycle_id') ?? 0) ?: null;
        }

        return null;
    }
}

