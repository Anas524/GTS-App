<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class GtsMaterialItem extends Model
{
    protected $table = 'gts_materials_items';

    protected $fillable = [
        'material_id',
        'description',
        'units',
        'unit_price',
        'vat',
        'weight_per_ctn',
        'ctns',
    ];
    
    protected $casts = [
        'units'          => 'decimal:7',
        'unit_price'     => 'decimal:7',
        'vat'            => 'decimal:7',
        'weight_per_ctn' => 'decimal:7',
        'ctns'           => 'decimal:7',
    ];

    public function material()
    {
        return $this->belongsTo(GtsMaterial::class, 'material_id');
    }
}
