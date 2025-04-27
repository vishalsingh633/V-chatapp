const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const bcrypt = require('bcrypt');
const { isAuthenticated } = require('../middleware/auth');

// GET: Dashboard
router.get('/dashboard', async (req, res) => {
  const rooms = await Room.find({
    $or: [{ admin: req.session.user._id }, { members: req.session.user._id }]
  });
  res.render('dashboard', { rooms });
});

// GET: Create Room Form
router.get('/host', (req, res) => {
  res.render('host');
});


router.get('/join', (req, res) => {
    res.render('join');
  });



// POST: Create Room
router.post('/host', async (req, res) => {
  const { name, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const room = new Room({
    name,
    password: hashedPassword,
    admin: req.session.user._id,
    members: [],
    pending: []
  });

  await room.save();
  res.redirect('/room/dashboard');
});

// Show Join Room Form by Room ID (used when user clicks Join from room list)
router.get('/join/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) return res.send('Room not found');
  res.render('join', { room });
});

// Handle Join Room Submission (room name + password method)
router.post('/join', async (req, res) => {
  const { name, password } = req.body;
  const room = await Room.findOne({ name });
  if (!room) return res.send('Room not found');

  const match = await bcrypt.compare(password, room.password);
  if (!match) return res.send('Incorrect password');

  // Add user to pending if not already member or pending
  const userId = req.session.user._id;
  if (!room.members.includes(userId) && !room.pending.includes(userId)) {
    room.pending.push(userId);
    await room.save();
  }

  res.redirect(`/room/wait/${room._id}`);
});

// Show Waiting Page (admin will approve you)
router.get('/wait/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('pending');
  if (!room) return res.send('Room not found');

  res.render('waiting', { room });
});

// Chat Room Access
router.get('/chat/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('members');
  if (!room) return res.send('Room not found');

  const userId = req.session.user._id;
  const isMember = room.members.some(member => member._id.equals(userId));
  if (!isMember) return res.send('You are not approved to join this room.');

  res.render('chat', { room });
});

// Destroy Room (Admin only)
router.post('/end/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) return res.send('Room not found');

  if (!room.admin.equals(req.session.user._id)) {
    return res.send('Only the admin can destroy the room.');
  }

  await Room.findByIdAndDelete(room._id);
  res.redirect('/room/dashboard');
});

module.exports = router;