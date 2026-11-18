<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\Mail;

class VerificationCodeService
{
    /**
     * Generate a 6-digit code, save its hash, and email it.
     */
    public function generateAndSend(string $email, string $purpose): void
    {
        // 1. Invalidate any older unconsumed codes for this email and purpose
        VerificationCode::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        // 2. Generate secure random 6-digit code (e.g. "042918")
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // 3. Save only the secure hash in the database
        VerificationCode::create([
            'email' => $email,
            'code_hash' => hash('sha256', $code),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(15),
            'attempts' => 0,
        ]);

        // 4. Send the actual code via email
        Mail::to($email)->send(new VerificationCodeMail($code));
    }

    /**
     * Verify if a user-supplied code is valid.
     */
    public function verify(string $email, string $code, string $purpose): bool
    {
        // Find latest unconsumed code
        $record = VerificationCode::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $record) {
            return false;
        }

        // Check expiration (15 minutes)
        if ($record->expires_at->isPast()) {
            return false;
        }

        // Max attempt protection (limit to 5 guesses)
        if ($record->attempts >= 5) {
            return false;
        }

        // Increment attempt count
        $record->increment('attempts');

        // Compare hashes securely
        $isValid = hash_equals($record->code_hash, hash('sha256', $code));

        if ($isValid) {
            // Mark as consumed so it cannot be reused
            $record->update(['consumed_at' => now()]);
            return true;
        }

        return false;
    }
}
