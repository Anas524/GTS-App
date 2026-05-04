<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\CustomerLoanLedgerEntry;
use Illuminate\Http\Request;
use App\Support\ActiveCycle;
use App\Models\Investment\CustomerSheet;

class CustomerLoanLedgerController extends Controller
{
    public function index(Request $request, $sheetId)
    {
        $cid = ActiveCycle::id($request);

        abort_unless(CustomerSheet::where('id', $sheetId)->where('cycle_id', $cid)->exists(), 403);
        
        $rows = CustomerLoanLedgerEntry::where('customer_sheet_id', $sheetId)
            ->where('cycle_id', $cid)
            ->orderBy('created_at')->orderBy('id')
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'customer_sheet_id' => $r->customer_sheet_id,
                'date' => $r->date->toDateString(),
                'description' => $r->description,
                'amount' => (float) $r->amount,
            ]);

        return response()->json(['data' => $rows]);
    }

    public function store(Request $request, $sheetId)
    {
        $cid = ActiveCycle::id($request);
        abort_unless(CustomerSheet::where('id', $sheetId)->where('cycle_id', $cid)->exists(), 403);

        $data = $request->validate([
            'date' => 'required|date',
            'description' => 'nullable|string',
            'amount' => 'required|numeric',
        ]);

        $row = CustomerLoanLedgerEntry::create([
            'cycle_id'          => $cid,
            'customer_sheet_id' => $sheetId,
            'date' => $data['date'],
            'description' => $data['description'] ?? null,
            'amount' => $data['amount'],
        ]);

        return response()->json(['message' => 'Saved', 'id' => $row->id]);
    }

    public function update(Request $request, $id)
    {
        $cid = ActiveCycle::id($request);

        $data = $request->validate([
            'date' => 'required|date',
            'description' => 'nullable|string',
            'amount' => 'required|numeric',
        ]);

        $row = CustomerLoanLedgerEntry::findOrFail($id);
        abort_unless($row->cycle_id === $cid, 403);

        $row->update($data);

        return response()->json(['message' => 'Updated']);
    }

    public function destroy(Request $request, $id)
    {
        $cid = ActiveCycle::id($request);

        $row = CustomerLoanLedgerEntry::findOrFail($id);
        abort_unless($row->cycle_id === $cid, 403);

        $row->delete();
        return response()->json(['message' => 'Deleted']);
    }
}
