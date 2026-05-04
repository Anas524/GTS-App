<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCycle;

class GtsMaterial extends Model
{
    use BelongsToCycle;
    
    protected $fillable = [
        'cycle_id',
        'invoice_date',
        'invoice_no',
        'supplier_name',
        'brief_description',
        'shipping_cost',
        'dgd',
        'labour',
        'total_shipping_cost',
        'total_material',
        'ui_total_material',
        'total_vat',
        'total_material_buy',
        'total_weight',
        'mode_of_transaction',
        'receipt_no',
        'remarks',
        'status'
    ];

    protected $casts = [
        'items_data'        => 'array',
        'invoice_date'         => 'date',
        // return as STRING with fixed scale; avoids float rounding in PHP
        'shipping_cost'        => 'decimal:7',
        'dgd'                  => 'decimal:7',
        'labour'               => 'decimal:7',
        'total_shipping_cost'  => 'decimal:7',
        'total_material'       => 'decimal:7',
        'ui_total_material'    => 'decimal:7',
        'total_vat'            => 'decimal:7',
        'total_material_buy'   => 'decimal:7',
        'total_weight'         => 'decimal:7',
    ];

    public function items()
    {
        return $this->hasMany(GtsMaterialItem::class, 'material_id', 'id');
    }
}
