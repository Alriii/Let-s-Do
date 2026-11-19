<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Let's Do! Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F4F7F5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #252B29;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F4F7F5;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .card {
      max-width: 520px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #E2ECE5;
      border-radius: 24px;
      padding: 36px 32px;
      box-shadow: 0 8px 30px rgba(23, 74, 50, 0.06);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .avatar-wrapper {
      display: inline-block;
      width: 82px;
      height: 82px;
      border-radius: 50%;
      background: linear-gradient(135deg, #DDF3E5 0%, #BFE8CE 100%);
      padding: 4px;
      box-shadow: 0 6px 18px rgba(69, 170, 112, 0.22);
    }
    .avatar-img {
      width: 82px;
      height: 82px;
      border-radius: 50%;
      display: block;
      object-fit: cover;
    }
    .badge {
      display: inline-block;
      margin-top: 12px;
      background-color: #EAF7EE;
      color: #174A32;
      border: 1px solid #C7EAD3;
      padding: 4px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .app-title {
      margin: 14px 0 4px;
      font-size: 24px;
      font-weight: 800;
      color: #174A32;
      letter-spacing: -0.02em;
    }
    .greeting {
      font-size: 16px;
      line-height: 1.6;
      color: #38423E;
      margin: 18px 0 20px;
      text-align: center;
    }
    .code-container {
      background: linear-gradient(180deg, #F0F9F3 0%, #E6F5EC 100%);
      border: 2px dashed #45AA70;
      border-radius: 18px;
      padding: 24px 16px;
      text-align: center;
      margin: 24px 0;
    }
    .code-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #174A32;
      margin-bottom: 8px;
    }
    .code-value {
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #174A32;
      letter-spacing: 0.28em;
      padding-left: 0.28em; /* optical centering */
      margin: 4px 0 8px;
      user-select: all;
      -webkit-user-select: all;
    }
    .code-hint {
      font-size: 12px;
      color: #4B6358;
      font-weight: 500;
      margin-top: 4px;
    }
    .lumi-bubble {
      background-color: #FAFBF9;
      border-left: 3px solid #45AA70;
      border-radius: 12px;
      padding: 14px 16px;
      margin: 22px 0 16px;
      font-size: 13.5px;
      line-height: 1.55;
      color: #4F5E57;
    }
    .lumi-tip-title {
      font-weight: 700;
      color: #174A32;
      margin-bottom: 3px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .expiry {
      font-size: 12.5px;
      color: #7A8A82;
      text-align: center;
      margin-top: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid #EEF3F0;
      font-size: 12px;
      color: #8C9C94;
      line-height: 1.5;
    }
    .footer a {
      color: #45AA70;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="avatar-wrapper">
          @if (file_exists(public_path('images/lumi-avatar.png')))
            <img src="{{ $message->embed(public_path('images/lumi-avatar.png')) }}" alt="Lumi" class="avatar-img" width="82" height="82" />
          @else
            <img src="https://raw.githubusercontent.com/Alriii/Let-s-Do/main/frontend/src/assets/bot-avatar.png" alt="Lumi" class="avatar-img" width="82" height="82" />
          @endif
        </div>
        <div>
          <span class="badge">✨ Lumi • AI Task Assistant</span>
        </div>
        <h1 class="app-title">Let's Do!</h1>
      </div>

      <div class="greeting">
        {!! $lumiMessage !!}
      </div>

      <div class="code-container">
        <div class="code-label">Your Verification Code</div>
        <div class="code-value">{{ $code }}</div>
        <div class="code-hint">Tap or double-click to copy</div>
      </div>

      <div class="expiry">
        ⏳ This code will expire in <strong>15 minutes</strong> for your security.
      </div>

      <div class="lumi-bubble">
        <div class="lumi-tip-title">🌱 Lumi's Productivity Tip</div>
        "{{ $lumiTip }}"
      </div>

      <div class="footer">
        Sent with 💚 by <strong>Lumi</strong> for <strong>Let's Do!</strong><br />
        If you didn't request this code, you can safely ignore this message.
      </div>
    </div>
  </div>
</body>
</html>
