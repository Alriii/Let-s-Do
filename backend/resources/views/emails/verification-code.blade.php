<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>
    @if ($purpose === 'password_reset')
      Reset your Let's Do! password
    @else
      Your Let's Do! verification code
    @endif
  </title>
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }

    @media only screen and (max-width: 600px) {
      .page { padding: 0 !important; }
      .gutter { padding-left: 22px !important; padding-right: 22px !important; }
      .code { font-size: 28px !important; letter-spacing: 7px !important; padding-left: 7px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF;">

  {{-- Inbox preview text --}}
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; color: #FFFFFF;">
    @if ($purpose === 'password_reset')
      Use code {{ $code }} to reset your Let's Do! password.
    @else
      Your Let's Do! verification code is {{ $code }}.
    @endif
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF;">
    <tr>
      <td class="page" align="center" style="padding: 0 16px;">

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px;">

          {{-- Wordmark --}}
          <tr>
            <td class="gutter" style="padding: 32px 28px 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; letter-spacing: -0.01em; color: #174A32;">Let's Do!</td>
          </tr>

          {{-- Lumi, embedded inline as a 16:9 banner --}}
          <tr>
            <td>
              <img
                src="{{ $message->embed(resource_path('views/emails/images/lumi-16x9.jpg')) }}"
                width="520"
                height="293"
                alt="Lumi, the Let's Do! assistant"
                style="display: block; width: 100%; max-width: 520px; height: auto;"
              >
            </td>
          </tr>

          {{-- Heading --}}
          <tr>
            <td class="gutter" style="padding: 30px 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <h1 style="margin: 0; font-size: 24px; line-height: 1.3; font-weight: 600; letter-spacing: -0.015em; color: #111111;">
                @if ($purpose === 'password_reset')
                  Reset your password
                @else
                  Verify your email
                @endif
              </h1>
              <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.65; color: #6B6B6B;">
                @if ($purpose === 'password_reset')
                  Enter this code to choose a new password.
                @else
                  Enter this code to finish setting up your account.
                @endif
              </p>
            </td>
          </tr>

          {{-- Code --}}
          <tr>
            <td class="gutter" style="padding: 24px 28px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E6E6E6; border-radius: 10px; background-color: #FAFAFA;">
                <tr>
                  <td align="center" style="padding: 16px 12px 2px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #8A8A8A;">
                    {{ $purpose === 'password_reset' ? 'Reset code' : 'Verification code' }}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 2px 12px 16px;">
                    <div class="code" style="-webkit-user-select: all; -ms-user-select: all; user-select: all; font-family: 'Courier New', Courier, monospace; font-size: 34px; line-height: 1.2; font-weight: 600; letter-spacing: 10px; padding-left: 10px; color: #111111; white-space: nowrap;">{{ $code }}</div>
                  </td>
                </tr>
              </table>
              <p style="margin: 8px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.5; text-align: center; color: #9A9A9A;">Select the code to copy it.</p>
            </td>
          </tr>

          {{-- Expiry --}}
          <tr>
            <td class="gutter" style="padding: 20px 28px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.6; color: #7A7A7A;">
              This code expires in 15 minutes.
            </td>
          </tr>

          {{-- Divider --}}
          <tr>
            <td style="padding: 26px 28px 0;">
              <div style="height: 1px; background-color: #EEEEEE; font-size: 0; line-height: 0;">&nbsp;</div>
            </td>
          </tr>

          {{-- Footer --}}
          <tr>
            <td class="gutter" style="padding: 16px 28px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; line-height: 1.65; color: #9A9A9A;">
              If you didn't request this, you can ignore this email.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
