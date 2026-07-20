import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicSetting } from '../../../shared/services/settingsService';
import { useSettingsStore } from '../../../shared/store/settingsStore';
import { FiChevronLeft } from 'react-icons/fi';
import PageTransition from '../../../shared/components/PageTransition';

// Initial/Fallback data in case nothing is in localStorage/Admin yet
const getLegalData = (settings) => {
    const general = settings?.general || {};
    const supportEmail = general.customerSupportEmail || "support@closh.in";
    const supportPhone = general.customerSupportPhone || "+91 (800) 111-2222";
    const address = general.address || "Mumbai, Maharashtra, India";
    const storeName = general.storeName || "CLOSH";

    return {
        'privacy': {
            title: 'Privacy Policy',
            content: `
            <div class="space-y-4 text-sm">
                <p class="text-gray-600 leading-relaxed font-medium mb-4">Your privacy is important to us. It is ${storeName}'s policy to respect your privacy regarding any information we may collect from you across our platform. This Privacy Policy applies to all delivery partners and contractors utilizing our network.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">1. Comprehensive Information Collection</h4>
                <p class="text-gray-600 leading-relaxed font-medium">When you register as a delivery partner with ${storeName}, we collect comprehensive personal details including your full legal name, residential address, contact information (phone number and email), vehicle registration details, driver's license, and government-issued ID (such as Aadhar or PAN) for background verification purposes. We also collect banking details to process your weekly settlements and payouts securely.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">2. Real-Time Tracking and Location Data</h4>
                <p class="text-gray-600 leading-relaxed font-medium">To facilitate efficient order delivery, our application requires continuous access to your device's GPS and location services while you are marked as "Active" or "On Duty". This real-time location data is used to provide accurate ETAs to customers, optimize your delivery routes, and ensure your safety during transit. Location tracking automatically ceases when you go offline.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">3. Detailed Data Utilization</h4>
                <ul class="list-disc pl-5 text-gray-600 leading-relaxed font-medium space-y-2">
                    <li><strong>Account Verification:</strong> To verify your identity, perform criminal background checks, and confirm your eligibility to perform deliveries.</li>
                    <li><strong>Operational Efficiency:</strong> To assign, dispatch, and manage delivery orders effectively based on your proximity to pickup and drop-off locations.</li>
                    <li><strong>Financial Processing:</strong> To calculate your earnings, track delivery milestones, process incentives, and facilitate timely payouts to your registered bank account.</li>
                    <li><strong>Communication:</strong> To communicate critical platform updates, safety alerts, and provide ongoing support through our help center.</li>
                    <li><strong>Performance Monitoring:</strong> To evaluate delivery metrics, customer feedback, and ensure adherence to our platform's service level agreements.</li>
                </ul>

                <h4 class="font-bold text-gray-900 mt-6 mb-2">4. Stringent Data Sharing & Security Protocols</h4>
                <p class="text-gray-600 leading-relaxed font-medium">We strictly do not sell your personal data to third parties. We only share necessary operational details (such as your first name, vehicle type, and live location) with the customer and vendor during an active order to facilitate a smooth handover. All sensitive documents (IDs, bank details) are encrypted at rest and in transit using industry-standard TLS encryption. Access to your personal data is restricted to authorized personnel only.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">5. Data Retention and Deletion Rights</h4>
                <p class="text-gray-600 leading-relaxed font-medium">You retain the right to access, update, or request the permanent deletion of your personal data by raising a ticket with our support team. Please note that certain transactional and identity data must be retained for up to 7 years to comply with local taxation laws, financial audits, and fraud-prevention mandates, even after your account has been deactivated.</p>
            </div>
        `
        },
        'terms': {
            title: 'Terms & Conditions',
            content: `
            <div class="space-y-4 text-sm">
                <p class="text-gray-600 leading-relaxed font-medium mb-4">By joining the ${storeName} Delivery Partner program and accessing our delivery application, you explicitly agree to be bound by the following comprehensive terms of service.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">1. Independent Contractor Classification</h4>
                <p class="text-gray-600 leading-relaxed font-medium">You acknowledge and agree that you operate exclusively as an independent contractor. No employment, joint venture, or agency relationship exists between you and ${storeName}. You are solely responsible for providing and maintaining your own vehicle, paying for fuel, obtaining appropriate commercial insurance, and fulfilling all local tax obligations arising from your earnings on the platform.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">2. Strict Service and Conduct Standards</h4>
                <p class="text-gray-600 leading-relaxed font-medium">You agree to execute all accepted deliveries safely, promptly, and with the highest level of professionalism. Any tampering with sealed packages, unprofessional behavior towards vendors or customers, verbal abuse, or fraudulent activity (including GPS spoofing or falsely marking orders as delivered) will result in immediate investigation and potential permanent termination of your account without prior notice.</p>
                
                <h4 class="font-bold text-gray-900 mt-6 mb-2">3. Payouts and Incentives</h4>
                <p class="text-gray-600 leading-relaxed font-medium">Delivery fees are calculated based on distance, time, and active demand. Payouts will be transferred to your verified bank account according to the platform's settlement cycle. Any discrepancies in earnings must be reported within 48 hours. ${storeName} reserves the right to modify incentive structures, delivery base pays, and penalty charges with prior notification via the partner app.</p>
            </div>
        `
        },
        'support': {
            title: 'Contact Support',
            content: `
            <div class="space-y-6">
                <p class="text-gray-600 font-medium mb-6">Our partner support team is available to assist you with any issues related to deliveries, payouts, or your account.</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <a href="mailto:${supportEmail}" class="p-6 bg-white rounded-[24px] border border-gray-100 hover:border-black transition-all group no-underline block shadow-sm hover:shadow-xl">
                        <div class="flex items-center justify-between mb-3">
                            <span class="block font-black text-[10px] uppercase text-gray-400 tracking-widest">Email Us</span>
                        </div>
                        <p class="font-black text-black text-[15px] tracking-tight group-hover:translate-x-1 transition-transform">${supportEmail}</p>
                    </a>
                    <a href="tel:${supportPhone.replace(/[^0-9+]/g, '')}" class="p-6 bg-white rounded-[24px] border border-gray-100 hover:border-black transition-all group no-underline block shadow-sm hover:shadow-xl">
                        <div class="flex items-center justify-between mb-3">
                            <span class="block font-black text-[10px] uppercase text-gray-400 tracking-widest">Call Us</span>
                        </div>
                        <p class="font-black text-black text-[15px] tracking-tight group-hover:translate-x-1 transition-transform">${supportPhone}</p>
                    </a>
                    <a href="https://wa.me/${supportPhone.replace(/[^0-9+]/g, '')}?text=Hi%20Partner%20Support" target="_blank" class="p-6 bg-green-50 rounded-[24px] border border-green-100 hover:border-green-500 transition-all group no-underline block shadow-sm hover:shadow-xl md:col-span-2">
                        <div class="flex items-center justify-between mb-3">
                            <span class="block font-black text-[10px] uppercase text-green-600 tracking-widest">WhatsApp Support</span>
                        </div>
                        <p class="font-black text-green-900 text-[15px] tracking-tight group-hover:translate-x-1 transition-transform">Chat with us instantly</p>
                    </a>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div class="p-8 bg-gray-50 rounded-[24px] border border-gray-100">
                        <h3 class="font-black text-[12px] uppercase tracking-[0.1em] mb-3 text-gray-400">Working Hours</h3>
                        <div class="space-y-2">
                            <div class="flex justify-between items-center text-sm font-medium">
                                <span class="text-gray-500">Mon - Sat</span>
                                <span class="text-gray-900">09:00 AM - 08:00 PM</span>
                            </div>
                            <div class="flex justify-between items-center text-sm font-medium">
                                <span class="text-gray-500">Sunday</span>
                                <span class="text-gray-900">10:00 AM - 04:00 PM</span>
                            </div>
                        </div>
                    </div>
                    <div class="p-8 bg-black text-white rounded-[24px] shadow-2xl relative overflow-hidden group">
                        <h3 class="font-black text-[12px] uppercase tracking-[0.1em] mb-3 text-[#ffcc00]">Headquarters</h3>
                        <p class="text-[13px] font-bold opacity-80 leading-relaxed max-w-xs">${address.replace(/\n/g, '<br/>')}</p>
                    </div>
                </div>
            </div>
        `
        }
    };
};

