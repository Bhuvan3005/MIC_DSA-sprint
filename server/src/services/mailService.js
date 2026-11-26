const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
if (env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
}

const mailEnabled = () => !!transporter;

async function sendPasswordReset(to, name, link) {
  if (!transporter) {
    // No SMTP configured: log the link for local development only.
    if (!env.isProd && !env.isTest) console.log(`[mail disabled] Password reset link for ${to}: ${link}`);
    return false;
  }
  await transporter.sendMail({
    from: env.MAIL_FROM, to, subject: 'Reset your CodeSprint password',
    text: `Hi ${name},\n\nReset your password using this link (valid for 30 minutes):\n${link}\n\nIf you did not request this, ignore this email.`,
  });
  return true;
}

module.exports = { sendPasswordReset, mailEnabled };
