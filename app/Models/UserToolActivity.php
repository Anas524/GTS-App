<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserToolActivity extends Model
{
    protected $table = 'user_tool_activities';

    protected $fillable = [
        'user_id',
        'tool',
        'last_at',
    ];

    protected $casts = [
        'last_at' => 'datetime',
    ];
}
