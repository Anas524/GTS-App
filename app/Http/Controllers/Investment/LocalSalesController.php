<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\Local;
use App\Models\Investment\LocalItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Dompdf\Dompdf;
use Dompdf\Options;
use App\Models\Investment\LocalAttachment;
use Illuminate\Support\Facades\URL;
use App\Support\ActiveCycle;
use App\Models\Cycle;

class LocalSalesController extends Controller
{
    // GET /local-sales  -> used by loadLocalSales()
    public function index(Request $request)
    {
        $c = ActiveCycle::id($request);
        
        $rows = Local::select([
            'id',
            'date',
            'client',
            'description',
            'payment_status',
            'remarks',
            'total_units',
            'total_ex_vat',
            'vat_amount',
            'total_inc_vat',
        ])
            ->where('cycle_id', $c)
            ->orderBy('id', 'asc')      // oldest first
            ->get()
            ->map(function ($r) {
                return [
                    'id'             => $r->id,
                    'date'           => optional($r->date)->toDateString(), // casted to Carbon in model
                    'client'         => $r->client,
                    'description'    => $r->description,
                    'payment_status' => $r->payment_status,
                    'remarks'        => $r->remarks,
                    'total_units'    => (int) $r->total_units,
                    'total_ex_vat'   => (float) $r->total_ex_vat,
                    'vat_amount'     => (float) $r->vat_amount,
                    'total_inc_vat'  => (float) $r->total_inc_vat,
                ];
            })
            ->values(); // nice clean 0..N keys

        return response()->json(['data' => $rows]);
    }

    // POST /local-sales  -> save draft with items
    public function store(Request $req)
    {
        $data = $req->validate([
            'date'           => ['required', 'date'],
            'client'         => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'payment_status' => ['nullable', 'in:paid,pending,partial'],
            'remarks'        => ['nullable', 'string'],

            'total_units'    => ['nullable', 'integer', 'min:0'],
            'total_ex_vat'   => ['nullable', 'numeric', 'min:0'],
            'vat_amount'     => ['nullable', 'numeric', 'min:0'],
            'total_inc_vat'  => ['nullable', 'numeric', 'min:0'],

            'items'          => ['nullable'], // array or JSON string
        ]);

        $items = $this->normalizeItems($req->input('items'));

        if (!empty($items)) {
            $agg = $this->computeAggregates($items);
            $data = array_merge($data, $agg);

            if (empty($data['payment_status'])) {
                $statuses = collect($items)->pluck('status')->map(fn($s) => strtolower($s))->all();
                $data['payment_status'] = in_array('pending', $statuses, true) ? 'pending'
                    : (in_array('partial', $statuses, true) ? 'partial' : 'paid');
            }
        }

        return DB::transaction(function () use ($data, $items, $req) {
            $data['cycle_id'] = ActiveCycle::id($req);
            
            /** @var \App\Models\Local $local */
            $local = Local::create($data);

            foreach ($items as $it) {
                $units     = (int) ($it['units'] ?? 0);
                $unitPrice = (float) ($it['unit_price'] ?? 0);
                $ex        = round($units * $unitPrice, 2);
                $vat       = round((float) ($it['vat'] ?? 0), 2);
                $inc       = round($ex + $vat, 2);

                $local->items()->create([
                    'description'   => $it['description'] ?? '',
                    'units'         => $units,
                    'unit_price'    => $unitPrice,
                    'total_ex_vat'  => $ex,
                    'vat'           => $vat,
                    'total_inc_vat' => $inc,
                    'status'        => $it['status'] ?? 'pending',
                    'remarks'       => $it['remarks'] ?? null,
                ]);
            }

            return response()->json(['success' => true, 'id' => $local->id]);
        });
    }

