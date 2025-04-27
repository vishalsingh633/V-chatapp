const express = require('express');
const router = express.Router();
const User = require('../models/User');
const sendOtpMail = require('../utils/sendOtp');
// GET: Signup Page
router.get('/signup', (req, res) => {
  res.render('signup');
});

router.get('/', (req, res) => {
  res.redirect('/login'); // or maybe render a home page
});


// POST: Signup User
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) return res.send('User already exists');

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  req.session.pendingUser = { username, email, password };
  req.session.otp = otp;

  await sendOtpMail(email, otp);
  res.redirect('/verify-otp');
});

// GET OTP page
router.get('/verify-otp', (req, res) => {
  if (!req.session.pendingUser) return res.redirect('/signup');
  res.render('otp');
});

// POST OTP check
router.post('/verify-otp', async (req, res) => {
  const { otp } = req.body;
  if (otp === req.session.otp) {
    const { username, email, password } = req.session.pendingUser;
    const user = new User({ username, email, password });
    await user.save();

    req.session.user = {
      _id: user._id,
      email: user.email,
      username: user.username
    };

    delete req.session.otp;
    delete req.session.pendingUser;

    res.redirect('/room/dashboard');
  } else {
    res.send('Invalid OTP');
  }
});



// GET: Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// POST: Login User

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.send('User not found');

    const match = await user.comparePassword(password);
    if (!match) return res.send('Incorrect password');

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await user.save();

    // TODO: Send OTP via email (use nodemailer)
    await sendOtpMail(email, otp);// 🎉 send OTP by email

    // Store userId in session temporarily
    req.session.tempUser = user._id;

    res.redirect('/verify-login-otp');

  } catch (err) {
    console.error(err);
    res.send('Error during login');
  }
  
});

// GET: Show OTP verification form
router.get('/verify-login-otp', (req, res) => {
  if (!req.session.tempUser) return res.redirect('/login');
  res.render('verify-otp');
});

// POST: Verify OTP
router.post('/verify-lotp', async (req, res) => {
  const userId = req.session.tempUser;
  const { otp } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.send('Invalid or expired OTP');
    }

    // Clear OTP & login
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    req.session.user = {
      _id: user._id,
      email: user.email,
      username: user.username
    };
    req.session.tempUser = undefined;

    res.redirect('/room/dashboard');

  } catch (err) {
    console.error(err);
    res.send('Error verifying OTP');
  }
});

// GET: Logout
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login');
  });
});

module.exports = router;
