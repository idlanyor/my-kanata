import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const connectDB = async (uri) => {
    try {
        const dbUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/mywhatsappbot';
        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 10000,
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
        });
        logger.info(' Connected to MongoDB');
    } catch (error) {
        logger.error(' Could not connect to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;
