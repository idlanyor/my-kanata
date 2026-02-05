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
    },
    mode: {
        type: String,
        default: 'public' // 'self', 'public', 'group'
    },
    autoStatusRead: {
        type: Boolean,
        default: false
    },
    autoAiPrivate: {
        type: Boolean,
        default: false
    },
    privateAiPersona: {
        type: String,
        default: 'Kamu adalah KanataBot, asisten pribadi AI yang cerdas.'
    }
});

const Settings = mongoose.model('Settings', settingSchema);

export default Settings;