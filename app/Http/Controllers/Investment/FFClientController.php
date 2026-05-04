<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\FFClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Illuminate\Support\Facades\log;

class FFClientController extends Controller
{
    public function index()
    {
        $clients = FFClient::orderBy('sr_no')->orderBy('sub_serial')->get();

        $grouped = [];
        $normal = collect();

        foreach ($clients as $client) {
            if ($client->sr_no !== null) {
                $grouped[$client->sr_no] = $grouped[$client->sr_no] ?? collect();
                $grouped[$client->sr_no]->push($client);
            }
        }

        $mergedGroups = collect($grouped)->merge($normal);

        $merged = [];
        foreach ($mergedGroups as $key => $grouped) {
            $first = $grouped->first();
            $mergedEntry = $first->toArray();

            $mergedEntry['sr_no'] = $first->sr_no;
            $mergedEntry['description'] = $first->description;
            $mergedEntry['no_of_ctns'] = $first->no_of_ctns;
            $mergedEntry['units_per_ctn'] = $first->units_per_ctn;
            $mergedEntry['unit_price'] = $first->unit_price;
            $mergedEntry['weight'] = $first->weight;
            $mergedEntry['shipping_rate_per_kg'] = $first->shipping_rate_per_kg;

            $mergedEntry['descriptions'] = [];
            $mergedEntry['unit_prices'] = [];
            $mergedEntry['no_of_ctns_list'] = [];
            $mergedEntry['units_per_ctn_list'] = [];
            $mergedEntry['total_units_list'] = [];
            $mergedEntry['total_material_list'] = [];
            $mergedEntry['weight_list'] = [];
            $mergedEntry['shipping_rate_list'] = [];
            $mergedEntry['dgd_list'] = [];
            $mergedEntry['labeling_charges_list'] = [];
            $mergedEntry['total_list'] = [];
            $mergedEntry['cost_per_unit_aed_list'] = [];
            $mergedEntry['cost_per_unit_usd_list'] = [];
            $mergedEntry['labour_list'] = [];
            $mergedEntry['shipping_cost_list'] = [];

            $mergedEntry['total_material_sum'] = $grouped->sum('total_material');
            $mergedEntry['shipping_cost_sum'] = $grouped->sum('shipping_cost');
            $mergedEntry['total_sum'] = $grouped->sum('total');

            $mergedEntry['sub_serials'] = $grouped->pluck('sub_serial')->toArray();

            foreach ($grouped as $i => $item) {
                $prefix = ($grouped->count() > 1) ? ($i + 1) . '. ' : '';
                $mergedEntry['descriptions'][] = $prefix . $item->description;
                $mergedEntry['unit_prices'][] = $prefix . 'AED ' . number_format($item->unit_price, 2);
                $mergedEntry['no_of_ctns_list'][] = $prefix . $item->no_of_ctns;
                $mergedEntry['units_per_ctn_list'][] = $prefix . $item->units_per_ctn;
                $mergedEntry['total_units_list'][] = $prefix . $item->total_units;
                $mergedEntry['total_material_list'][] = $prefix . 'AED ' . number_format($item->total_material, 2);
                $mergedEntry['weight_list'][] = $prefix . $item->weight;
                $mergedEntry['shipping_rate_list'][] = $prefix . 'AED ' . number_format($item->shipping_rate, 2);
                $mergedEntry['dgd_list'][] = $prefix . 'AED ' . number_format($item->dgd, 2);
                $mergedEntry['labeling_charges_list'][] = $prefix . 'AED ' . number_format($item->labeling_charges, 2);
                $mergedEntry['total_list'][] = $prefix . 'AED ' . number_format($item->total, 2);
                $mergedEntry['cost_per_unit_aed_list'][] = $prefix . 'AED ' . number_format($item->cost_per_unit_aed, 2);
                $mergedEntry['cost_per_unit_usd_list'][] = $prefix . 'USD ' . number_format($item->cost_per_unit_usd, 2);
                $mergedEntry['labour_list'][] = $prefix . 'AED ' . number_format($item->labour, 2);
                $mergedEntry['shipping_cost_list'][] = $prefix . 'AED ' . number_format($item->shipping_cost, 2);
            }

            $mergedEntry['description_combined'] = implode("<br>", $mergedEntry['descriptions']);
            $mergedEntry['unit_price_combined'] = implode("<br>", $mergedEntry['unit_prices']);
            $mergedEntry['no_of_ctns_combined'] = implode("<br>", $mergedEntry['no_of_ctns_list']);
            $mergedEntry['units_per_ctn_combined'] = implode("<br>", $mergedEntry['units_per_ctn_list']);
            $mergedEntry['total_units_combined'] = implode("<br>", $mergedEntry['total_units_list']);
            $mergedEntry['total_material_combined'] = implode("<br>", $mergedEntry['total_material_list']);
            $mergedEntry['weight_combined'] = implode("<br>", $mergedEntry['weight_list']);
            $mergedEntry['shipping_rate_combined'] = implode("<br>", $mergedEntry['shipping_rate_list']);
            $mergedEntry['dgd_combined'] = implode("<br>", $mergedEntry['dgd_list']);
            $mergedEntry['labeling_charges_combined'] = implode("<br>", $mergedEntry['labeling_charges_list']);
            $mergedEntry['total_combined'] = implode("<br>", $mergedEntry['total_list']);
            $mergedEntry['cost_per_unit_aed_combined'] = implode("<br>", $mergedEntry['cost_per_unit_aed_list']);
            $mergedEntry['cost_per_unit_usd_combined'] = implode("<br>", $mergedEntry['cost_per_unit_usd_list']);
            $mergedEntry['labour_combined'] = implode("<br>", $mergedEntry['labour_list']);
            $mergedEntry['shipping_cost_combined'] = implode("<br>", $mergedEntry['shipping_cost_list']);

            $merged[] = (object) $mergedEntry;
        }

        return response()->json($merged);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'date' => 'required|date',
                'supplier_name' => 'required|string',
                'description' => 'nullable|string',
                'no_of_ctns' => 'nullable|numeric',
                'units_per_ctn' => 'nullable|numeric',
                'unit_price' => 'nullable|numeric',
                'weight' => 'nullable|numeric',
                'shipping_rate_per_kg' => 'nullable|numeric',
            ]);

            $no_of_ctns = $validated['no_of_ctns'] ?? 0;
            $units_per_ctn = $validated['units_per_ctn'] ?? 0;
            $unit_price = $validated['unit_price'] ?? 0;
            $weight = $validated['weight'] ?? 0;
            $shipping_rate_per_kg = $validated['shipping_rate_per_kg'] ?? 0;

            $total_units = $request->total_units ?? ($no_of_ctns * $units_per_ctn);
            $total_material = $unit_price * $total_units;

            $shipping_rate = $no_of_ctns * $weight * $shipping_rate_per_kg;
            $dgd = (200 / 15) * $no_of_ctns;
            $labeling = 0.4 * $total_units;
            $labour = 35 * $no_of_ctns;
            $shipping_cost = $shipping_rate + $dgd + $labeling + $labour;

            $total = $total_material + $shipping_cost;
            $cost_aed = $total / ($total_units ?: 1);
            $cost_usd = $cost_aed / 3.67;

            $client = FFClient::create([
                'sr_no' => 0,
                'sub_serial' => null,
                'date' => Carbon::parse($validated['date'])->format('Y-m-d'),
                'supplier_name' => $validated['supplier_name'],
                'description' => $validated['description'],
                'no_of_ctns' => $no_of_ctns,
                'units_per_ctn' => $units_per_ctn,
                'unit_price' => $unit_price,
                'weight' => $weight,
                'shipping_rate_per_kg' => $shipping_rate_per_kg,
                'total_units' => $total_units,
                'total_material' => $total_material,
                'shipping_rate' => $shipping_rate,
                'dgd' => $dgd,
                'labeling_charges' => $labeling,
                'labour' => $labour,
                'shipping_cost' => $shipping_cost,
                'total' => $total,
                'cost_per_unit_aed' => $cost_aed,
                'cost_per_unit_usd' => $cost_usd,
            ]);

            $this->resequenceSrNo();

            return response()->json(['success' => true, 'client' => $client]);
        } catch (\Exception $e) {
            Log::error('FF STORE ERROR', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function saveFFClient(Request $request)
    {
        $latestSrNo = FFClient::max('sr_no') ?? 0;
        $newSrNo = $latestSrNo + 1;

        $total_units = $request->total_units ?? (($request->units_per_ctn ?? 0) * ($request->no_of_ctns ?? 0));
        $unit_price = $request->unit_price ?? 0;
        $total_material = ($request->unit_price ?? 0) * $total_units;

        $shipping_rate_per_kg = $request->shipping_rate_per_kg ?? 0;
        $shipping_rate = ($request->no_of_ctns ?? 0) * ($request->weight ?? 0) * $shipping_rate_per_kg;
        $dgd = (200 / 15) * ($request->no_of_ctns ?? 0);
        $labeling_charges = 0.4 * $total_units;
        $labour = 35 * ($request->no_of_ctns ?? 0);
        $shipping_cost = $shipping_rate + $dgd + $labeling_charges + $labour;

        $total = $total_material + $shipping_cost;
        $cost_per_unit_aed = $total / ($total_units ?: 1);
        $cost_per_unit_usd = $cost_per_unit_aed / 3.67;

        $isMultipleEntry = $request->has('multiple_entry') && $request->multiple_entry == true;

        // Set sr_no and sub_serial based on mode
        $sr_no = $isMultipleEntry ? $request->sr_no : $newSrNo;
        $sub_serial = $isMultipleEntry ? ($request->sub_serial ?? 1) : null;

        $client = FFClient::create([
            'sr_no' => $sr_no,
            'sub_serial' => $sub_serial,
            'date' => Carbon::parse($request->date)->format('Y-m-d'),
            'supplier_name' => $request->supplier_name,
            'description' => $request->description,
            'no_of_ctns' => $request->no_of_ctns,
            'units_per_ctn' => $request->units_per_ctn,
            'unit_price' => $unit_price,
            'weight' => $request->weight,
            'shipping_rate_per_kg' => $shipping_rate_per_kg,
            'total_units' => $total_units,
            'total_material' => $total_material,
            'shipping_rate' => $shipping_rate,
            'dgd' => $dgd,
            'labeling_charges' => $labeling_charges,
            'labour' => $labour,
            'shipping_cost' => $shipping_cost,
            'total' => $total,
            'cost_per_unit_aed' => $cost_per_unit_aed,
            'cost_per_unit_usd' => $cost_per_unit_usd,
        ]);

        return response()->json([
            'success' => true,
            'client' => $client,
            'sr_no' => $sr_no,
            'sub_serial' => $sub_serial
        ]);
    }

    public function destroy($id)
    {
        $client = FFClient::find($id);
        if (!$client) return response()->json(['error' => 'Not found'], 404);

        $client->delete();
        $this->resequenceSrNo();
        return response()->json(['message' => 'Deleted']);
    }

    public function updateFFClient(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'date' => 'nullable|date',
            'supplier_name' => 'nullable|string',
            'description' => 'nullable|string',
            'no_of_ctns' => 'nullable|numeric',
            'units_per_ctn' => 'nullable|numeric',
            'unit_price' => 'nullable|numeric',
            'weight' => 'nullable|numeric',
            'shipping_rate_per_kg' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $client = FFClient::find($id);
        if (!$client) {
            return response()->json(['error' => 'FFClient not found'], 404);
        }

        $total_units = $request->total_units ?? (($request->units_per_ctn ?? 0) * ($request->no_of_ctns ?? 0));
        $unit_price = (float) $request->unit_price;
        $total_material = $unit_price * $total_units;

        $weight = (float) $request->weight;
        $shipping_rate_per_kg = (float) $request->shipping_rate_per_kg;
        $no_of_ctns = (float) $request->no_of_ctns;
        $shipping_rate = $no_of_ctns * $weight * $shipping_rate_per_kg;

        $dgd = (200 / 15) * ((float) $request->no_of_ctns ?? 0);
        $labeling_charges = 0.4 * $total_units;
        $labour = 35 * ((float) $request->no_of_ctns ?? 0);
        $shipping_cost = $shipping_rate + $dgd + $labeling_charges + $labour;
        $total = $total_material + $shipping_cost;
        $cost_per_unit_aed = $total / ($total_units ?: 1);
        $cost_per_unit_usd = $cost_per_unit_aed / 3.67;

        $client->update([
            'date' => $request->date,
            'supplier_name' => $request->supplier_name,
            'description' => $request->description,
            'no_of_ctns' => $request->no_of_ctns,
            'units_per_ctn' => $request->units_per_ctn,
            'unit_price' => $unit_price,
            'weight' => $request->weight,
            'shipping_rate_per_kg' => $shipping_rate_per_kg,
            'total_units' => $total_units,
            'total_material' => $total_material,
            'shipping_rate' => $shipping_rate,
            'dgd' => $dgd,
            'labeling_charges' => $labeling_charges,
            'labour' => $labour,
            'shipping_cost' => $shipping_cost,
            'total' => $total,
            'cost_per_unit_aed' => $cost_per_unit_aed,
            'cost_per_unit_usd' => $cost_per_unit_usd
        ]);

        return response()->json(['success' => true, 'message' => 'FFClient updated successfully.']);
    }

    public function saveMultiple(Request $request)
    {
        $entries = $request->entries;
        $date = $request->date;
        $supplier = $request->supplier_name;

        // Get the latest sr_no and assign a new one for this group
        $latestSrNo = FFClient::max('sr_no') ?? 0;
        $newSrNo = $latestSrNo + 1;

        foreach ($entries as $i => $entry) {
            $weight = isset($entry['weight']) ? (float) $entry['weight'] : 0;
            $ratePerKg = isset($entry['shipping_rate_per_kg']) ? (float) $entry['shipping_rate_per_kg'] : 0;

            $noOfCtns = isset($entry['no_of_ctns']) ? (int) $entry['no_of_ctns'] : 0;
            $unitsPerCtn = isset($entry['units_per_ctn']) ? (int) $entry['units_per_ctn'] : 0;
            $unitPrice = isset($entry['unit_price']) ? (float) $entry['unit_price'] : 0;

            $useManual = (!$noOfCtns || !$unitsPerCtn);
            $totalUnits = $useManual
                ? (isset($entry['manual_total_units']) ? (int) $entry['manual_total_units'] : 0)
                : ($noOfCtns * $unitsPerCtn);

            $totalMaterial = $unitPrice * $totalUnits;
            $shippingRate = $noOfCtns * $weight * $ratePerKg;
            $dgd = (200 / 15) * $noOfCtns;
            $labeling = 0.4 * $totalUnits;
            $labour = 35 * $noOfCtns;
            $shippingCost = $shippingRate + $dgd + $labour;
            $total = $totalMaterial + $shippingCost;
            $costAed = $total / ($totalUnits ?: 1);
            $costUsd = $costAed / 3.67;

            FFClient::create([
                'sr_no' => $newSrNo,
                'date' => $date,
                'supplier_name' => $supplier,
                'sub_serial' => $i + 1,
                'description' => $entry['description'],
                'no_of_ctns' => $noOfCtns,
                'units_per_ctn' => $unitsPerCtn,
                'unit_price' => $unitPrice,
                'total_units' => $totalUnits,
                'weight' => $weight,
                'shipping_rate' => $shippingRate,
                'shipping_rate_per_kg' => $ratePerKg,
                'dgd' => $dgd,
                'labeling_charges' => $labeling,
                'labour' => $labour,
                'shipping_cost' => $shippingCost,
                'total_material' => $totalMaterial,
                'total' => $total,
                'cost_per_unit_aed' => $costAed,
                'cost_per_unit_usd' => $costUsd,
            ]);
        }

        return response()->json(['success' => true]);
    }

    public function deleteMultiple(Request $request)
    {
        try {
            $request->validate([
                'date' => 'required|date',
                'sub_serial' => 'required'
            ]);

            $date = $request->input('date');
            $rawSubSerial = trim($request->input('sub_serial'));
            $supplier = $request->input('supplier_name');

            $query = FFClient::where('date', $date);
            if (!is_null($supplier)) {
                $query->where('supplier_name', $supplier);
            } else {
                $query->whereNull('supplier_name');
            }

            if (strtolower($rawSubSerial) === 'all') {
                $query->delete();
            } else {
                $subSerial = (int) $rawSubSerial;
                $query->where('sub_serial', $subSerial)->delete();

                // Get the `sr_no` of the deleted group
                $deletedSrNo = FFClient::where('date', $date)
                    ->where('supplier_name', $supplier)
                    ->value('sr_no');

                $remaining = FFClient::where('sr_no', $deletedSrNo)
                    ->orderBy('sub_serial')
                    ->get();

                if ($remaining->count() === 1) {
                    // Convert to normal row
                    $remaining->first()->update(['sub_serial' => null]);
                } else {
                    // Reassign sub_serials in order
                    foreach ($remaining as $index => $entry) {
                        $entry->update(['sub_serial' => $index + 1]);
                    }
                }
            }

            // Now reorder global sr_no by insertion order
            $this->resequenceSrNo();

            return response()->json(['message' => 'Entry deleted and sub/sr numbers updated']);
        } catch (\Exception $e) {
            Log::error('Delete Multiple Failed', ['error' => $e->getMessage()]);
            return response()->json(['error' => 'Server error. Check logs.'], 500);
        }
    }

    public function getAllEntries()
    {
        return FFClient::all();
    }

    public function getSubEntry($id, $sub_serial)
    {
        $entry = FFClient::where('id', $id)->where('sub_serial', $sub_serial)->first();

        if (!$entry) {
            return response()->json(['success' => false]);
        }

        return response()->json(['success' => true, 'entry' => $entry]);
    }

    public function updateSubEntry(Request $request, $id, $sub_serial)
    {
        $client = FFClient::where('id', $id)->where('sub_serial', $sub_serial)->first();

        if (!$client) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $total_units = $request->total_units ?? (($request->units_per_ctn ?? 0) * ($request->no_of_ctns ?? 0));
        $unit_price = $request->unit_price ?? 0;
        $total_material = $unit_price * $total_units;
        $shipping_rate_per_kg = $request->shipping_rate_per_kg ?? 20;
        $shipping_rate = ($request->no_of_ctns ?? 0) * ($request->weight ?? 0) * $shipping_rate_per_kg;
        $dgd = (200 / 15) * ($request->no_of_ctns ?? 0);
        $labeling_charges = 0.4 * $total_units;
        $labour = 35 * ($request->no_of_ctns ?? 0);
        $shipping_cost = $shipping_rate + $dgd + $labeling_charges + $labour;
        $total = $total_material + $shipping_cost;
        $cost_per_unit_aed = $total / ($total_units ?: 1);
        $cost_per_unit_usd = $cost_per_unit_aed / 3.67;

        $client->update([
            'description' => $request->description,
            'no_of_ctns' => $request->no_of_ctns,
            'units_per_ctn' => $request->units_per_ctn,
            'unit_price' => $unit_price,
            'weight' => $request->weight,
            'shipping_rate_per_kg' => $shipping_rate_per_kg,
            'total_units' => $total_units,
            'total_material' => $total_material,
            'shipping_rate' => $shipping_rate,
            'dgd' => $dgd,
            'labeling_charges' => $labeling_charges,
            'labour' => $labour,
            'shipping_cost' => $shipping_cost,
            'total' => $total,
            'cost_per_unit_aed' => $cost_per_unit_aed,
            'cost_per_unit_usd' => $cost_per_unit_usd
        ]);

        return response()->json(['success' => true]);
    }

    public function resequenceSrNo()
    {
        $clients = FFClient::orderBy('id')->get();

        $currentSrNo = 1;
        $grouped = [];

        foreach ($clients as $client) {
            $key = $client->sr_no;

            if (!isset($grouped[$key])) {
                $grouped[$key] = [];
            }

            $grouped[$key][] = $client;
        }

        foreach ($grouped as $entries) {
            foreach ($entries as $i => $client) {
                $client->update([
                    'sr_no' => $currentSrNo,
                    'sub_serial' => count($entries) > 1 ? $i + 1 : null
                ]);
            }
            $currentSrNo++;
        }
    }
}
