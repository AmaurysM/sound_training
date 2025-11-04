// src/lib/email.ts

import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // use App Password, not your real one
  },
});

export async function sendRegistrationEmail(email: string, username: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const link = `${baseUrl}/register?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"SAS NATA Training" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Complete Your SAS NATA Training Account Registration",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #1a1a1a; margin: 0; font-size: 24px; }
            .info-box {
              background-color: #f8f9fa;
              border-left: 4px solid #1a1a1a;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .button {
              display: inline-block;
              padding: 14px 28px;
              background-color: #1a1a1a;
              color: #ffffff !important;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover { background-color: #2a2a2a; }
            .footer {
              text-align: center;
              color: #666;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
            .link-text {
              word-break: break-all;
              color: #666;
              font-size: 12px;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Welcome to NATA Training</h1>
            </div>
            
            <div class="content">
              <p>Hello,</p>
              
              <p>You've been invited to join the NATA Training platform.</p>
              
              <div class="info-box">
                <p><strong>Your username:</strong> <code>${username}</code></p>
                <p>You'll need this username to sign in after you set your password.</p>
              </div>
              
              <p>To complete your registration and set up your account, please click the button below:</p>
              
              <div style="text-align: center;">
                <a href="${link}" class="button">Complete Registration</a>
              </div>
              
              <div class="info-box">
                <strong>⏰ Important:</strong> This registration link will expire in 7 days for security purposes.
              </div>
              
              <p>If you're having trouble with the button above, copy and paste this link into your browser:</p>
              <div class="link-text">${link}</div>
            </div>
            
            <div class="footer">
              <p>If you didn't expect this email, please disregard it or contact your administrator.</p>
              <p>&copy; ${new Date().getFullYear()} NATA Training. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Welcome to NATA Training!

Your username: ${username}

You've been invited to join the NATA Training platform. To complete your registration, please visit this link:

${link}

This link will expire in 7 days.

If you didn't expect this email, please disregard it or contact your administrator.

© ${new Date().getFullYear()} NATA Training
      `,
    });

    console.log("Registration email sent successfully to:", email);
  } catch (error) {
    console.error("Error sending registration email:", error);
    throw new Error("Failed to send registration email");
  }
}
