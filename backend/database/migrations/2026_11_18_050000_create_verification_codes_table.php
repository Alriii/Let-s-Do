<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();                  // Whose code is this?
            $table->string('code_hash');                       // Hashed 6-digit code (for security)
            $table->string('purpose');                         // 'email_verification' or 'password_reset'
            $table->timestamp('expires_at');                   // When it expires (e.g., 15 mins)
            $table->integer('attempts')->default(0);           // Max guess protection
            $table->timestamp('consumed_at')->nullable();      // When used (prevents reuse)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_codes');
    }
};
