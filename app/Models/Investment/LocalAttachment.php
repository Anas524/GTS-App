<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class LocalAttachment extends Model
{
    protected $table = 'local_sale_attachments';
    protected $fillable = ['local_id','invoice_path','receipt_path','delivery_note_path'];

    public function local() { return $this->belongsTo(Local::class, 'local_id'); }
}
