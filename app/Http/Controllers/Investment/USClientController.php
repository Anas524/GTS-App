<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\USClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Support\ActiveCycle;

class USClientController extends Controller
{
    /* ---------- Root (cycle-aware via ActiveCycle + cycle-glue.js) ---------- */

    public function index(Request $request)
    {
        $c = ActiveCycle::id($request);

        $clients = USClient::where('cycle_id', $c)
            ->orderBy('id')
            ->get();

        $totalAmount = USClient::where('cycle_id', $c)->sum('amount');

        if ($request->ajax()) {
            return response()->json([
                'clients'      => $clients,
                'totalAmount'  => (float) $totalAmount,
                'cycle_id'     => $c,
            ]);
        }

        return view('sheets.us_client_payment', compact('clients', 'totalAmount'));
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'date'    => 'required|date',
            'amount'  => 'required|numeric',
            'remarks' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors()
            ], 422);
        }

        $c = ActiveCycle::id($request);

        $client = USClient::create([
            'cycle_id' => $c,
            'date'     => $request->date,
            'amount'   => $request->amount,
            'remarks'  => $request->remarks,
        ]);

        return response()->json(['success' => true, 'id' => $client->id]);
    }

    public function update(Request $request, $id)
    {
        $c = ActiveCycle::id($request);

        $payment = USClient::where('id', $id)
            ->where('cycle_id', $c)
            ->firstOrFail();

        $payment->update($request->only(['date', 'amount', 'remarks']));

        return response()->json(['success' => true]);
    }

    public function destroy(Request $request, $id)
    {
        $c = ActiveCycle::id($request);

        $client = USClient::where('id', $id)
            ->where('cycle_id', $c)
            ->firstOrFail();

        $client->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
