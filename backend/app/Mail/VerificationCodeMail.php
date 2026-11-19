<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class VerificationCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $purpose = 'email_verification',
    ) {}

    public function envelope(): Envelope
    {
        $subject = $this->purpose === 'password_reset'
            ? "Your Let's Do! password reset code"
            : "{$this->code} is your Let's Do! verification code";

        return new Envelope(subject: $subject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.verification-code',
            text: 'emails.verification-code-text',
            with: [
                'code' => $this->code,
                'purpose' => $this->purpose,
            ],
        );
    }
}
