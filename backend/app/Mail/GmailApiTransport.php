<?php

namespace App\Mail;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

// sends email via Gmail REST API over HTTPS (bypasses SMTP port blocks)
class GmailApiTransport extends AbstractTransport
{
    public function __construct(
        private string $clientId,
        private string $clientSecret,
        private string $refreshToken,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        // 1. Get access token from Google OAuth2
        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $this->refreshToken,
            'grant_type' => 'refresh_token',
        ]);

        if (! $tokenResponse->successful()) {
            throw new \RuntimeException('Failed to refresh Gmail token: ' . $tokenResponse->body());
        }

        $accessToken = $tokenResponse->json('access_token');

        // 2. Encode raw email message as base64url
        $rawMessage = $message->toString();
        $encoded = rtrim(strtr(base64_encode($rawMessage), '+/', '-_'), '=');

        // 3. Send message via Gmail REST API
        $sendResponse = Http::withToken($accessToken)
            ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', [
                'raw' => $encoded,
            ]);

        if (! $sendResponse->successful()) {
            throw new \RuntimeException('Gmail API send failed: ' . $sendResponse->body());
        }
    }

    public function __toString(): string
    {
        return 'gmail-api';
    }
}
