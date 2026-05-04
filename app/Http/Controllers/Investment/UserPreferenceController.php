<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Investment\User;
use Illuminate\Support\Facades\Auth;

class UserPreferenceController extends Controller
{
    public function updateCustomerSheet(Request $request)
    {
        /** @var \App\Models\Investment\User $user */
        $user = Auth::user();
        $user->last_customer_sheet = $request->sheet_name;
        $user->save();

        return response()->json(['status' => 'success']);
    }
}
