/**
 * SMS India Hub — OTP delivery service
 * Docs: https://www.smsindiahub.in/api
 *
 * Required env vars:
 *   SMS_INDIA_HUB_API_KEY   — your API key from SMS India Hub dashboard
 *   SMS_INDIA_HUB_SENDER    — approved 6-char sender ID  (e.g. CLOUSE)
 *   SMS_INDIA_HUB_TEMPLATE  — DLT-approved template ID  (numeric string)
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const API_BASE = 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx';

/**
 * Send a transactional SMS via SMS India Hub (DLT-compliant)
 * @param {string} mobile - 10-digit mobile number
 * @param {string} otp    - The OTP to send
 * @returns {Promise<string>}
 */
/**
 * Send a generic SMS via SMS India Hub (DLT-compliant)
 * @param {string} mobile  - 10-digit mobile number
 * @param {string} message - The approved DLT message text
 * @returns {Promise<string>}
 */
export const sendSms = async (mobile, message) => {
    const apiKey = process.env.SMS_INDIA_HUB_API_KEY;
    const sender = process.env.SMS_INDIA_HUB_SENDER;
    const templateId = process.env.SMS_INDIA_HUB_TEMPLATE;
    const peId = process.env.SMS_INDIA_HUB_PE_ID;

    if (!apiKey || !sender) {
        throw new Error('[SMS] Missing SMSIndiaHub configuration: SMS_INDIA_HUB_API_KEY or SMS_INDIA_HUB_SENDER');
    }

    const normalizedMobile = String(mobile || '').replace(/\D/g, '').slice(-10);
    if (normalizedMobile.length !== 10) {
        throw new Error(`[SMS] Invalid mobile number: ${mobile}`);
    }

    const url = new URL(API_BASE);
    url.searchParams.set('APIKey', apiKey);
    url.searchParams.set('sid', sender);
    url.searchParams.set('msisdn', `91${normalizedMobile}`);
    url.searchParams.set('msg', message);
    url.searchParams.set('fl', '0');
    url.searchParams.set('gwid', '2');

    // Optional DLT Fields - Only add if provided in .env
    if (templateId && templateId !== 'your_dlt_template_id') {
        url.searchParams.set('DLT_TE_ID', templateId);
    }

    if (peId && peId !== 'your_principal_entity_id') {
        url.searchParams.set('DLT_PE_ID', peId);
    }

    if (process.env.NODE_ENV !== 'production') {
        console.log(`[SMS][Debug] Sending to 91${normalizedMobile} | Sender: ${sender} | DLT_TE: ${templateId || 'None'}`);
    }

    return new Promise((resolve, reject) => {
        const client = url.protocol === 'https:' ? https : http;
        const req = client.get(url.toString(), (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                const responseStr = data.trim();
                console.log(`[SMS] Response: ${responseStr}`);

                try {
                    // Attempt JSON parse first
                    const json = JSON.parse(responseStr);
                    if (json.ErrorCode === '000' || json.ErrorMessage === 'Done') {
                        return resolve(responseStr);
                    }
                } catch (e) {
                    // Fallback to text check for pushsms.aspx (which returns JobId or TransactionId)
                    if (responseStr.toLowerCase().includes('jobid') || responseStr.match(/^\d+$/)) {
                        console.log(`[SMS][Success] Message queued. Response: ${responseStr}`);
                        return resolve(responseStr);
                    }
                }

                if (responseStr.toLowerCase().includes('error') || responseStr.includes('Failed')) {
                    return reject(new Error(`SMS India Hub Error: ${responseStr}`));
                }

                resolve(responseStr);
            });
        });

        req.on('error', (err) => reject(err));
        req.setTimeout(10000, () => {
            req.destroy();
            reject(new Error('[SMS] Timeout'));
        });
    });
};

/**
 * Send an OTP SMS
 * @param {string} mobile 
 * @param {string} otp 
 */
export const sendSmsOtp = async (mobile, otp) => {
    // CRITICAL: This text MUST match your DLT approved template EXACTLY.
    // Ensure the message format provided by the user is used.
    const message = `Welcome to the Closh powered by SMSINDIAHUB. Your OTP for registration is ${otp}`;
    return sendSms(mobile, message);
};

