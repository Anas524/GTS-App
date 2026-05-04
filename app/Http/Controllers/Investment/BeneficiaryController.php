<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Support\ActiveCycle;

class BeneficiaryController extends Controller
{
    public function index()
    {
        return view('investment.sheets.beneficiary_sheet');
    }
    
    // keep a single place that builds the payload for a given cycle
    private function payloadFor(int $cycleId): array
    {
        $rows = DB::table('beneficiary_entries')
            ->where('cycle_id', $cycleId)          // filter by active cycle
            ->orderByRaw('COALESCE(date,"0000-00-00") asc')
            ->orderBy('id')
            ->get()
            ->groupBy('beneficiary');

        $map = fn($b) => ($rows[$b] ?? collect())->map(function ($r) {
            return [
                'id'      => $r->id,
                'date'    => $r->date,
                'type'    => $r->type,
                'amount'  => (float)($r->amount ?? 0),
                'charity' => $r->charity !== null ? (float)$r->charity : null,
                'remarks' => (string)($r->remarks ?? ''),
            ];
        })->values()->all();

        $sh1 = $map('shareholder1');
        $sh2 = $map('shareholder2');
        $ch  = $map('charity');

        $sum = function (array $arr, string $key = 'amount'): float {
            $t = 0.0;
            foreach ($arr as $row) $t += (float)($row[$key] ?? 0);
            return round($t, 2);
        };

        return [
            'shareholder1' => [
                'rows'          => $sh1,
                'total'         => $sum($sh1, 'amount'),
                'charity_total' => $sum($sh1, 'charity'),
            ],
            'shareholder2' => [
                'rows'          => $sh2,
                'total'         => $sum($sh2, 'amount'),
                'charity_total' => $sum($sh2, 'charity'),
            ],
            'charity' => [
                'rows'          => $ch,
                'total'         => $sum($ch, 'amount'),
                'charity_total' => $sum($ch, 'charity'),
            ],
        ];
    }

    // accept Request so we can read ?cycle_id or session
    public function data(Request $request)
    {
        $cid = ActiveCycle::id($request);
        return response()->json($this->payloadFor($cid));
    }

    public function store(Request $req)
    {
        $v = Validator::make($req->all(), [
            'beneficiary' => 'required|in:shareholder1,shareholder2,charity',
            'date'        => 'nullable|date',
            'type'        => 'required|in:cash,bank_transfer,adjustment',
            'amount'      => 'nullable|numeric',
            'charity'     => 'nullable|numeric',
            'remarks'     => 'nullable|string|max:500',
        ]);
        if ($v->fails()) return response()->json(['success' => false, 'errors' => $v->errors()], 422);
        
        $cid = ActiveCycle::id($req);

        $id = DB::table('beneficiary_entries')->insertGetId([
            'cycle_id'    => $cid,
            'beneficiary' => $req->input('beneficiary'),
            'date'        => $req->input('date') ?: null,
            'type'        => $req->input('type'),
            'amount'      => $req->input('amount') !== null ? (float)$req->input('amount') : 0,
            'charity'     => $req->input('charity') !== null ? (float)$req->input('charity') : null,
            'remarks'     => $req->input('remarks'),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        return response()->json([
            'created_id' => $id,
            'payload'    => $this->payloadFor($cid),
        ], 201);
    }

    public function destroy(Request $request, $id)
    {
        $cid = ActiveCycle::id($request);
        
        $deleted = DB::table('beneficiary_entries')
            ->where('id', $id)
            ->where('cycle_id', $cid)
            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Not found in this set'], 404);
        }

        return response()->json($this->payloadFor($cid));
    }

    // app/Http/Controllers/BeneficiaryController.php
    public function update(Request $req, $id)
    {
        $data = $req->validate([
            'date'    => 'nullable|date',
            'type'    => 'required|in:cash,bank_transfer,adjustment',
            'amount'  => 'nullable|numeric',
            'charity' => 'nullable|numeric',
            'remarks' => 'nullable|string|max:500',
        ]);

        $cid = ActiveCycle::id($req);

        $affected = DB::table('beneficiary_entries')
            ->where('id', $id)
            ->where('cycle_id', $cid)
            ->update([
                'date'       => $data['date'] ?? null,
                'type'       => $data['type'],
                'amount'     => array_key_exists('amount', $data) ? (float)($data['amount'] ?? 0) : 0,
                'charity'    => array_key_exists('charity', $data)
                    ? ($data['charity'] !== null ? (float)$data['charity'] : null)
                    : null,
                'remarks'    => $data['remarks'] ?? null,
                'updated_at' => now(),
            ]);

        if (!$affected) {
            return response()->json(['message' => 'Not found in this set'], 404);
        }

        return response()->json($this->payloadFor($cid));
    }
}
