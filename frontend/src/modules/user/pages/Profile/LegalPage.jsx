import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AccountLayout from '../../components/Profile/AccountLayout';
import { getPublicSetting } from '../../../../shared/services/settingsService';
import { useSettingsStore } from '../../../../shared/store/settingsStore';

// Initial/Fallback data in case nothing is in localStorage/Admin yet
const getLegalData = (settings) => {
    const general = settings?.general || {};
    const supportEmail = general.customerSupportEmail || "support@clouse.com";
    const supportPhone = general.customerSupportPhone || "+91 (800) 111-2222";
    const address = general.address || "Mumbai, Maharashtra, India";
    const storeName = general.storeName || "CLOSH";

    return {
    'about': {
        title: 'About Us',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">Welcome to ${storeName}, your number one source for all things fashion. We're dedicated to giving you the very best of clothing, with a focus on dependability, customer service and uniqueness.</p>
                <p class="text-gray-600 leading-relaxed font-medium">Founded in 2024, ${storeName} has come a long way from its beginnings. When we first started out, our passion for fashion-forward clothing drove us to do intense research so that ${storeName} can offer you the world's most stylish and premium apparel.</p>
                <div class="mt-8 p-6 bg-white rounded-2xl border border-gray-100">
                    <h3 class="font-bold text-black uppercase  text-lg mb-2">Our Mission</h3>
                    <p class="text-gray-500 font-bold text-[11px] uppercase ">To empower people through fashion and quality.</p>
                </div>
            </div>
        `
    },
    'terms': {
        title: 'Terms and Conditions',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
                <h3 class="font-bold text-black uppercase  text-lg mt-6">Use License</h3>
                <p class="text-gray-600 leading-relaxed font-medium">Permission is granted to temporarily download one copy of the materials (information or software) on ${storeName}'s website for personal, non-commercial transitory viewing only.</p>
            </div>
        `
    },
    'privacy': {
        title: 'Privacy Policy',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">Your privacy is important to us. It is ${storeName}'s policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
                <p class="text-gray-600 leading-relaxed font-medium">We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent.</p>
            </div>
        `
    },
    'refund': {
        title: 'Refund Policy',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">We want you to be totally satisfied with your purchase! If you're not happy, we're not happy.</p>
                <p class="text-gray-600 leading-relaxed font-medium">You have 15 calendar days to return an item from the date you received it. To be eligible for a return, your item must be unused and in the same condition that you received it.</p>
            </div>
        `
    },
    'contact': {
        title: 'Contact Us',
        content: `
            <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-6 bg-white rounded-2xl border border-gray-100">
                        <span class="block font-bold text-[10px] uppercase text-gray-400 mb-2">Email Us</span>
                        <p class="font-bold text-black">${supportEmail}</p>
                    </div>
                    <div class="p-6 bg-white rounded-2xl border border-gray-100">
                        <span class="block font-bold text-[10px] uppercase text-gray-400 mb-2">Call Us</span>
                        <p class="font-bold text-black">${supportPhone}</p>
                    </div>
                </div>
                <div class="p-6 bg-black text-white rounded-2xl">
                    <h3 class="font-bold text-[13px] uppercase  mb-2 text-[#ffcc00]">Headquarters</h3>
                    <p class="text-[11px] font-bold opacity-80 leading-relaxed">${address.replace(/\n/g, '<br/>')}</p>
                </div>
            </div>
        `
    }
    };
};

const LegalPage = () => {
    const { pageId } = useParams();
    const { settings, initializePublic } = useSettingsStore();
    const [pageContent, setPageContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const keyMap = {
        'terms': 'terms_policy',
        'privacy': 'privacy_policy',
        'refund': 'refund_policy',
        'about': 'about_us',
        'contact': 'contact_info'
    };

    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            try {
                await initializePublic();
                const legalData = getLegalData(settings);

                const key = keyMap[pageId];
                if (key) {
                    // Try 'content' category first (User edits in Content & Features go here)
                    const contentRes = await getPublicSetting('content', true);
                    if (contentRes?.data && contentRes.data[key]) {
                        setPageContent({
                            title: legalData[pageId]?.title || 'Information',
                            content: contentRes.data[key]
                        });
                        return;
                    }

                    // Try direct key next (Seeded defaults or specific Policy pages)
                    const res = await getPublicSetting(key, true);
                    if (res?.data && !res.data.includes('<h1>Terms and Conditions</h1>')) { // Avoid placeholder
                        setPageContent({
                            title: legalData[pageId]?.title || 'Information',
                            content: res.data
                        });
                        return;
                    }
                }

                // Fallback to default bundled data
                setPageContent(legalData[pageId] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px] ">Coming soon...</p>'
                });
            } catch (err) {
                console.error('Error fetching legal content:', err);
                const legalData = getLegalData(settings);
                setPageContent(legalData[pageId] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px] ">Coming soon...</p>'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [pageId, settings?.general]);

    if (isLoading) return <div className="p-20 text-center text-gray-400 font-bold uppercase  animate-pulse">Loading...</div>;
    if (!pageContent) return null;

    return (
        <AccountLayout>
            <div className="max-w-[800px] mx-auto animate-fadeInUp">
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold uppercase  text-black mb-2">
                        {pageContent.title}
                    </h1>
                    <div className="h-1.5 w-20 bg-[#ffcc00] rounded-full"></div>
                </div>

                <div
                    className="legal-rich-text text-gray-700 leading-relaxed font-medium"
                    dangerouslySetInnerHTML={{ __html: pageContent.content }}
                />
            </div>
        </AccountLayout>
    );
};

export default LegalPage;
