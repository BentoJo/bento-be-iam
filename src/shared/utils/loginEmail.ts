export const loginEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ManeJo — Verify Your Account</title>
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #e8eaf0;
      font-family: 'DM Sans', sans-serif;
      padding: 40px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .email-card {
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,0.10);
    }

    .email-header {
      background: linear-gradient(135deg, #0f1b2d 0%, #1a2f4e 100%);
      padding: 36px 28px 32px;
      text-align: center;
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 22px;
    }

    .logo img {
      height: 40px;
    }

    .email-header h2 {
      font-family: 'Sora', sans-serif;
      color: #fff;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .email-header p {
      color: #8ba3c7;
      font-size: 13px;
    }

    .email-body {
      padding: 28px 28px 36px;
    }

    .badge {
      display: inline-block;
      background: #eef2ff;
      color: #2e6be6;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 20px;
      margin-bottom: 16px;
    }

    .greeting {
      font-family: 'Sora', sans-serif;
      font-size: 20px;
      font-weight: 700;
      color: #0f1b2d;
      margin-bottom: 10px;
    }

    .body-text {
      font-size: 13.5px;
      color: #5a6a82;
      line-height: 1.65;
      margin-bottom: 24px;
    }

    .otp-section .badge { margin-bottom: 14px; }

    .otp-box {
      background: #f7f9ff;
      border: 1.5px solid #dde5f7;
      border-radius: 14px;
      padding: 28px 16px;
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .otp-digit {
      font-family: 'Sora', sans-serif;
      font-size: 34px;
      font-weight: 700;
      color: #2e6be6;
      text-align: center;
      letter-spacing: 12px;
      line-height: 1;
    }

    .otp-meta {
      display: flex;
      justify-content: center;
      gap: 12px;
      font-size: 12px;
      color: #2e6be6;
      font-weight: 500;
    }
    .otp-meta span::before { content: '• '; }
    .otp-meta span:first-child::before { content: ''; }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <div class="logo">
        <img src="https://bentojo.com/logo.svg" alt="ManeJo" />
      </div>
      <h2>Verify Your Account</h2>
      <p>Complete your login by verifying your email</p>
    </div>

    <div class="email-body">
      <div class="badge">{{name}}</div>
      <p class="greeting">Hello , {{name}} !</p>
      <p class="body-text">Welcome back! please verify your email using the code below.</p>

      <div class="otp-section">
        <div class="badge">Welcome {{name}}</div>
         <div class="otp-box">
          <span class="otp-digit">{{otp}}</span>
        </div>
        <div class="otp-meta">
          <span>Valid for 15 minutes</span>
          <span>Single use only</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
