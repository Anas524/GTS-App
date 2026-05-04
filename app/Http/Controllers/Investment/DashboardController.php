<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\CustomerSheet;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    public function showMainPage(Request $request)
    {
        $sheets = CustomerSheet::all();
        return view('index', compact('sheets'));
    }
}
