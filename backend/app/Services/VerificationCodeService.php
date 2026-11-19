<?php

namespace App\Services;

use App\Mail\VerificationCodeMail;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\Mail;

class VerificationCodeService
{
    // send 6-digit verification code
    public function generateAndSend(string $email, string $purpose): void
    {
        // expire old codes
        VerificationCode::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        // make 6 digit code
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // save hash to db
        VerificationCode::create([
            'email' => $email,
            'code_hash' => hash('sha256', $code),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(15),
            'attempts' => 0,
        ]);

        // send email
        Mail::to($email)->send(new VerificationCodeMail($code));
    }

    // check code
    public function verify(string $email, string $code, string $purpose): bool
    {
        $record = VerificationCode::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $record) {
            return false;
        }

        // check expiry (15 mins)
        if ($record->expires_at->isPast()) {
            return false;
        }

        // max 5 attempts
        if ($record->attempts >= 5) {
            return false;
        }

        $record->increment('attempts');

        $isValid = hash_equals($record->code_hash, hash('sha256', $code));

        if ($isValid) {
            $record->update(['consumed_at' => now()]);
            return true;
        }

        return false;
    }
}
