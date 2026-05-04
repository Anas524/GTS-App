<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\CustomerLoanLedgerEntry;
use App\Models\Investment\CustomerSheet;
use App\Models\Investment\CustomerSheetEntry;
use App\Models\Investment\CustomerSheetItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Support\ActiveCycle;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;

class CustomerSheetController extends Controller
{
    private function forgetSheetTotals(int $sheetId): void
    {
        Cache::forget("sheet:totals:{$sheetId}");
    }

    public function index(Request $request)
    {
        $cid = ActiveCycle::id($request);

        $customerSheets = CustomerSheet::query()
            ->where('cycle_id', $cid)
            ->orderBy('sheet_name')
            ->get();

        return view('index', [
            'customerSheets' => $customerSheets,
            'activeSheet'    => session('activeSheet') ?? 'summary',
        ]);
    }

    public function create(Request $request)
    {
        $cid = ActiveCycle::id($request);
        
        // Normalize first so validation matches what we store
        $name = strtoupper(trim((string) $request->input('sheet_name', '')));
    
        $request->merge(['sheet_name' => $name]);

        $request->validate([
            'sheet_name' => [
                'required',
                'string',
                'max:60',
                Rule::unique('customer_sheets', 'sheet_name')
                    ->where(fn($q) => $q->where('cycle_id', $cid)),
            ],
        ]);

        try {
            $sheet = CustomerSheet::create([
                'cycle_id'   => $cid,
                'sheet_name' => $name,
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Catch duplicate key from DB layer (safety net)
            if (str_contains($e->getMessage(), 'customer_sheets_cycle_name_unique')) {
                return response()->json([
                    'success' => false,
                    'message' => 'A sheet with this name already exists in this set.',
                ], 422);
            }
            throw $e;
        }

        return response()->json([
            'success' => true,
            'data'    => ['id' => $sheet->id, 'sheet_name' => $sheet->sheet_name],
        ], 201);
    }

    public function storeSheetName(Request $request)
    {
        $cid = ActiveCycle::id($request);

        $data = $request->validate([
            'sheet_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('customer_sheets', 'sheet_name')
                    ->where(fn($q) => $q->where('cycle_id', $cid)),
            ],
        ]);

        $sheet = CustomerSheet::create([
            'cycle_id'   => $cid,
            'sheet_name' => strtoupper(trim($data['sheet_name'])),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer sheet created successfully',
            'data'    => ['id' => $sheet->id, 'sheet_name' => $sheet->sheet_name],
        ], 201);
    }

    public function addEntry(Request $request)
    {
        $cid = ActiveCycle::id($request);

        $request->validate([
            'sheet_id'                 => 'required|exists:customer_sheets,id',
            'date'                     => 'required|date',
            'supplier_name'            => 'required|string|max:255',
            'description'              => 'nullable|string',
            'total_material'           => 'nullable|numeric',
            'total_material_buy'       => 'nullable|numeric',
            'total_shipping'           => 'nullable|numeric',
            'total_shipping_cost'      => 'nullable|numeric',
            'shipping_cost'            => 'nullable|numeric',
            'dgd'                      => 'nullable|numeric',
            'labour'                   => 'nullable|numeric',
        ]);

        // ensure the target sheet is in this cycle
        abort_unless(
            CustomerSheet::where('id', $request->sheet_id)->where('cycle_id', $cid)->exists(),
            403
        );

        // normalize aliases
        $tmBuy = $request->input('total_material_buy',
                $request->input('total_material', 0));

        $tsCost = $request->input('total_shipping_cost',
                $request->input('total_shipping',
                    ($request->input('shipping_cost', 0)
                    + $request->input('dgd', 0)
                    + $request->input('labour', 0))
                ));

        CustomerSheetEntry::create([
            'cycle_id'            => $cid,
            'customer_sheet_id'   => $request->sheet_id,
            'date'                => $request->date,
            'supplier'            => $request->supplier_name,
            'description'         => $request->description,
            'total_material_buy'  => $tmBuy ?? 0,
            'total_shipping_cost' => $tsCost ?? 0,
        ]);
        
        $this->forgetSheetTotals((int) $request->sheet_id); 
        return response()->json(['success' => true]);
    }

    public function store(Request $request)
    {
        $cid = ActiveCycle::id($request);
        
        $request->validate([
            'sheet_id' => 'required|exists:customer_sheets,id',
            'date' => 'required|date',
            'supplier' => 'required|string',
            'description' => 'nullable|string',
            'items' => 'nullable|array',
            'total_weight' => 'nullable|numeric',
            'mode_of_transaction' => 'nullable|string',
            'receipt_no' => 'nullable|string',
            'remarks' => 'nullable|string',
        ]);
        
        abort_unless(
            CustomerSheet::where('id', $request->sheet_id)->where('cycle_id', $cid)->exists(),
            403
        );

        // Calculate total_material_buy from items (units * unit_price)
        $totalMaterialBuy = 0.0;
        $totalWeight = 0.0;

        if ($request->has('items') && is_array($request->items)) {
            foreach ($request->items as $item) {
                $units        = (float)($item['units'] ?? 0);
                $unit_price   = (float)($item['unit_price'] ?? 0);
                $item_weight  = (float)($item['total_weight'] ?? 0);

                $totalMaterialBuy += ($units * $unit_price);
                $totalWeight      += $item_weight;
            }
        }

        if ($totalWeight == 0.0 && $request->filled('total_weight')) {
            $totalWeight = (float) preg_replace('/[^\d\.\-]/', '', (string)$request->total_weight);
        }

        $entry = CustomerSheetEntry::create([
            'cycle_id'             => $cid,
            'customer_sheet_id' => $request->sheet_id,
            'date' => $request->date,
            'supplier' => $request->supplier,
            'description' => $request->description,

            'total_material_buy' => $request->total_material_buy,
            'total_weight' => $totalWeight,

            'total_material_without_vat' => $request->total_material_without_vat ?? 0,
            'total_vat' => $request->total_vat ?? 0,
            'shipping_cost' => $request->shipping_cost ?? 0,
            'dgd' => $request->dgd ?? 0,
            'labour' => $request->labour ?? 0,
            'total_shipping_cost' => $request->total_shipping_cost ?? 0,

            'mode_of_transaction' => $request->mode_of_transaction,
            'receipt_no' => $request->receipt_no,
            'remarks' => $request->remarks,

            'total_units' => $request->total_units ?? 0,
        ]);

        if ($request->has('items') && is_array($request->items)) {
            foreach ($request->items as $item) {
                $entry->items()->create([
                    'cycle_id'       => $cid,
                    'description' => $item['description'] ?? null,
                    'units' => $item['units'] ?? 0,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'vat' => $item['vat'] ?? 0,
                    'ctns' => $item['ctns'] ?? 0,
                    'weight_per_ctn' => $item['weight_per_ctn'] ?? 0,
                    'total_weight' => $item['total_weight'] ?? 0,
                ]);
            }
        }
        
        $this->forgetSheetTotals((int) $request->sheet_id);
        return response()->json(['message' => 'Saved successfully']);
    }

    public function loadCustomerSheet(Request $request, $sheetId)
    {
        $cid = ActiveCycle::id($request);
    
        // ensure the sheet is in this cycle
        $sheet = CustomerSheet::where('id', $sheetId)
            ->where('cycle_id', $cid)
            ->firstOrFail();
    
        $withItems = (int) $request->query('with_items', 0) === 1;
    
        $entries = CustomerSheetEntry::query()
            ->where('customer_sheet_id', $sheetId)
            ->where('cycle_id', $cid)
            ->select([
                'id',
                'customer_sheet_id',
                'date',
                'supplier',
                'description',
                'total_material_without_vat',
                'total_material_buy',
                'total_shipping_cost',
                'total_vat',
                'total_weight',
                'total_units',
                'dgd',
                'labour',
                'shipping_cost',
                'mode_of_transaction',
                'receipt_no',
                'remarks',
            ])
            // fast aggregate (kept; cheap)
            ->withSum('items as items_total_weight', 'total_weight')
            // only include items if explicitly requested
            ->when($withItems, function ($q) {
                $q->with(['items' => function ($iq) {
                    $iq->select(
                        'id',
                        'entry_id',
                        'description',
                        'units',
                        'unit_price',
                        'vat',
                        'ctns',
                        'weight_per_ctn',
                        'total_weight'
                    );
                }]);
            })
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($e) {
                $e->date = \Illuminate\Support\Carbon::parse($e->date)->toDateString();
                return $e;
            });
    
        // cache the totals briefly to avoid spikes
        $cacheKey = "sheet:totals:{$sheetId}";
        $totals = Cache::remember($cacheKey, 60, function () use ($sheetId) {
            $sumMaterial  = (float) CustomerSheetEntry::where('customer_sheet_id', $sheetId)->sum('total_material_buy');
            $sumShipping  = (float) CustomerSheetEntry::where('customer_sheet_id', $sheetId)->sum('total_shipping_cost');
            $sheetTotal   = $sumMaterial + $sumShipping;
            $loanPaid     = (float) CustomerLoanLedgerEntry::where('customer_sheet_id', $sheetId)->sum('amount');
            $remaining    = $loanPaid - $sheetTotal;
    
            return [
                'material'          => $sumMaterial,
                'shipping'          => $sumShipping,
                'sheet_total'       => $sheetTotal,
                'loan_paid'         => $loanPaid,
                'remaining_balance' => $remaining,
            ];
        });
    
        return response()->json([
            'status' => 'success',
            'data'   => $entries,
            'totals' => $totals,
        ]);
    }

