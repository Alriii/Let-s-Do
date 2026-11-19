<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Let's Do! Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAF7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #252B29; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAF7; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border: 1px solid #E4EBE6; border-radius: 16px; padding: 32px 28px; box-shadow: 0 4px 16px rgba(23, 74, 50, 0.04);">
          <!-- Header with Lumi & App Name -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="vertical-align: middle; padding-right: 12px;">
                    <img src="https://raw.githubusercontent.com/Alriii/Let-s-Do/main/frontend/src/assets/bot-avatar.png" alt="Lumi" width="44" height="44" style="border-radius: 50%; display: block; border: 2px solid #DDF3E5;" />
                  </td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 18px; font-weight: 800; color: #174A32; letter-spacing: -0.02em; line-height: 1.2;">Let's Do!</div>
                    <div style="font-size: 12px; font-weight: 500; color: #626E68;">Your Task & Schedule Assistant</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="font-size: 15px; line-height: 1.6; color: #38423E; padding-bottom: 20px;">
              @if ($purpose === 'password_reset')
                <p style="margin: 0 0 12px;">We received a request to reset your password. Enter this verification code to proceed:</p>
              @else
                <p style="margin: 0 0 12px;">Welcome! Here is your verification code to get started with Let's Do:</p>
              @endif
            </td>
          </tr>

          <!-- Clean Code Box -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="background-color: #F0F8F3; border: 1px solid #D6EBDC; border-radius: 12px; padding: 18px 24px; display: inline-block;">
                <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; color: #174A32; letter-spacing: 8px; padding-left: 8px;">{{ $code }}</span>
              </div>
            </td>
          </tr>

          <!-- Expiry Notice -->
          <tr>
            <td style="font-size: 13px; line-height: 1.5; color: #626E68; padding-bottom: 24px; border-bottom: 1px solid #F0F4F1;">
              <p style="margin: 0 0 6px;">This code will expire in <strong>15 minutes</strong>.</p>
              <p style="margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
            </td>
          </tr>

          <!-- Clean Footer -->
          <tr>
            <td style="padding-top: 18px; text-align: center; font-size: 12px; color: #98A59F;">
              Let's Do! &bull; Simple, smart task management
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
