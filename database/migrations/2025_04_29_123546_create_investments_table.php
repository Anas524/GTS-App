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
        Schema::create('investments', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->string('supplier_name')->nullable();
            $table->string('buyer')->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('transaction_mode')->nullable();
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->decimal('vat_percentage', 5, 2)->nullable();
            $table->string('description')->nullable();
            $table->decimal('no_of_ctns', 10, 2)->nullable();
            $table->decimal('units_per_ctn', 10, 2)->nullable();
            $table->decimal('total_units', 10, 2)->nullable();
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('vat_amount', 15, 2)->nullable();
            $table->decimal('shipping_rate_per_kg', 10, 2)->nullable();
            $table->decimal('total_material', 15, 2)->nullable();
            $table->decimal('total_material_including_vat', 15, 2)->nullable();
            $table->decimal('shipping_rate', 15, 2)->nullable();
            $table->decimal('dgd', 15, 2)->nullable();
            $table->decimal('labour', 15, 2)->nullable();
            $table->decimal('shipping_cost', 15, 2)->nullable();
            $table->decimal('total_material_grand', 15, 2)->nullable();
            $table->decimal('total_shipment_grand', 15, 2)->nullable();
            $table->decimal('grand_total_final', 15, 2)->nullable();
            $table->text('remarks')->nullable();

            $table->string('invoice_path')->nullable();
            $table->string('receipt_path')->nullable();
            $table->string('note_path')->nullable();

            $table->integer('sub_serial')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investments');
    }
};
