import mongoose from 'mongoose';
const MONGO_URI = "mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse";

async function check() {
    await mongoose.connect(MONGO_URI);
    const users = await mongoose.connection.collection('users').find({ phone: /7879363299/ }).toArray();
    console.log('Search Result:', JSON.stringify(users, null, 2));
    process.exit();
}
check();
