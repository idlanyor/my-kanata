import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    antilink: {
        type: Boolean,
        default: false
    },
    antitoxic: {
        type: Boolean,
        default: false
    },
    welcome: {
        type: Boolean,
        default: false
    },
    left: {
        type: Boolean,
        default: false
    },
    nsfw: {
        type: Boolean,
        default: false
    },
    mute: {
        type: Boolean,
        default: false
    },
    welcomeMsg: {
        type: String,
        default: 'Selamat datang @user di grup @group!'
    },
    leaveMsg: {
        type: String,
        default: 'Selamat tinggal @user, semoga tenang di sana!'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Group = mongoose.model('Group', groupSchema);

export default Group;
