<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class LocalItem extends Model
{
    protected $fillable = [
        'local_id','description','units','unit_price',
        'total_ex_vat','vat','total_inc_vat','status','remarks',
    ];

    protected $casts = [
        'units'         => 'integer',
        'unit_price'    => 'decimal:2',
        'total_ex_vat'  => 'decimal:2',
        'vat'           => 'decimal:2',
        'total_inc_vat' => 'decimal:2',
    ];

    public function local()
    {
        return $this->belongsTo(Local::class);
    }
}
