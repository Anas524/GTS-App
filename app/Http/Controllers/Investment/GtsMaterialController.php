<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\GtsMaterial;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use App\Support\ActiveCycle;
use Illuminate\Support\Facades\DB;

class GtsMaterialController extends Controller
{
    // Show all material entries
    public function index(Request $request)
    {
        $c = ActiveCycle::id($request);
        $q = GtsMaterial::with('items')
            ->forCycle($c)                      // <- scope by active cycle
            ->orderBy('created_at', 'desc');

        return response()->json($q->get());
    }

    // Store a new draft entry
    public function store(Request $request)
    {
        $c = ActiveCycle::id($request);
        
        // money in (from UI)
        $uiTotal   = $this->dec7($request->input('ui_total_material', 0));
        $buyTotal  = $this->dec7($request->input('total_material_buy', $uiTotal));
        $noVat     = $this->dec7($request->input('total_material', 0));
        $vat       = $this->dec7($request->input('total_vat', ($request->input('total_material', 0) * 0.05)));
        $weight    = $this->dec7($request->input('total_weight', 0));
        
        // shipping
        $shipping  = $this->dec7($request->input('shipping_cost', 0));
        $dgd       = $this->dec7($request->input('dgd', 0));
        $labour    = $this->dec7($request->input('labour', 0));
        $totShip   = $this->dec7($request->input('total_shipping_cost', ($request->input('shipping_cost', 0) + $request->input('dgd', 0) + $request->input('labour', 0))));
        
        $material = GtsMaterial::create([
            'cycle_id'            => $c,
            'invoice_date'        => $request->invoice_date,
            'invoice_no'          => $request->invoice_no,
            'supplier_name'       => $request->supplier_name,
            'brief_description'   => $request->brief_description,

            'shipping_cost'       => $shipping,
            'dgd'                 => $dgd,
            'labour'              => $labour,
            'total_shipping_cost' => $totShip,

            // totals from UI
            'total_material'      => $noVat,
            'total_vat'           => $vat,
            'total_material_buy'  => $buyTotal,
            'ui_total_material'   => $uiTotal,
            'total_weight'        => $weight,

            'mode_of_transaction' => $request->mode_of_transaction,
            'receipt_no'          => $request->receipt_no,
            'remarks'             => $request->remarks,
            'status'              => true,
        ]);

        // items (unchanged)
        $items = $request->items ?? $request->materials ?? [];
        foreach ($items as $it) {
            $material->items()->create([
                'description'     => $it['description']     ?? '',
                'units'           => $it['units']           ?? 0,
                'unit_price'      => $it['unit_price']      ?? 0,
                'vat'             => $it['vat']             ?? 0,
                'weight_per_ctn'  => $it['weight_per_ctn']  ?? 0,
                'ctns'            => $it['ctns']            ?? 0,
            ]);
        }

        return response()->json([
            'id'                  => $material->id,
            'total_shipping_cost' => $material->total_shipping_cost,
            'ui_total_material'   => $material->ui_total_material,
            'total_material'      => $material->total_material,
            'total_material_buy'  => $material->total_material_buy,
        ]);
    }

