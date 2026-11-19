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

    public string $lumiMessage;
    public string $lumiTip;

    public function __construct(
        public string $code,
        public string $purpose = 'email_verification',
    ) {
        $this->composeLumiContent();
    }

    /**
     * Let Lumi compose a warm, cute message and a productivity tip.
     */
    private function composeLumiContent(): void
    {
        if ($this->purpose === 'password_reset') {
            $this->lumiMessage = "<strong>Kamusta!</strong> Lumi here 🌿 Don't worry at all — forgetting passwords happens to the best of us! Enter this code to reset your password and get right back to your schedule:";
            $this->lumiTip = "A fresh start is always a good time to review your week and prioritize what matters most!";
        } else {
            $messages = [
                "<strong>Kamusta!</strong> It's me, <strong>Lumi</strong> — your friendly task assistant! 🌿✨ I'm so excited to help you organize your daily goals and stay on top of everything. Here is your verification code to get started:",
                "<strong>Yay, you're almost ready!</strong> Lumi here 🌸 Let's get your account verified so we can start checking off your to-dos and building great habits together. Here is your code:",
                "<strong>Hello there!</strong> Lumi reporting for duty 🌿✨ Use this verification code to unlock your dashboard and let's turn your daily plans into accomplished goals:",
            ];
            $this->lumiMessage = $messages[array_rand($messages)];

            $tips = [
                "Breaking big goals into 3 small daily tasks keeps your momentum high and stress low!",
                "Check off your highest priority task first thing in the morning — the rest of the day feels so light!",
                "Taking a 5-minute breather between focused study sessions helps your brain retain more!",
                "Celebrate small wins! Every task checked off is a step closer to your dream.",
            ];
            $this->lumiTip = $tips[array_rand($tips)];
        }
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->purpose === 'password_reset'
            ? "🔑 Your Let's Do! Password Reset Code"
            : "🌿 {$this->code} is your Let's Do! Verification Code";

        return new Envelope(subject: $subject);
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $avatarPath = public_path('images/lumi-avatar.png');
        $avatarEmbed = file_exists($avatarPath) ? null : null;

        return new Content(
            view: 'emails.verification-code',
            with: [
                'code' => $this->code,
                'lumiMessage' => $this->lumiMessage,
                'lumiTip' => $this->lumiTip,
                'avatarEmbed' => file_exists($avatarPath) ? url('images/lumi-avatar.png') : null,
            ],
        );
    }
}
