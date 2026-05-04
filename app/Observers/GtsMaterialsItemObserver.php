<?php

namespace App\Observers;

use Illuminate\Support\Facades\DB;
use App\Models\GtsMaterialItem;

class GtsMaterialsItemObserver
{
    /** Fire after create OR update */
    public function saved(GtsMaterialItem $item): void
    {
        $this->recompute((int) $item->material_id);
    }

    /** Fire after soft-delete or delete */
    public function deleted(GtsMaterialItem $item): void
    {
        $this->recompute((int) $item->material_id);
    }

    /** Optional: if you use restore() with SoftDeletes */
    public function restored(GtsMaterialItem $item): void
    {
        $this->recompute((int) $item->material_id);
    }

    /** Optional: force delete */
    public function forceDeleted(GtsMaterialItem $item): void
    {
        $this->recompute((int) $item->material_id);
    }

    /** --- Helper --- */
    private function recompute(int $materialId): void
    {
        if (!$materialId) return;

        $total = (float) DB::table('gts_materials_items')
            ->where('material_id', $materialId)
            ->selectRaw('ROUND(SUM(COALESCE(units,0)*COALESCE(unit_price,0) + COALESCE(vat,0)), 2) as t')
            ->value('t');

        DB::table('gts_materials')
            ->where('id', $materialId)
            ->update(['ui_total_material' => $total ?: 0]);
    }
}