    // Update an existing entry
    public function update(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::with('items')->forCycle($c)->findOrFail($id);
    
        // basic fields
        $shipping = $this->dec7($request->input('shipping_cost', 0));
        $dgd      = $this->dec7($request->input('dgd', 0));
        $labour   = $this->dec7($request->input('labour', 0));
        
        // if client passed total_shipping_cost use it, else sum parts
        $material->total_shipping_cost = $this->dec7($request->input(
            'total_shipping_cost',
            ((float)$shipping + (float)$dgd + (float)$labour)
        ));
    
        $material->invoice_date      = $request->input('invoice_date', $material->invoice_date);
        $material->invoice_no        = $request->input('invoice_no', $material->invoice_no);
        $material->supplier_name     = $request->input('supplier_name', $material->supplier_name);
        $material->brief_description = $request->input('brief_description', $material->brief_description);

        $material->mode_of_transaction = $request->mode_of_transaction;
        $material->receipt_no          = $request->receipt_no;
        $material->remarks             = $request->remarks;
        $material->shipping_cost       = $shipping;
        $material->dgd                 = $dgd;
        $material->labour              = $labour;
    
        // replace items if sent (unchanged)
        if ($request->has('materials') && is_array($request->materials)) {
            $material->items()->delete();
            foreach ($request->materials as $it) {
                $material->items()->create([
                    'description'     => $it['description']     ?? '',
                    'units'           => $it['units']           ?? 0,
                    'unit_price'      => $it['unit_price']      ?? 0,
                    'vat'             => $it['vat']             ?? 0,
                    'weight_per_ctn'  => $it['weight_per_ctn']  ?? 0,
                    'ctns'            => $it['ctns']            ?? 0,
                ]);
            }
        } elseif ($request->has('items') && is_array($request->items)) {
            $material->items()->delete();
            foreach ($request->items as $it) {
                $material->items()->create([
                    'description'     => $it['description']     ?? '',
                    'units'           => $it['units']           ?? 0,
                    'unit_price'      => $it['unit_price']      ?? 0,
                    'vat'             => $it['vat']             ?? 0,
                    'weight_per_ctn'  => $it['weight_per_ctn']  ?? 0,
                    'ctns'            => $it['ctns']            ?? 0,
                ]);
            }
        }
    
        // Prefer incoming UI totals if present
        $hasUi      = $request->filled('ui_total_material');
        $hasBuy     = $request->filled('total_material_buy');
        $hasNoVat   = $request->filled('total_material');
        $hasVat     = $request->filled('total_vat');
        $hasWeight  = $request->filled('total_weight');
    
        if ($hasUi || $hasBuy || $hasNoVat || $hasVat || $hasWeight) {
            if ($hasUi)     $material->ui_total_material  = $this->dec7($request->ui_total_material);
            if ($hasBuy)    $material->total_material_buy = $this->dec7($request->total_material_buy);
            if ($hasNoVat)  $material->total_material     = $this->dec7($request->total_material);
            if ($hasVat)    $material->total_vat          = $this->dec7($request->total_vat);
            if ($hasWeight) $material->total_weight       = $this->dec7($request->total_weight);
        } else {
            // Fallback: recompute from items (legacy callers)
            $material->load('items');
            $totalNoVat  = 0.0;
            $totalBuy    = 0.0;
            $totalWeight = 0.0;
    
            foreach ($material->items as $it) {
                $units    = (float) ($it->units ?? 0);
                $unit     = (float) ($it->unit_price ?? 0);
                $vatInput = (float) ($it->vat ?? 0);
                $wctn     = (float) ($it->weight_per_ctn ?? 0);
                $ctns     = (float) ($it->ctns ?? 0);
    
                $base   = $units * $unit;
                $rowBuy = ($vatInput > 1) ? ($base * $vatInput) : $base;
    
                $totalNoVat  += $base;
                $totalBuy    += $rowBuy;
                $totalWeight += ($wctn * $ctns);
            }
    
            $material->total_material     = $this->dec7($totalNoVat);
            $material->total_vat          = $this->dec7($totalNoVat * 0.05);
            $material->total_material_buy = $this->dec7($totalBuy);
            $material->ui_total_material  = $this->dec7($totalBuy);
            $material->total_weight       = $this->dec7($totalWeight);
        }
    
        $material->save();
    
        return response()->json([
            'ok'                  => true,
            'total_shipping_cost' => $material->total_shipping_cost,
            'total_material_buy'  => $material->total_material_buy,
            'ui_total_material'   => $material->ui_total_material,
            'total_material'      => $material->total_material,
            'total_vat'           => $material->total_vat,
        ]);
    }

