<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Verification codes are looked up by email + purpose on every
 * verify/reset attempt, so index that access path.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            $table->index(['email', 'purpose', 'consumed_at'], 'verification_codes_lookup_index');
        });
    }

    public function down(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            $table->dropIndex('verification_codes_lookup_index');
        });
    }
};
