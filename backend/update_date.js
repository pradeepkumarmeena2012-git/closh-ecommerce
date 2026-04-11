import mongoose from 'mongoose';

mongoose.connect('mongodb+srv://mayurchadokar14_db_user:sORqnMJxbSjnstzY@cluster0.ueig0du.mongodb.net/clouse').then(async () => {
    const Campaign = mongoose.model('Campaign', new mongoose.Schema({}, { strict: false }));
    
    // Set all campaigns start date to 1 month ago
    const earlyDate = new Date();
    earlyDate.setMonth(earlyDate.getMonth() - 1);

    const result = await Campaign.updateMany({}, {
        $set: { startDate: earlyDate }
    });
    
    console.log(`Updated ${result.modifiedCount} campaigns successfully`);
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
