import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'http://localhost:5001/api';

const run = async () => {
    try {
        console.log("1. Logging in Adarsh...");
        // Send OTP
        await axios.post(`${API_BASE_URL}/delivery/auth/send-otp`, { phone: '7879363299' });
        // Verify OTP
        const loginRes = await axios.post(`${API_BASE_URL}/delivery/auth/verify-otp`, {
            phone: '7879363299',
            otp: '123456'
        });
        const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
        console.log("Token received:", token ? "YES" : "NO");

        const headers = { Authorization: `Bearer ${token}` };

        console.log("\n2. Fetching /delivery/orders...");
        const ordersRes = await axios.get(`${API_BASE_URL}/delivery/orders`, {
            headers,
            params: { status: 'open' }
        });
        console.log("Orders response:", JSON.stringify(ordersRes.data, null, 2));

        console.log("\n3. Fetching /delivery/orders/dashboard-summary...");
        const summaryRes = await axios.get(`${API_BASE_URL}/delivery/orders/dashboard-summary`, {
            headers
        });
        console.log("Dashboard Summary response:", JSON.stringify(summaryRes.data, null, 2));

    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
};

run();
