<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCycle;

class SQClient extends Model
{
    use BelongsToCycle;

    protected $table = 's_q_clients';
    
    protected $fillable = ['date', 'amount', 'remarks', 'cycle_id'];
}
