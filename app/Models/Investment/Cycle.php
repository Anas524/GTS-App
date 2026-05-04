<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cycle extends Model
{
    use SoftDeletes;
    
    protected $fillable = ['name', 'date_from', 'date_to', 'status', 'cash_in', 'cash_out', 'profit', 'us_client_payment', 'created_by'];

    protected $casts = [
        'date_from' => 'date',
        'date_to'   => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at'  => 'datetime',
    ];
}