    // Finalize the entry so it becomes read-only (cycle-guarded)
    public function finalize(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
        $material->is_finalized = true;
        $material->save();

        return response()->json(['message' => 'Material finalized successfully.']);
    }

    public function destroy(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
        $material->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }

    public function deleteItem(Request $request, $id)
    {
        // 1) Find item + parent first (so we still have the parent after delete)
        $item = \App\Models\Investment\GtsMaterialItem::findOrFail($id);
        $material = $item->material;   // relation defined on the item model

        // 2) Delete the item
        $item->delete();

        // 3) Recompute authoritative totals from remaining items
        $material->load('items');

        $totalNoVat  = 0.0;  // sum(units*unit_price)
        $totalBuy    = 0.0;  // “Total material buy” (header 6th col, UI uses this)
        $totalWeight = 0.0;

        foreach ($material->items as $it) {
            $units    = (float) ($it->units ?? 0);
            $unit     = (float) ($it->unit_price ?? 0);
            $vatInput = (float) ($it->vat ?? 0);
            $wctn     = (float) ($it->weight_per_ctn ?? 0);
            $ctns     = (float) ($it->ctns ?? 0);

            $base   = $units * $unit;                       // no VAT
            $rowBuy = ($vatInput > 1) ? ($base * $vatInput) // multiplier rule
                : $base;

            $totalNoVat  += $base;
            $totalBuy    += $rowBuy;
            $totalWeight += ($wctn * $ctns);
        }

        // 4) Persist recomputed totals (VAT is 5% of no-VAT total per your rule)
        $material->total_material     = $this->dec7($totalNoVat);
        $material->total_vat          = $this->dec7($totalNoVat * 0.05);
        $material->total_material_buy = $this->dec7($totalBuy);
        $material->ui_total_material  = $this->dec7($totalBuy);  // keep UI & summaries correct
        $material->total_weight       = $this->dec7($totalWeight);
        $material->save();

        // 5) Return fresh numbers so the front-end can repaint instantly
        return response()->json([
            'ok'                 => true,
            'material_id'        => $material->id,
            'ui_total_material'  => $material->ui_total_material,
            'total_material'     => $material->total_material,
            'total_vat'          => $material->total_vat,
            'total_material_buy' => $material->total_material_buy,
        ]);
    }

    public function uploadAttachments(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
    
        $request->validate([
            'invoice'   => 'nullable|array',
            'invoice.*' => 'file|mimes:jpg,jpeg,png,pdf|max:10240',
    
            'receipt'   => 'nullable|array',
            'receipt.*' => 'file|mimes:jpg,jpeg,png,pdf|max:10240',
    
            'note'      => 'nullable|array',
            'note.*'    => 'file|mimes:jpg,jpeg,png,pdf|max:10240',
        ]);
    
        try {
            // decode existing
            $invoicePaths = json_decode($material->invoice_path ?? '[]', true);
            $receiptPaths = json_decode($material->receipt_path ?? '[]', true);
            $notePaths    = json_decode($material->note_path ?? '[]', true);
    
            foreach ((array)$request->file('invoice') as $file) {
                if ($file && $file->isValid()) {
                    $invoicePaths[] = $file->store('attachments/material/invoice', 'public');
                }
            }
    
            foreach ((array)$request->file('receipt') as $file) {
                if ($file && $file->isValid()) {
                    $receiptPaths[] = $file->store('attachments/material/receipt', 'public');
                }
            }
    
            foreach ((array)$request->file('note') as $file) {
                if ($file && $file->isValid()) {
                    $notePaths[] = $file->store('attachments/material/note', 'public');
                }
            }
    
            $material->invoice_path = json_encode($invoicePaths);
            $material->receipt_path = json_encode($receiptPaths);
            $material->note_path    = json_encode($notePaths);
    
            $material->save();
    
            return response()->json([
                'success' => true,
                'message' => 'Attachments uploaded successfully.',
                'attachments' => $this->formatAttachments($material)
            ]);
    
        } catch (\Throwable $e) {
    
            Log::error('Upload failed', ['error' => $e->getMessage()]);
    
            return response()->json([
                'success' => false,
                'message' => 'Upload failed. Please try again.'
            ], 500);
        }
    }

