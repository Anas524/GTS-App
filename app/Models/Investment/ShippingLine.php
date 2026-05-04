<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class ShippingLine extends Model
{
    protected $table = 'customer_sheet_shippings';

    protected $fillable = ['customer_sheet_id', 'amount', /* other columns */];

    public function customerSheet()
    {
        return $this->belongsTo(CustomerSheet::class, 'customer_sheet_id');
    }
}