    public function update(Request $request)
    {
        $cid = ActiveCycle::id($request);

        $request->validate([
            'id'          => 'required|exists:customer_sheet_entries,id',
            'sheet_id'    => 'required|exists:customer_sheets,id',
            'date'        => 'required|date',
            'supplier'    => 'required|string',
            'description' => 'nullable|string',
            'items'       => 'nullable|array',

            'mode_of_transaction' => 'nullable|string',
            'receipt_no'          => 'nullable|string',
            'remarks'             => 'nullable|string',

            'total_material_without_vat' => 'nullable|numeric',
            'total_material_buy'         => 'nullable|numeric',
            'total_vat'                  => 'nullable|numeric',
            'shipping_cost'              => 'nullable|numeric',
            'dgd'                        => 'nullable|numeric',
            'labour'                     => 'nullable|numeric',
            'total_shipping_cost'        => 'nullable|numeric',
            'total_weight'               => 'nullable|numeric',
            'total_units'                => 'nullable|numeric',
        ]);

        $entry = CustomerSheetEntry::findOrFail($request->id);
        abort_unless($entry->cycle_id === $cid, 403);
        
        $oldSheetId = (int) $entry->customer_sheet_id;

        // also ensure the new sheet_id belongs to this cycle
        abort_unless(CustomerSheet::where('id', $request->sheet_id)->where('cycle_id', $cid)->exists(), 403);

        // ---- Recompute from items (source of truth) ----
        $exVatSum   = 0.0; // Total Material w/out VAT
        $weightSum  = 0.0;

        if (is_array($request->items)) {
            foreach ($request->items as $item) {
                $units       = (float)($item['units'] ?? 0);
                $unit_price  = (float)($item['unit_price'] ?? 0);
                $rowWeight   = (float)($item['total_weight'] ?? 0);

                $exVatSum  += ($units * $unit_price);
                $weightSum += $rowWeight;
            }
        }

        // Fallbacks: if client didn’t send items or values are missing/blank,
        // use what's in the request *only if numeric*, otherwise keep computed.
        $tmwv = $request->input('total_material_without_vat'); // may be '', null, "3300", etc.
        if ($tmwv === null || $tmwv === '' || !is_numeric($tmwv)) {
            $tmwv = $exVatSum;
        } else {
            $tmwv = (float)$tmwv;
        }

        // If you also want to trust client for "buy", keep this pattern; otherwise compute your own.
        $tmb = $request->input('total_material_buy');
        if ($tmb === null || $tmb === '' || !is_numeric($tmb)) {
            // If you don't have a server-side VAT calc, default buy to exVat.
            $tmb = $exVatSum;
        } else {
            $tmb = (float)$tmb;
        }

        $tWeight = $weightSum > 0 ? $weightSum : (float)($request->input('total_weight') ?: 0);

        $entry->update([
            'customer_sheet_id'          => $request->sheet_id,
            'date'                       => $request->date,
            'supplier'                   => $request->supplier,
            'description'                => $request->description,

            'total_material_without_vat' => $tmwv,            // <- robust
            'total_material_buy'         => $tmb,
            'total_vat'                  => (float)($request->input('total_vat') ?: 0),
            'shipping_cost'              => (float)($request->input('shipping_cost') ?: 0),
            'dgd'                        => (float)($request->input('dgd') ?: 0),
            'labour'                     => (float)($request->input('labour') ?: 0),
            'total_shipping_cost'        => (float)($request->input('total_shipping_cost') ?: 0),
            'total_units'                => (float)($request->input('total_units') ?: 0),
            'total_weight'               => $tWeight,

            'mode_of_transaction'        => $request->mode_of_transaction,
            'receipt_no'                 => $request->receipt_no,
            'remarks'                    => $request->remarks,
        ]);

        // Replace items
        if (is_array($request->items)) {
            $entry->items()->delete();
            foreach ($request->items as $item) {
                $entry->items()->create([
                    'cycle_id'       => $cid,
                    'description'    => $item['description'] ?? null,
                    'units'          => $item['units'] ?? 0,
                    'unit_price'     => $item['unit_price'] ?? 0,
                    'vat'            => $item['vat'] ?? 0,
                    'ctns'           => $item['ctns'] ?? 0,
                    'weight_per_ctn' => $item['weight_per_ctn'] ?? 0,
                    'total_weight'   => $item['total_weight'] ?? 0,
                ]);
            }
        }
        
        // bust caches for both old and new (in case sheet_id changed)
        $this->forgetSheetTotals($oldSheetId);
        $this->forgetSheetTotals((int) $request->sheet_id);

        return response()->json(['message' => 'Updated successfully']);
    }

