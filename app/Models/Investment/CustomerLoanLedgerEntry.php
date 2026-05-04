<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class CustomerLoanLedgerEntry extends Model
{
    protected $fillable = [
        'cycle_id',
        'customer_sheet_id',
        'date',
        'description',
        'amount',
    ];

    protected $casts = [
        'date'   => 'date',
        'amount' => 'decimal:2',
    ];

    public function sheet()
    {
        return $this->belongsTo(CustomerSheet::class, 'customer_sheet_id');
    }
}
