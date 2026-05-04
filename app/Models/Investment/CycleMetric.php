<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class CycleMetric extends Model
{
    protected $fillable = ['cycle_id','cash_in','cash_out','profit','us_total','computed_at'];
}
