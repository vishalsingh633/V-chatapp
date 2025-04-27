const nodemailer = require('nodemailer');

async function sendOtpMail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS      // use App Password, not your main one
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOtpMail;