    public function update(Request $req, Local $local)
    {
        $c = ActiveCycle::id($req);
        abort_if((int)$local->cycle_id !== (int)$c, 404);
        
        $data = $req->validate([
            'date'           => ['sometimes', 'date'],
            'client'         => ['sometimes', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'payment_status' => ['nullable', 'in:paid,pending,partial'],
            'remarks'        => ['nullable', 'string'],

            // were: integer/numeric mix — make all numeric
            'total_units'    => ['nullable', 'numeric', 'min:0'],
            'total_ex_vat'   => ['nullable', 'numeric', 'min:0'],
            'vat_amount'     => ['nullable', 'numeric', 'min:0'],
            'total_inc_vat'  => ['nullable', 'numeric', 'min:0'],

            'items'          => ['nullable'],          // string or array OK
            'replace_items'  => ['nullable', 'boolean'],
        ]);

        $items = $this->normalizeItems($req->input('items'));
        $replace = $req->boolean('replace_items');

        return DB::transaction(function () use ($data, $items, $replace, $local) {
            if ($replace && !empty($items)) {
                $local->items()->delete();

                foreach ($items as $it) {
                    $units     = (int) ($it['units'] ?? 0);
                    $unitPrice = (float) ($it['unit_price'] ?? 0);
                    $ex        = round($units * $unitPrice, 2);
                    $vat       = round((float) ($it['vat'] ?? 0), 2);
                    $inc       = round($ex + $vat, 2);

                    $local->items()->create([
                        'description'   => $it['description'] ?? '',
                        'units'         => $units,
                        'unit_price'    => $unitPrice,
                        'total_ex_vat'  => $ex,
                        'vat'           => $vat,
                        'total_inc_vat' => $inc,
                        'status'        => $it['status'] ?? 'pending',
                        'remarks'       => $it['remarks'] ?? null,
                    ]);
                }

                if (!isset($data['total_ex_vat']) && !isset($data['total_inc_vat'])) {
                    $agg = $this->computeAggregates($items);
                    $data = array_merge($data, $agg);
                }
            }

            $local->update($data);

            return response()->json(['success' => true]);
        });
    }

    // DELETE /local-sales/{local}
    public function destroy(Request $req, Local $local)
    {
        $c = ActiveCycle::id($req);
        abort_if((int)$local->cycle_id !== (int)$c, 404);
        
        $local->delete();
        return response()->json(['success' => true]);
    }

    // (optional)
    public function items(Request $req, Local $local)
    {
        $c = ActiveCycle::id($req);
        abort_if((int)$local->cycle_id !== (int)$c, 404); 
        
        if (method_exists($local, 'items')) {
            $rows = $local->items()
                ->orderBy('id')
                ->get()
                ->map(function ($it) {
                    $ex  = is_null($it->total_ex_vat) ? ($it->units * $it->unit_price) : $it->total_ex_vat;
                    $vat = is_null($it->vat) ? 0 : $it->vat;
                    $inc = is_null($it->total_inc_vat) ? ($ex + $vat) : $it->total_inc_vat;

                    return [
                        'description'   => $it->description ?? '',
                        'units'         => (float) $it->units,
                        'unit_price'    => (float) $it->unit_price,
                        'total_ex_vat'  => (float) $ex,
                        'vat'           => (float) $vat,
                        'total_inc_vat' => (float) $inc,
                        'status'        => $it->status ?? 'pending',
                        'remarks'       => $it->remarks ?? '',
                    ];
                })->values();

            return response()->json(['data' => $rows], 200);
        }

        // Fallback to JSON on locals.items_json
        $items = collect(json_decode($local->items_json ?? '[]', true))
            ->map(function ($it) {
                $units = (float) ($it['units'] ?? 0);
                $price = (float) ($it['unit_price'] ?? 0);
                $ex    = isset($it['total_ex_vat']) ? (float) $it['total_ex_vat'] : ($units * $price);
                $vat   = (float) ($it['vat'] ?? 0);
                $inc   = isset($it['total_inc_vat']) ? (float) $it['total_inc_vat'] : ($ex + $vat);

                return [
                    'description'   => $it['description'] ?? '',
                    'units'         => $units,
                    'unit_price'    => $price,
                    'total_ex_vat'  => $ex,
                    'vat'           => $vat,
                    'total_inc_vat' => $inc,
                    'status'        => $it['status'] ?? 'pending',
                    'remarks'       => $it['remarks'] ?? '',
                ];
            })->values();

        return response()->json(['data' => $items], 200);
    }

    // ---------- helpers ----------
    private function normalizeItems($raw): array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($raw)) return [];