    public function getAttachments(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $m = \App\Models\Investment\GtsMaterial::forCycle($c)->find($id);
    
        if (!$m) {
            return response()->json(['error' => 'Not found'], 404);
        }
    
        // helper to build files list (supports old + new format)
        $build = function ($kind, $raw) use ($id) {

            if (!$raw) return [];
        
            $paths = json_decode($raw, true);
            if (!is_array($paths)) {
                $paths = [$raw];
            }
        
            $files = [];
        
            foreach ($paths as $p) {
        
                // DO NOT BLOCK if file not found
                // because your path is mismatched on live
        
                $files[] = [
                    'url'  => route('investment.material.file.show', [
                        'id' => $id,
                        'kind' => $kind
                    ]) . '?path=' . urlencode($p), // pass real path
                    'name' => basename($p),
                    'path' => $p,
                ];
            }
        
            return $files;
        };
    
        return response()->json([
            'invoice' => $build('invoice', $m->invoice_path),
            'receipt' => $build('receipt', $m->receipt_path),
            'note'    => $build('note', $m->note_path),
        ]);
    }

    public function downloadAttachments(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
    
        $files = [
            'invoice' => $material->invoice_path,
            'receipt' => $material->receipt_path,
            'note'    => $material->note_path,
        ];
    
        $files = array_filter($files, fn($p) => $p && Storage::disk('public')->exists($p));
        if (empty($files)) abort(404, 'No attachments to download.');
    
        $zipName = "material_attachments_{$id}.zip";
        $tmpDir  = storage_path('app/tmp');
        if (!is_dir($tmpDir)) @mkdir($tmpDir, 0755, true);
    
        $zipPath = $tmpDir . DIRECTORY_SEPARATOR . $zipName;
    
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create zip.');
        }
    
        foreach ($files as $kind => $path) {
            $full = Storage::disk('public')->path($path);
            $zip->addFile($full, $kind . '-' . basename($path));
        }
    
        $zip->close();
    
