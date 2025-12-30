/**
 * Email service using Nodemailer with Gmail
 */

const nodemailer = require("nodemailer");

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection on startup (optional, logs errors)
async function verifyConnection() {
  try {
    await transporter.verify();
    console.log("✓ Email service connected and ready");
    return true;
  } catch (error) {
    console.error("⚠ Email service error:", error.message);
    console.error("  Check EMAIL_USER and EMAIL_PASS in your .env file");
    return false;
  }
}

/**
 * Send verification email to new user
 */
async function sendVerificationEmail(email, token, username) {
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Verify your Tarot Tracker account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7b2cbf;">🔮 Welcome to Tarot Tracker!</h1>
        <p>Hi ${username},</p>
        <p>Thanks for creating an account. Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 25px;
                    font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't create an account with Tarot Tracker, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `
Welcome to Tarot Tracker!

Hi ${username},

Thanks for creating an account. Please verify your email address by visiting:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with Tarot Tracker, you can safely ignore this email.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Verification email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `✗ Failed to send verification email to ${email}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, token, username) {
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Reset your Tarot Tracker password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7b2cbf;">🔮 Password Reset Request</h1>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 25px;
                    font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
        </p>
      </div>
    `,
    text: `
Password Reset Request

Hi ${username},

We received a request to reset your password. Visit this link to create a new password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✓ Password reset email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `✗ Failed to send password reset email to ${email}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Send notification when admin manually verifies a user
 */
async function sendAdminVerifiedEmail(email, username) {
  const baseUrl = process.env.BASE_URL || "http://localhost:5173";

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "Your Tarot Tracker account has been verified!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #7b2cbf;">🔮 Account Verified!</h1>
        <p>Hi ${username},</p>
        <p>Great news! Your Tarot Tracker account has been verified by an administrator.</p>
        <p>You can now sign in and start tracking your tarot readings.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${baseUrl}" 
             style="background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 25px;
                    font-weight: bold;">
            Sign In Now
          </a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          Happy reading! ✨
        </p>
      </div>
    `,
    text: `
Account Verified!

Hi ${username},

Great news! Your Tarot Tracker account has been verified by an administrator.

You can now sign in and start tracking your tarot readings at:
${baseUrl}

Happy reading! ✨
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✓ Admin verified notification sent to ${email}: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(
      `✗ Failed to send admin verified notification to ${email}:`,
      error.message,
    );
    throw error;
  }
}

module.exports = {
  verifyConnection,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminVerifiedEmail,
};
