<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('local_sales', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sr_no')->nullable();
            $table->string('client')->nullable();
            $table->date('date')->nullable();
            $table->string('description')->nullable();
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->unsignedInteger('no_of_ctns')->nullable();
            $table->unsignedInteger('units_per_ctn')->nullable();
            $table->unsignedInteger('total_no_of_units')->nullable(); // can be calculated or manual
            $table->decimal('total_amount_without_vat', 12, 2)->nullable();
            $table->decimal('vat_percentage', 5, 2)->nullable(); // user input
            $table->decimal('vat_amount', 12, 2)->nullable(); // unit price * total units * (vat % / 100)
            $table->decimal('total_amount_including_vat', 12, 2)->nullable();
            $table->string('payment_status')->nullable();
            $table->string('remarks')->nullable();
            $table->unsignedInteger('sub_serial')->nullable(); // for multiple entries
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('local_sales');
    }
};
