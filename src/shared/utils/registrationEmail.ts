export const registerEmail = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Account</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #F8FAFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #DBEAFE; }
    .header { background: #2563EB; padding: 36px 40px; text-align: center; }
    .header-icon { width: 56px; height: 56px; background: rgba(255,255,255,0.15); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 600; letter-spacing: -0.3px; }
    .header p { color: #BFDBFE; font-size: 14px; margin-top: 6px; }
    .steps { display: flex; justify-content: center; gap: 6px; margin-top: 20px; }
    .step { height: 4px; border-radius: 99px; background: rgba(255,255,255,0.3); width: 32px; }
    .step.active { background: #ffffff; }
    .body { padding: 40px; }
    .welcome-badge { display: inline-block; background: #DBEAFE; color: #1D4ED8; font-size: 12px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; padding: 5px 12px; border-radius: 99px; margin-bottom: 20px; }
    .greeting { font-size: 20px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 32px; }
    .otp-label { font-size: 12px; font-weight: 600; color: #2563EB; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px; }
    .otp-box { background: #DBEAFE; border: 1.5px solid #BFDBFE; border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 8px; }
    .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1D4ED8; font-family: 'Courier New', monospace; }
    .otp-note { font-size: 12px; color: #2563EB; text-align: center; margin-bottom: 32px; }
    .divider { height: 1px; background: #DBEAFE; margin: 0 0 28px; }
    .features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
    .feature { display: flex; align-items: flex-start; gap: 12px; }
    .feature-dot { width: 8px; height: 8px; border-radius: 50%; background: #2563EB; margin-top: 6px; flex-shrink: 0; }
    .feature-text { font-size: 13px; color: #475569; line-height: 1.6; }
    .feature-text strong { color: #1e293b; }
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
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M22 4L12 14.01L9 11.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <h1>Verify Your Account</h1>
        <p>One last step to get you started</p>
        <div class="steps">
          <div class="step"></div>
          <div class="step active"></div>
          <div class="step"></div>
        </div>
      </div>

      <div class="body">
        <span class="welcome-badge">Welcome aboard</span>
        <h2 class="greeting">Hello, {{name}}!</h2>
        <p class="message">
          Thanks for creating your account. To activate it and keep things secure, please verify your email address using the code below.
        </p>

        <p class="otp-label">Verification code</p>
        <div class="otp-box">
          <div class="otp-code">{{code}}</div>
        </div>
        <p class="otp-note">Valid for 15 minutes &nbsp;·&nbsp; Single use only</p>

        <div class="divider"></div>

        <div class="features">
          <div class="feature">
            <div class="feature-dot"></div>
            <p class="feature-text"><strong>Keep it private</strong> — Never share this code with anyone, including our support team.</p>
          </div>
          <div class="feature">
            <div class="feature-dot"></div>
            <p class="feature-text"><strong>Didn't sign up?</strong> — You can safely ignore this email. No account will be created without verification.</p>
          </div>
          <div class="feature">
            <div class="feature-dot"></div>
            <p class="feature-text"><strong>Code expired?</strong> — Return to the registration page and request a new code.</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>
          You're receiving this because an account was registered with this email.<br/>
          Questions? <a href="#">Contact support</a> &nbsp;·&nbsp; <a href="#">Privacy Policy</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