    public function updateSheet(Request $request)
    {
        $cid = ActiveCycle::id($request);
    
        $name = strtoupper(trim((string) $request->input('sheet_name', '')));
        $request->merge(['sheet_name' => $name]);
    
        $validated = $request->validate([
            'id'         => ['required','exists:customer_sheets,id'],
            'sheet_name' => [
                'required','string','max:60',
                Rule::unique('customer_sheets', 'sheet_name')
                    ->where(fn ($q) => $q->where('cycle_id', $cid))
                    ->ignore($request->id),
            ],
        ]);
    
        CustomerSheet::where('id', $validated['id'])
            ->where('cycle_id', $cid) // safety
            ->update(['sheet_name' => $name]);
    
        return response()->json(['success' => true, 'message' => 'Sheet updated']);
    }

    public function deleteEntry($id)
    {
        try {
            $entry = CustomerSheetEntry::with('items')->findOrFail($id);
            $sheetId = (int) $entry->customer_sheet_id;

            // Delete related items first
            $entry->items()->delete();

            // Then delete the entry itself
            $entry->delete();
            
            $this->forgetSheetTotals($sheetId);  

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
    
    public function section(CustomerSheet $sheet)
    {
        // Render your existing partial (the same one you include on first page load)
        // Make sure this partial outputs the cards, table header and a hidden .customer-sheet-id field
        $html = view('investment.sheets.customer_sheet', [
            'sheetId'   => $sheet->id,
            'sheetName' => $sheet->sheet_name,
        ])->render();

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }
    
    public function entryItems(Request $request, int $entryId)
    {
        $cid = ActiveCycle::id($request);
    
        $entry = CustomerSheetEntry::where('id', $entryId)
            ->where('cycle_id', $cid)
            ->firstOrFail();
    
        $items = $entry->items()
            ->select(
                'id',
                'entry_id',
                'description',
                'units',
                'unit_price',
                'vat',
                'ctns',
                'weight_per_ctn',
                'total_weight'
            )
            ->orderBy('id', 'asc')
            ->get();
    
        return response()->json([
            'status' => 'success',
            'data'   => $items,
        ]);
    }
}
