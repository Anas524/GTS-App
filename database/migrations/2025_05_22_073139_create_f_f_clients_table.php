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
        Schema::create('f_f_clients', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('sr_no')->nullable();
            $table->date('date')->nullable();
            $table->string('supplier_name')->nullable();
            $table->string('description')->nullable();
            $table->integer('no_of_ctns')->nullable();
            $table->integer('units_per_ctn')->nullable();
            $table->decimal('unit_price', 15, 2)->nullable();
            $table->integer('total_units')->nullable();
            $table->decimal('weight', 15, 2)->nullable();
            $table->decimal('total_material', 20, 2)->nullable();
            $table->decimal('shipping_rate_per_kg', 10, 2)->nullable();
            $table->decimal('shipping_rate', 20, 2)->nullable();
            $table->decimal('dgd', 15, 2)->nullable();
            $table->decimal('labeling_charges', 20, 2)->nullable();
            $table->decimal('labour', 15, 2)->nullable();
            $table->decimal('shipping_cost', 20, 2)->nullable();
            $table->decimal('total', 20, 2)->nullable();
            $table->decimal('cost_per_unit_aed', 20, 2)->nullable();
            $table->decimal('cost_per_unit_usd', 20, 2)->nullable();
            $table->integer('sub_serial')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('f_f_clients');
    }
};
