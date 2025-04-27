/*import mongoose from 'mongoose'

const userModel = new mongoose.Schema({
    username:{type:String},
    email:{type:String},
    password:{type:String},
    otp:{type:Number, required: true}
})

const Userclass = mongoose.model('users',userModel);
export default Userclass*/



const mongoose = require("mongoose");

const userSchema = mongoose.Schema({

    email: String,
    password: String
})

const UserModel = mongoose.model("user", userSchema)


module.exports = {
    UserModel
}