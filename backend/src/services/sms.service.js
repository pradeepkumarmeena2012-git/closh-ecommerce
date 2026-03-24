/**
 * SMS India Hub — OTP delivery service
 * Docs: https://www.smsindiahub.in/api
 *
 * Required env vars:
 *   SMS_INDIA_HUB_API_KEY   — your API key from SMS India Hub dashboard
 *   SMS_INDIA_HUB_SENDER    — approved 6-char sender ID  (e.g. CLOUSE)
 *   SMS_INDIA_HUB_TEMPLATE  — DLT-approved template ID  (numeric string)
 */

import https from 'https';
import { URL } from 'url';

const API_BASE = 'https://msgclub.smsindiahub.in/api/sendhttp.php';

/**
 * Send a transactional SMS OTP via SMS India Hub
 *
 * @param {string} mobile  - 10-digit Indian mobile number (no country code)
 * @param {string} otp     - 6-digit OTP string
 * @returns {Promise<void>}
 */
export const sendSmsOtp = async (mobile, otp) => {
    const apiKey = process.env.SMS_INDIA_HUB_API_KEY;
    const sender = process.env.SMS_INDIA_HUB_SENDER;
    const templateId = process.env.SMS_INDIA_HUB_TEMPLATE;

    if (!apiKey || !sender || !templateId) {
        throw new Error('[SMS] SMS India Hub credentials not configured. Set SMS_INDIA_HUB_API_KEY, SMS_INDIA_HUB_SENDER, and SMS_INDIA_HUB_TEMPLATE in .env');
    }

    // Ensure mobile is exactly 10 digits
    const normalizedMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (normalizedMobile.length !== 10) {
        throw new Error(`[SMS] Invalid mobile number: ${mobile}`);
    }

    const message = `Your Clouse verification code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;

    const url = new URL(API_BASE);
    url.searchParams.set('authkey', apiKey);
    url.searchParams.set('mobiles', `91${normalizedMobile}`);  // Add country code
    url.searchParams.set('message', message);
    url.searchParams.set('sender', sender);
    url.searchParams.set('route', '4');           // Route 4 = transactional
    url.searchParams.set('country', '91');
    url.searchParams.set('DLT_TE_ID', templateId);

    return new Promise((resolve, reject) => {
        const req = https.get(url.toString(), (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                // SMS India Hub returns a pipe-delimited response
                // e.g. "1701429698|<messageId>" on success
                // or  "ERROR|<description>" on failure
                if (data.startsWith('ERROR') || data.toLowerCase().includes('error')) {
                    console.error(`[SMS] SMS India Hub error: ${data}`);
                    reject(new Error(`SMS delivery failed: ${data}`));
                } else {
                    console.log(`[SMS] OTP sent to 91${normalizedMobile}. Response: ${data.trim()}`);
                    resolve(data.trim());
                }
            });
        });

        req.on('error', (err) => {
            console.error('[SMS] Request error:', err.message);
            reject(err);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('[SMS] Request timed out after 10s'));
        });
    });
};
