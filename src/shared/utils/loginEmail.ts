export const loginEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Login OTP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #F8FAFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #DBEAFE; }
    .header { background-color: #2563EB; padding: 36px 40px; text-align: center; }
    .header-icon { width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
    .header p { color: #BFDBFE; font-size: 14px; margin-top: 6px; }
    .body { padding: 40px; }
    .greeting { font-size: 16px; color: #1e293b; margin-bottom: 16px; }
    .greeting span { font-weight: 600; }
    .message { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 32px; }
    .otp-label { font-size: 12px; font-weight: 600; color: #2563EB; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px; }
    .otp-box { background: #DBEAFE; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 8px; }
    .otp-code { font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #1D4ED8; font-family: 'Courier New', monospace; }
    .otp-note { font-size: 12px; color: #2563EB; text-align: center; margin-bottom: 32px; }
    .divider { height: 1px; background: #DBEAFE; margin: 0 0 32px; }
    .warning { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 16px; display: flex; gap: 12px; margin-bottom: 32px; }
    .warning-icon { font-size: 16px; flex-shrink: 0; }
    .warning-text { font-size: 13px; color: #92400E; line-height: 1.6; }
    .footer { padding: 24px 40px; background: #F8FAFF; border-top: 1px solid #DBEAFE; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; line-height: 1.7; }
    .footer a { color: #2563EB; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10 17L15 12L10 7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M15 12H3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Login Verification</h1>
        <p>Confirm your identity to continue</p>
      </div>

      <div class="body">
        <p class="greeting">Hi, <span>{{name}}</span></p>
        <p class="message">
          We received a login request for your account. Use the one-time code below to complete your sign-in. This code is valid for <strong>10 minutes</strong>.
        </p>

        <p class="otp-label">Your login code</p>
        <div class="otp-box">
          <div class="otp-code">{{code}}</div>
        </div>
        <p class="otp-note">Expires in 10 minutes &nbsp;·&nbsp; Do not share this code</p>

        <div class="divider"></div>

        <div class="warning">
          <span class="warning-icon">⚠️</span>
          <p class="warning-text">
            If you did not attempt to log in, please ignore this email and consider changing your password immediately. We will never ask you for this code.
          </p>
        </div>
      </div>

      <div class="footer">
        <p>
          This is an automated message from our security system.<br/>
          Need help? <a href="#">Contact support</a> &nbsp;·&nbsp; <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
