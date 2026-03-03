import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
    jid: { type: String, required: true, unique: true },
    name: { type: String, default: '' },
    announce: { type: Boolean, default: false },
    restrict: { type: Boolean, default: false },
    // Bot policies
    antilink: { type: Boolean, default: false },
    antitoxic: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },
    left: { type: Boolean, default: false },
    nsfw: { type: Boolean, default: false },
    mute: { type: Boolean, default: false },
    prayerReminder: { type: Boolean, default: false },
    cityId: { type: String, default: '1420' },
    cityName: { type: String, default: 'KAB. PURBALINGGA' },
    welcomeMsg: { type: String, default: 'Selamat datang @user di grup @group!' },
    leaveMsg: { type: String, default: 'Selamat tinggal @user, semoga tenang di sana!' },
    createdAt: { type: Date, default: Date.now }
});

export const Group = mongoose.model('Group', groupSchema);
