/*const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const User = require('../models/User');
const bcrypt = require('bcrypt');
// Dashboard Page
router.get('/dashboard', async (req, res) => {
  const rooms = await Room.find({}); // Optional: Only show rooms user can access
  res.render('dashboard', { rooms });
});

// Host Room (GET)
router.get('/host', (req, res) => {
  res.render('host');
});

// Host Room (POST)
router.post('/host', async (req, res) => {
  const { name, password } = req.body;
  try {
    const room = new Room({
      name,
      password,
      admin: req.session.user._id,
      members: [req.session.user._id]
    });
    await room.save();
    res.redirect(`/room/chat/${room._id}`);
  } catch (err) {
    res.send('Error creating room');
  }
});

// Join Room (GET)
router.get('/join', (req, res) => {
  res.render('join');
});

// Handle Join Room Submission (by name + password)
router.post('/join', async (req, res) => {
  const { name, password } = req.body;

  try {
    const room = await Room.findOne({ name });
    if (!room) {
      return res.send('❌ Room not found');
    }

    const passwordMatch = await bcrypt.compare(password, room.password);
    if (!passwordMatch) {
      return res.send('❌ Incorrect password');
    }

    const userId = req.session.user._id;

    // Already a member
    if (room.members.includes(userId)) {
      return res.redirect(`/room/chat/${room._id}`);
    }

    // Already in pending list
    if (!room.pending.includes(userId)) {
      room.pending.push(userId);
      await room.save();
    }

    // Redirect to waiting page
    return res.redirect(`/room/wait/${room._id}`);

  } catch (err) {
    console.error(err);
    return res.status(500).send('❌ Server error');
  }
});

router.get('/wait/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('pending');
  if (!room) return res.send('Room not found');

  res.render('waiting', {
    room,
    user: req.session.user // ✅ important
  });
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
*/

const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const bcrypt = require('bcrypt');
const User = require('../models/User');
// Dashboard Page
// Dashboard Page
router.get('/dashboard', async (req, res) => {
  const rooms = await Room.find({})
    .populate('admin')        // populate admin user
    .populate('members');     // populate members
  res.render('dashboard', { rooms, currentUser: req.session.user });
});


// Host Room (GET)
router.get('/host', (req, res) => {
  res.render('host');
});

// Host Room (POST) — using plain text password
router.post('/host', async (req, res) => {
  const { name, password } = req.body;
  try {
    const room = new Room({
      name,
      password, // plain text
      admin: req.session.user._id,
      members: [req.session.user._id]
    });
    await room.save();
    res.redirect(`/room/chat/${room._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating room');
  }
});

router.get('/join', (req, res) => {
  res.render('room/join');
});


router.post('/join', async (req, res) => {
  const { name, password } = req.body;

  if (!name || !password) {
    return res.render('room/join', { error: 'Room name and password are required' });
  }

  try {
    const room = await Room.findOne({ name });
    if (!room) {
      return res.render('room/join', { error: '❌ Room not found' });
    }

    // Plain text comparison
    if (password !== room.password) {
      return res.render('room/join', { error: '❌ Incorrect password' });
    }

    const userId = req.session.user._id;
    const isAlreadyMember = room.members.some(memberId => memberId.equals(userId));

    if (!isAlreadyMember) {
      room.members.push(userId);
      await room.save();
    }

    res.redirect(`/room/chat/${room._id}`);

  } catch (err) {
    console.error(err);
    res.status(500).render('room/join', { error: '❌ Server error' });
  }
});



// Chat Room
router.get('/chat/:roomId', async (req, res) => {
  const room = await Room.findById(req.params.roomId).populate('members');
  if (!room) return res.send('Room not found');

  const userId = req.session.user._id;
  const isMember = room.members.some(member => member._id.equals(userId));
  if (!isMember) return res.send('You are not a member of this room.');

  res.render('chat', { room, user: req.session.user });
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

router.post('/exit/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const userId = req.session.user._id;

  try {
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).send('Room not found');

    // Remove user from members
    room.members = room.members.filter(id => id.toString() !== userId);
    await room.save();

    res.status(200).send("Exited room");
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
