import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    eventId: { type: String, required: true, unique: true },
    chat: { type: String, required: true },
    name: { type: String, required: true },
    messageSecret: { type: Buffer, required: true },
    createdAt: { type: Date, default: Date.now, expires: 2592000 } // Simpan 30 hari
});

const Event = mongoose.model('Event', eventSchema);
export default Event;
