<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SheetSetController extends Controller
{
    // public function index(Request $request)
    // {
    //     $cols = DB::getSchemaBuilder()->getColumnListing('sheet_sets');
    //     $hasOpened = in_array('opened_at', $cols);
    //     $hasClosed = in_array('closed_at', $cols);

    //     $openSelect = array_merge(['id', 'name', 'status'], $hasOpened ? ['opened_at'] : []);
    //     $closedSelect = array_merge(['id', 'name', 'status'], $hasClosed ? ['closed_at'] : []);

    //     $open = DB::table('sheet_sets')
    //         ->where('status', 'open')
    //         ->select($openSelect)
    //         ->orderBy($hasOpened ? 'opened_at' : 'id', 'desc')
    //         ->get();

    //     $closed = DB::table('sheet_sets')
    //         ->where('status', 'closed')
    //         ->select($closedSelect)
    //         ->orderBy($hasClosed ? 'closed_at' : 'id', 'desc')
    //         ->get();

    //     return response()->json([
    //         'active_id' => (int) $request->session()->get('sheet_set_id'),
    //         'open'      => $open,
    //         'closed'    => $closed,
    //     ]);
    // }

    // public function store(Request $request)
    // {
    //     $name = trim((string) $request->input('name') ?: now()->format('d/M/Y, h:i A'));
    //     $cols = DB::getSchemaBuilder()->getColumnListing('sheet_sets');

    //     $data = [
    //         'name'   => $name,
    //         'status' => 'open',
    //         'created_at' => now(),
    //         'updated_at' => now(),
    //     ];
    //     if (in_array('opened_at', $cols)) $data['opened_at'] = now();

    //     $id = DB::table('sheet_sets')->insertGetId($data);
    //     $request->session()->put('sheet_set_id', $id);

    //     return response()->json(['ok' => true, 'id' => $id]);
    // }

    // public function close(Request $request, int $id)
    // {
    //     $cols = DB::getSchemaBuilder()->getColumnListing('sheet_sets');
    //     $payload = ['status' => 'closed', 'updated_at' => now()];
    //     if (in_array('closed_at', $cols)) $payload['closed_at'] = now();

    //     DB::table('sheet_sets')->where('id', $id)->update($payload);

    //     // If you closed the active one, keep session on it (it becomes read-only UI)
    //     // or switch to the latest open set (optional)
    //     return response()->json(['ok' => true]);
    // }

    // public function reopen(Request $request, int $id)
    // {
    //     $cols = DB::getSchemaBuilder()->getColumnListing('sheet_sets');
    //     $payload = ['status' => 'open', 'updated_at' => now()];
    //     if (in_array('opened_at', $cols)) $payload['opened_at'] = now();
    //     if (in_array('closed_at', $cols)) $payload['closed_at'] = null;

    //     DB::table('sheet_sets')->where('id', $id)->update($payload);
    //     $request->session()->put('sheet_set_id', $id);

    //     return response()->json(['ok' => true, 'active_id' => $id]);
    // }

    // public function switch(Request $request, int $id)
    // {
    //     $status = DB::table('sheet_sets')->where('id', $id)->value('status');
    //     if (!$status) return response()->json(['message' => 'Set not found'], 404);
    //     if ($status === 'closed') return response()->json(['message' => 'That set is closed. Reopen it first.'], 409);

    //     $request->session()->put('sheet_set_id', $id);
    //     return response()->json(['ok' => true, 'active_id' => $id]);
    // }
}
