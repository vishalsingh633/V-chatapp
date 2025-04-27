
// Entry: app.js
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/room');
const { isAuthenticated } = require('./middleware/auth');

const User = require('./models/User');
const Room = require('./models/Room');


const app = express();
const server = http.createServer(app);
const io = new Server(server);


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'superSecret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1 day
  })
}));


app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use('/', authRoutes);
app.use('/room', isAuthenticated, roomRoutes);

const activeRooms = {}; // { roomId: { members: [], pending: [], adminId } }

io.on('connection', socket => {
  socket.on('join-request', async ({ roomId, user }) => {
    const room = await Room.findById(roomId);
    if (room && !room.members.includes(user._id)) {
      if (!room.pending.includes(user._id)) {
        room.pending.push(user._id);
        await room.save();
        io.to(roomId).emit('pending-requests', room.pending);
      }
    }
    
  });

  socket.on('approve-user', async ({ roomId, userId }) => {
    const room = await Room.findById(roomId);
    if (room) {
      room.pending = room.pending.filter(id => id.toString() !== userId);
      room.members.push(userId);
      await room.save();
      io.to(roomId).emit('user-approved', userId);
    }
  });

  socket.on('join-room', async ({ roomId, user }) => {
    socket.join(roomId);
  
    const room = await Room.findById(roomId).populate('members', 'username');
    if (room && !room.members.find(u => u._id.toString() === user._id)) {
      room.members.push(user._id);
      await room.save();
    }
  
    const updatedRoom = await Room.findById(roomId).populate('members', 'username');
  
    io.to(roomId).emit('user-joined', user);

    io.to(roomId).emit('update-members', updatedRoom.members);

  });
  
  socket.on('send-message', ({ roomId, message, user }) => {
    io.to(roomId).emit('receive-message', { message, user });
  });

  socket.on('end-room', async (roomId) => {
    const room = await Room.findById(roomId);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    // Emit event to inform users that the room has ended
    io.to(roomId).emit('room-ended');
    
    // Optionally, you can remove the room from the database if needed
    await Room.findByIdAndDelete(roomId);

    console.log(`Room ${roomId} ended`);
  });

  

 
  socket.on("leave-room", ({ roomId, user }) => {
    socket.to(roomId).emit("user-left", user);
  });
  


});


server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});


