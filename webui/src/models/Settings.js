import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
    id: { type: String, default: 'bot_settings', unique: true },
    disabledCommands: { type: [String], default: [] },
    mode: { type: String, default: 'public' },
    autoStatusRead: { type: Boolean, default: false },
    autoAiPrivate: { type: Boolean, default: false },
    privateAiPersona: { type: String, default: 'Kamu adalah KanataBot, asisten pribadi AI yang cerdas.' },
    mustJoinGroup: { type: Boolean, default: false },
    smartMode: { type: Boolean, default: false },
    groupInviteLink: { type: String, default: '' }
});

export const Settings = mongoose.model('Settings', settingSchema);
