const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const router = express.Router();

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Restrict Unauthenticated Access
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'Unauthorized access! Please log in.');
        return res.redirect('/login');
    }
    next();
};

/* Home Route
router.get('/', (req, res) => {
    res.render('index', { message: req.flash('message') });
});*/

// Sign Up Route
router.get('/signup', (req, res) => {
    res.render('register', { message: req.flash('message') });
  });
  

router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
        req.flash('error', 'User already exists!');
        return res.redirect('/signup');
    }

    const newUser = new User({ username, email, password });

    const otp = crypto.randomInt(100000, 999999).toString();
    newUser.otp = otp;
    newUser.otpExpires = Date.now() + 300000;

    await newUser.save();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify Your Email',
        text: `Your OTP code is: ${otp}. It will expire in 5 minutes.`
    };

    transporter.sendMail(mailOptions, (error) => {
        if (error) {
            req.flash('error', 'Error sending OTP!');
            return res.redirect('/signup');
        }
      
        return res.render('otp', { email: email, message: 'OTP sent to your email! Please enter the OTP below to verify your email.' });
    });
});

// OTP Verification
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.send('User not found!');
      }
    
      // Check if OTP is valid and not expired
      if (user.otp === otp && Date.now() < user.otpExpires) {
        user.isVerified = true;
        user.otp = undefined; // Clear OTP after verification
        user.otpExpires = undefined; // Clear OTP expiration time
        await user.save();
        return res.send('Email successfully verified! You can now log in.');
      } else {
        return res.send('Invalid OTP or OTP has expired');
      }
  
});

// Login Route
router.get('/login', (req, res) => {
    res.render('login', { message: req.flash('message') });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.flash('error', 'Invalid email or password!');
        return res.redirect('/login');
    }

    req.session.user = user;
    req.flash('message', 'Login successful!');
    res.redirect('/dashboard');
});

// Dashboard (Restricted Access)
router.get('/dashboard', requireAuth, (req, res) => {
    res.render('success', { user: req.session.user });
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = router;
