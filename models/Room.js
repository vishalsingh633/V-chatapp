const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const roomSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