const DeliveryLegalPage = ({ fixedPageId }) => {
    const { pageId } = useParams();
    const effectivePageId = fixedPageId || pageId;
    const { settings, initializePublic } = useSettingsStore();
    const [pageContent, setPageContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const general = settings?.general || {};
    const supportEmail = general.customerSupportEmail || "support@closh.in";
    const supportPhone = general.customerSupportPhone || "+91 (800) 111-2222";

    const keyMap = {
        'privacy': 'delivery_privacy_policy',
        'support': 'contact_info'
    };

    useEffect(() => {
        const fetchContent = async () => {
            const legalData = getLegalData(settings);

            try {
                await initializePublic();

                const key = keyMap[effectivePageId];
                if (key) {
                    const res = await getPublicSetting(key, true);
                    const hasValidContent = (htmlString) => {
                        if (typeof htmlString !== 'string') return false;
                        const stripped = htmlString.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, '').trim();
                        return stripped.length > 10;
                    };

                    if (hasValidContent(res?.data) && !res.data.includes('<h1>Terms and Conditions</h1>')) {
                        setPageContent({
                            title: legalData[effectivePageId]?.title || 'Information',
                            content: res.data.replace(/\n/g, '<br/>')
                        });
                        setIsLoading(false);
                        return;
                    }

                    const contentRes = await getPublicSetting('content', true);
                    if (contentRes?.data && hasValidContent(contentRes.data[key])) {
                        setPageContent({
                            title: legalData[effectivePageId]?.title || 'Information',
                            content: contentRes.data[key].replace(/\n/g, '<br/>')
                        });
                        setIsLoading(false);
                        return;
                    }
                }

                setPageContent(legalData[effectivePageId] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px] ">Coming soon...</p>'
                });
            } catch (err) {
                console.error('Error fetching legal content:', err);
                const legalData = getLegalData(settings);
                setPageContent(legalData[effectivePageId] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px] ">Coming soon...</p>'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [effectivePageId]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <div className="bg-[#0f172a] text-white px-6 py-4 sticky top-0 z-50 shadow-md flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <FiChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-wide">
                            {pageContent?.title || 'Loading...'}
                        </h1>
                        <p className="text-xs text-slate-400 font-medium">Delivery Partner Program</p>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-3xl mx-auto p-6 md:p-8">
                    {isLoading && !pageContent ? (
                        <div className="p-20 text-center text-gray-400 font-bold uppercase animate-pulse">Loading...</div>
                    ) : pageContent ? (
                        <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100 animate-fadeInUp">
                            <div className="mb-10">
                                <h2 className="text-3xl md:text-4xl font-bold uppercase text-black mb-4">
                                    {pageContent.title}
                                </h2>
                                <div className="h-1.5 w-20 bg-indigo-500 rounded-full"></div>
                            </div>

                            <div
                                className="legal-rich-text text-gray-700 leading-relaxed font-medium mb-12"
                                dangerouslySetInnerHTML={{ __html: pageContent.content }}
                            />

                            {/* Need Help Block (only show for non-support pages to avoid duplication) */}
                            {effectivePageId !== 'support' && (
                                <div className="mt-12 p-8 bg-indigo-50 rounded-[24px] border border-indigo-100 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-black text-gray-900 mb-3">Need Help?</h3>
                                    <p className="text-sm font-medium text-gray-600 mb-6 max-w-md">
                                        Still need help? Reach out to our partner support team directly.
                                    </p>
                                    <div className="flex flex-col sm:flex-row items-center gap-3">
                                        <a href={`mailto:${supportEmail}`} className="px-6 py-3 bg-indigo-600 text-white rounded-full font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30">
                                            {supportEmail}
                                        </a>
                                        <span className="hidden sm:block text-gray-300 font-black">/</span>
                                        <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`} className="px-6 py-3 bg-white text-gray-900 border border-gray-200 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                                            {supportPhone}
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </PageTransition>
    );
};

export default DeliveryLegalPage;
