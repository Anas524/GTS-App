<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class CustomerSheet extends Model
{
    protected $fillable = ['sheet_name', 'cycle_id'];

    public function entries()
    {
        return $this->hasMany(CustomerSheetEntry::class);
    }

    public function loanLedger()
    {
        return $this->hasMany(\App\Models\CustomerLoanLedgerEntry::class, 'customer_sheet_id');
    }

    public function materials() {   // table: customer_sheet_materials
        return $this->hasMany(MaterialLine::class); // columns: customer_sheet_id, amount
    }
    public function shippings() {   // table: customer_sheet_shippings
        return $this->hasMany(ShippingLine::class); // columns: customer_sheet_id, amount
    }
}
