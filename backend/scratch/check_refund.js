import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

rzp.refunds.fetch('rfnd_T2g7UCGlRMXol4')
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .catch(console.error);
