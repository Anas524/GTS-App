<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class FFClient extends Model
{
    protected $table = 'f_f_clients';

    protected $fillable = [
        'sr_no',
        'date',
        'supplier_name',
        'description',
        'no_of_ctns',
        'units_per_ctn',
        'unit_price',
        'total_units',
        'weight',
        'total_material',
        'shipping_rate_per_kg',
        'shipping_rate',
        'dgd',
        'labeling_charges',
        'labour',
        'shipping_cost',
        'total',
        'cost_per_unit_aed',
        'cost_per_unit_usd',
        'sub_serial',
    ];
}