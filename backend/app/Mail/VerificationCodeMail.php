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

    /**
     * Create a new message instance.
     */
    public function __construct(public string $code) {}

    /**
     * Get the message envelope (subject).
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Your Let's Do! Verification Code",
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            htmlString: "<h2>Let's Do!</h2><p>Your verification code is: <strong>{$this->code}</strong></p><p>This code will expire in 15 minutes.</p>",
        );
    }
}
