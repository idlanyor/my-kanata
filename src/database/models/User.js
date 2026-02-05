import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: ''
    },
    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin']
    },
    balance: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

export default User;
