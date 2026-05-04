import mongoose from 'mongoose';

const connectDB = async (uri) => {
    try {
        const dbUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/mywhatsappbot';
        await mongoose.connect(dbUri, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log(' Connected to MongoDB');
    } catch (error) {
        console.error(' Could not connect to MongoDB:', error);
        process.exit(1);
    }
};

export default connectDB;
