<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class CustomerSheetEntry extends Model
{
    protected $fillable = [
        'cycle_id',
        'customer_sheet_id',
        'date',
        'supplier',
        'description',

        'total_material_without_vat',
        'total_material_buy',
        'total_vat',
        'shipping_cost',
        'dgd',
        'labour',
        'total_shipping_cost',
        'total_weight',

        'mode_of_transaction',
        'receipt_no',
        'remarks',

        'total_units'
    ];

    protected $casts = [
        'total_material_without_vat' => 'decimal:2',
        'total_material_buy'         => 'decimal:2',
        'total_vat'                  => 'decimal:2',
        'shipping_cost'              => 'decimal:2',
        'dgd'                        => 'decimal:2',
        'labour'                     => 'decimal:2',
        'total_shipping_cost'        => 'decimal:2',
        'total_units'                => 'decimal:2',
        'total_weight'               => 'decimal:2',
    ];

    public function sheet()
    {
        return $this->belongsTo(CustomerSheet::class, 'customer_sheet_id');
    }

    public function items()
    {
        return $this->hasMany(CustomerSheetItem::class, 'entry_id');
    }

    public function attachments(){
        return $this->hasMany(CustomerSheetAttachment::class, 'entry_id')->orderBy('id');
    }
}
