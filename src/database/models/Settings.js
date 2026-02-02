import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
    id: {
        type: String,
        default: 'bot_settings',
        unique: true
    },
    disabledCommands: {
        type: [String],
        default: []
    }
});

const Settings = mongoose.model('Settings', settingSchema);

export default Settings;
