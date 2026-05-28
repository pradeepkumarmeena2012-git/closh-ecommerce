import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

const cleanDuplicateVendors = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/closh');
        console.log('Connected to DB');

        const Vendor = mongoose.model('Vendor', new mongoose.Schema({}, { strict: false }));

        // Get all vendors
        const vendors = await Vendor.find({});
        console.log(`Analyzing ${vendors.length} vendors...`);

        // Group by phone
        const phoneGroups = {};
        vendors.forEach(v => {
            if (v.phone) {
                const phone = String(v.phone).trim();
                if (!phoneGroups[phone]) {
                    phoneGroups[phone] = [];
                }
                phoneGroups[phone].push(v);
            }
        });

        for (const [phone, group] of Object.entries(phoneGroups)) {
            if (group.length > 1) {
                console.log(`Duplicate found for phone: "${phone}" (${group.length} vendors)`);

                // Sort: 
                // 1. isVerified = true first
                // 2. status = approved first
                // 3. updatedAt / createdAt latest first
                group.sort((a, b) => {
                    if (a.isVerified !== b.isVerified) {
                        return a.isVerified ? -1 : 1;
                    }
                    if (a.status === 'approved' && b.status !== 'approved') return -1;
                    if (b.status === 'approved' && a.status !== 'approved') return 1;
                    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
                });

                // The first one is the winner to keep
                const winner = group[0];
                console.log(`  Winner to keep: ID ${winner._id}, Email ${winner.email}, Status ${winner.status}, Verified ${winner.isVerified}`);

                // For the rest, append a suffix to phone so it is unique
                for (let i = 1; i < group.length; i++) {
                    const dup = group[i];
                    const newPhone = `${phone}-dup-${String(dup._id).slice(-4)}`;
                    console.log(`  Updating duplicate vendor ID ${dup._id}, Email ${dup.email} phone: "${dup.phone}" -> "${newPhone}"`);
                    await Vendor.findByIdAndUpdate(dup._id, { phone: newPhone });
                }
            }
        }

        // Drop the old index if it exists and let mongoose recreate it
        console.log('Syncing database indexes...');
        try {
            await mongoose.connection.db.collection('vendors').dropIndex('phone_1');
            console.log('Successfully dropped old phone index.');
        } catch (e) {
            console.log('No existing phone index to drop or could not drop: ' + e.message);
        }

        console.log('Database index rebuild complete.');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
    }
};

cleanDuplicateVendors();
