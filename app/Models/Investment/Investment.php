<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Investment extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'supplier_name',
        'buyer',
        'invoice_number',
        'transaction_mode',
        'unit_price',
        'description',
        'no_of_ctns',
        'units_per_ctn',
        'total_units',
        'weight',
        'shipping_rate_per_kg',
        'total_material',
        'shipping_rate',
        'dgd',
        'labour',
        'shipping_cost',
        'total_material_grand',
        'total_shipment_grand',
        'grand_total_final',
        'remarks',
        'vat_percentage',
        'vat_amount',
        'total_material_including_vat',
        'invoice_path',
        'receipt_path',
        'note_path',
        'invoice_file', 
        'receipt_file', 
        'note_file',
        'sub_serial'
    ];
}