        return response()->download($zipPath, $zipName, [
            'Content-Type' => 'application/zip',
        ])->deleteFileAfterSend(true);
    }
        
    public function showFile(Request $request, $id, string $kind)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
    
        // map field
        $field = match ($kind) {
            'invoice' => 'invoice_path',
            'receipt' => 'receipt_path',
            'note'    => 'note_path',
            default   => null,
        };
    
        if (!$field) abort(404);
    
        // PRIORITY 1: path from query (multi-file support)
        $path = $request->query('path');
    
        // FALLBACK: DB value (old + new format)
        if (!$path) {
            $raw = $material->{$field};
    
            if (!$raw) abort(404);
    
            $decoded = json_decode($raw, true);
    
            if (is_array($decoded)) {
                $path = $decoded[0] ?? null; // first file fallback
            } else {
                $path = $raw; // old single file
            }
        }
    
        if (!$path) abort(404);
    
        // SECURITY (keep this)
        if (!str_starts_with($path, 'attachments/material/')) {
            abort(403);
        }
    
        // FIXED PATHS (ONLY VALID ONES)
        $pathsToTry = [
            base_path('storage/app/public/' . $path),                // ✅ YOUR REAL LIVE PATH
            base_path('public_html/storage/app/public/' . $path),    // fallback (if nested)
            public_path('storage/' . $path),                         // if symlink exists
        ];
    
        $fullPath = null;
    
        foreach ($pathsToTry as $p) {
            if (file_exists($p)) {
                $fullPath = $p;
                break;
            }
        }
    
        // STILL NOT FOUND → LOG EXACTLY
        if (!$fullPath) {
            \Log::error('FILE NOT FOUND', [
                'requested_path' => $path,
                'tried_paths' => $pathsToTry
            ]);
            abort(404);
        }
    
        // DOWNLOAD MODE
        if ($request->boolean('download')) {
            return response()->download($fullPath, basename($path));
        }
    
        // VIEW MODE
        return response()->file($fullPath);
    }
    
    public function totals(Request $request)
    {
        $materialsTable = 'gts_materials';
        $investTable    = 'gts_investments';

        if (!Schema::hasTable($materialsTable)) {
            return response()->json([
                'material' => 0,
                'shipping' => 0,
                'investment' => 0,
                '_debug' => ['err' => "no table $materialsTable"]
            ]);
        }

        // ---- filter by cycle only ----
        // ---- SAFE cycle id resolution (no redirects) ----
        $cid = (int) $request->query('cycle_id', 0);
        if (!$cid && class_exists(\App\Support\ActiveCycle::class)) {
            // make sure this method is PURE (no redirects/HTTP). If unsure, skip it.
            try {
                $cid = (int) \App\Support\ActiveCycle::id($request);
            } catch (\Throwable $e) {
                $cid = 0; // fallback
            }
        }
        $cols = Schema::getColumnListing($materialsTable);

        $base = DB::table($materialsTable . ' as m')->where('m.cycle_id', $cid);

        // soft/flags
        if (in_array('deleted_at', $cols)) $base->whereNull('m.deleted_at');
        foreach (['deleted', 'is_deleted', 'archived'] as $f) {
            if (in_array($f, $cols)) $base->where("m.$f", 0);
        }

        // posted-only?
        if ($request->boolean('only_posted')) {
            if (in_array('posted', $cols))            $base->where('m.posted', 1);
            elseif (in_array('is_posted', $cols))     $base->where('m.is_posted', 1);
            elseif (in_array('status', $cols))        $base->whereIn('m.status', ['posted', 'approved', 'completed', 1, true]);
        }

        // ---- MATERIAL: prefer ui_total_material; fallback to total_material ----
        $materialCol = null;
        if (in_array('ui_total_material', $cols)) {
            $materialCol = 'm.ui_total_material';
        } elseif (in_array('total_material', $cols)) {
            $materialCol = 'm.total_material';
        }
        
        $material = 0.0;
        if ($materialCol) {
            $material = (float) (clone $base)
                ->selectRaw("ROUND(SUM(COALESCE($materialCol,0)),2) as s")
                ->value('s');
        
            // If ui_total_material happens to be zero for legacy rows, fall back once to total_material
            if ($material === 0.0 && $materialCol !== 'm.total_material' && in_array('total_material', $cols)) {
                $material = (float) (clone $base)
                    ->selectRaw("ROUND(SUM(COALESCE(m.total_material,0)),2) as s")
                    ->value('s');
            }
        }

        // ---- SHIPPING: prefer total_shipping_cost; else sum of parts (or g_cost) ----
        if (in_array('total_shipping_cost', $cols)) {
            $shipExpr = 'COALESCE(m.total_shipping_cost,0)';
        } else {
            $parts = [];
            foreach (['shipping_cost', 'dgd', 'labour', 'labor_cost', 'g_cost'] as $c) {
                if (in_array($c, $cols)) $parts[] = "COALESCE(m.$c,0)";
            }
            $shipExpr = $parts ? implode(' + ', $parts) : '0';
        }

        $shipping = (float) (clone $base)->selectRaw("ROUND(SUM($shipExpr),2) as s")->value('s');

        // ---- INVESTMENT: unchanged; pick first existing amount column ----
        $investment = 0.0;
        if (Schema::hasTable($investTable)) {
            $icols = Schema::getColumnListing($investTable);
            $iq = DB::table($investTable . ' as i')->where('i.cycle_id', $cid);
            if (in_array('deleted_at', $icols)) $iq->whereNull('i.deleted_at');
            foreach (['deleted', 'is_deleted', 'archived'] as $f) {
                if (in_array($f, $icols)) $iq->where("i.$f", 0);
            }
            $invCol = collect(['investment_amount', 'total_investment', 'investment'])
                ->first(fn($c) => in_array($c, $icols));
            if ($invCol) {
                $investment = (float) (clone $iq)->selectRaw("ROUND(SUM(COALESCE(i.$invCol,0)),2) as s")->value('s');
            }
        }

        return response()->json([
            'material'   => round($material, 2),
            'shipping'   => round($shipping, 2),
            'investment' => round($investment, 2),
            '_debug' => [
                'materialCol' => $materialCol,
                'shipExpr'    => $shipExpr,
                'cycle'       => $cid,
            ],
        ]);
    }
    
    protected function dec7($v): ?string
    {
        if ($v === null) return null;
        $s = trim((string)$v);
        // Keep optional sign, digits, optional dot + up to 7 decimals
        if (!preg_match('/^-?\d+(?:\.\d+)?$/', $s)) {
            // if it has commas or spaces etc, strip non-numeric except dot/sign
            $s = preg_replace('/[^0-9.\-]/', '', $s);
        }
        if ($s === '' || $s === '-' || $s === '.')
            return '0';

        // limit to 7 fractional digits without floating math
        if (strpos($s, '.') !== false) {
            [$int, $frac] = explode('.', $s, 2);
            $s = $int . '.' . substr($frac, 0, 7);
        }
        return $s;
    }
    
    public function deleteAttachment(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
    
        $type = $request->input('type');   // invoice / receipt / note
        $index = (int) $request->input('index');
    
        $field = match ($type) {
            'invoice' => 'invoice_path',
            'receipt' => 'receipt_path',
            'note'    => 'note_path',
            default   => null,
        };
    
        if (!$field) {
            return response()->json(['error' => 'Invalid type'], 400);
        }
    
        $paths = json_decode($material->{$field} ?? '[]', true);
    
        if (!isset($paths[$index])) {
            return response()->json(['error' => 'File not found'], 404);
        }
    
        // delete physical file
        $filePath = $paths[$index];
        if (Storage::disk('public')->exists($filePath)) {
            Storage::disk('public')->delete($filePath);
        }
    
        // remove ONLY that file
        unset($paths[$index]);
        $paths = array_values($paths); // reindex
    
        $material->{$field} = json_encode($paths);
        $material->save();
    
        return response()->json([
            'success' => true,
            'attachments' => $this->getAttachments($request, $id)->getData()
        ]);
    }
    
    public function downloadZip(Request $request, $id)
    {
        $c = ActiveCycle::id($request);
        $material = GtsMaterial::forCycle($c)->findOrFail($id);
    
        $files = [
            'invoice' => $material->invoice_path,
            'receipt' => $material->receipt_path,
            'note'    => $material->note_path,
        ];
    
        $files = array_filter($files, fn($p) => $p && Storage::disk('public')->exists($p));
        if (empty($files)) abort(404, 'No attachments to download.');
    
        $zipName = "material_attachments_{$id}.zip";
        $tmpDir = storage_path('app/tmp');
        if (!is_dir($tmpDir)) @mkdir($tmpDir, 0755, true);
    
        $zipPath = $tmpDir . DIRECTORY_SEPARATOR . $zipName;
    
        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Could not create zip.');
        }
    
        foreach ($files as $kind => $path) {
            $full = Storage::disk('public')->path($path);
            $zip->addFile($full, $kind . '-' . basename($path));
        }
    
        $zip->close();
    
        return response()->download($zipPath, $zipName)->deleteFileAfterSend(true);
    }
    
    private function buildFiles($id, $kind, $paths)
    {
        $paths = is_array($paths) ? $paths : json_decode($paths ?? '[]', true);
    
        return collect($paths)->map(function ($p) use ($id, $kind) {
            return [
                'url' => route('investment.material.file.show', ['id'=>$id, 'kind'=>$kind, 'path'=>$p]),
                'name' => basename($p),
            ];
        })->values();
    }
}
