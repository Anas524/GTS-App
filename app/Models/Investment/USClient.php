<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;
use App\Models\Concerns\BelongsToCycle;

class USClient extends Model
{
    use BelongsToCycle;
    
    protected $table = 'us_clients';
    
    protected $fillable = ['date', 'amount', 'remarks', 'cycle_id'];
}