        return collect($raw)->map(function ($it) {
            return [
                'description' => (string) ($it['description'] ?? ''),
                'units'       => (int) ($it['units'] ?? 0),
                'unit_price'  => (float) ($it['unit_price'] ?? 0),
                'vat'         => (float) ($it['vat'] ?? 0), // user-provided
                'status'      => in_array(($it['status'] ?? 'pending'), ['paid', 'pending', 'partial'], true)
                    ? $it['status'] : 'pending',
                'remarks'     => $it['remarks'] ?? null,
            ];
        })->all();
    }

    private function computeAggregates(array $items): array
    {
        $totalUnits = 0;
        $ex = 0.0;
        $vat = 0.0;
        $inc = 0.0;

        foreach ($items as $it) {
            $u   = (int) ($it['units'] ?? 0);
            $up  = (float) ($it['unit_price'] ?? 0);
            $ex1 = round($u * $up, 2);
            $v1  = round((float) ($it['vat'] ?? 0), 2);

            $totalUnits += $u;
            $ex  += $ex1;
            $vat += $v1;
            $inc += $ex1 + $v1;
        }

        return [
            'total_units'   => $totalUnits,
            'total_ex_vat'  => round($ex, 2),
            'vat_amount'    => round($vat, 2),
            'total_inc_vat' => round($inc, 2),
        ];
    }

    public function uploadAttachments(Request $request, Local $local)
    {
        $c = ActiveCycle::id($request);
        abort_if((int)$local->cycle_id !== (int)$c, 404);
        
        // create or fetch the attachment row
        $att = LocalAttachment::firstOrNew(['local_id' => $local->id]);

        // helper to process one file field
        $save = function (string $field, string $subdir) use ($request, $att, $local) {
            if (!$request->hasFile($field)) return;

            $col = match ($field) {
                'invoice' => 'invoice_path',
                'receipt' => 'receipt_path',
                'note'    => 'delivery_note_path',
            };

            // delete old if present
            if ($att->$col && Storage::disk('public')->exists($att->$col)) {
                Storage::disk('public')->delete($att->$col);
            }

            // store new: storage/app/public/attachments/local/{local_id}/{type}/...
            $path = $request->file($field)->store("attachments/local/{$local->id}/{$subdir}", 'public');
            $att->$col = $path;
        };

        $save('invoice', 'invoice');
        $save('receipt', 'receipt');
        $save('note',    'note');

        $att->save();

        return response()->json(['success' => true]);
    }

    public function getAttachments(Request $request, Local $local)
    {
        try {
            $c = ActiveCycle::id($request);
            abort_if((int)$local->cycle_id !== (int)$c, 404);

            $model = Local::findOrFail($local);
    
            // Avoid relying on a possibly-missing relation; fetch directly
            $att = LocalAttachment::where('local_id', $model->id)->first();
    
            $mk = function (string $kind, ?string $path) use ($model) {
                if (!$path || !Storage::disk('public')->exists($path)) return null;
    
                // IMPORTANT: route name must match the one you defined above
                $signed = URL::temporarySignedRoute(
                    'investment.local.file.show',
                    now()->addMinutes(10),
                    ['local' => $model->id, 'kind' => $kind]
                );
    
                return [
                    'url'  => $signed,
                    'name' => basename($path),
                ];
            };
    
            return response()->json([
                'invoice' => $mk('invoice', $att?->invoice_path),
                'receipt' => $mk('receipt', $att?->receipt_path),
                'note'    => $mk('note',    $att?->delivery_note_path),
            ]);
        } catch (\Throwable $e) {
            Log::error('LocalSales getAttachments failed', ['err' => $e->getMessage()]);
            return response()->json(['error' => 'Failed to fetch attachments'], 500);
        }
    }

    public function downloadAttachments(Request $request, Local $local)
    {
        $c = ActiveCycle::id($request);
        abort_if((int)$local->cycle_id !== (int)$c, 404);

        $att   = $local->attachments;
    
        if (!$att || (!$att->invoice_path && !$att->receipt_path && !$att->delivery_note_path)) {
            abort(404, 'No attachments to export.');
        }
    
        $html = '
            <meta charset="utf-8"/>
            <style>
                body { font-family: DejaVu Sans, sans-serif; color:#222 }
                h2 { text-align:center; margin:0 0 12px }
                h3 { margin:12px 0 6px }
                .attachment-block { page-break-inside: avoid; margin-bottom: 30px; }
                .attachment-block img {
                    max-width:100%; max-height:800px; display:block; margin:0 auto; object-fit:contain;
                }
            </style>
            <h2>Local Sales Attachments</h2>
        ';
    
        $embed = function (?string $path, string $title) {
            if (!$path || !Storage::disk('public')->exists($path)) return '';
            $full = Storage::disk('public')->path($path);
            $ext  = pathinfo($full, PATHINFO_EXTENSION) ?: 'png';
            $data = @file_get_contents($full);
            if ($data === false) return '';
            $base64 = 'data:image/'.$ext.';base64,'.base64_encode($data);
            return "
                <div class='attachment-block'>
                    <h3>{$title}</h3>
                    <img src='{$base64}' alt='{$title} Attachment'>
                </div>
            ";
        };
    
        $html .= $embed($att->invoice_path,        'Invoice');
        $html .= $embed($att->receipt_path,        'Bank Transfer Receipt');
        $html .= $embed($att->delivery_note_path,  'Delivery Note');
    
        // Dompdf options to avoid "Cannot resolve public path"
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->setChroot(storage_path('app/public'));
    
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
    
        return response($dompdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="local_attachments_'.$local->id.'.pdf"');
    }
    
    public function showFile($local, string $kind)
    {
        $model = Local::findOrFail($local);
        $att   = LocalAttachment::where('local_id', $model->id)->first();
    
        $col = match ($kind) {
            'invoice' => 'invoice_path',
            'receipt' => 'receipt_path',
            'note'    => 'delivery_note_path',
            default   => null,
        };
        if (!$att || !$col || !$att->{$col}) abort(404);
    
        $path = $att->{$col};
        if (!Storage::disk('public')->exists($path)) abort(404);
    
        return Storage::disk('public')->response($path); // images & PDFs open inline
    }
}
