import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AccountLayout from '../../components/Profile/AccountLayout';

// Initial/Fallback data in case nothing is in localStorage/Admin yet
const DEFAULT_LEGAL_DATA = {
    'about': {
        title: 'About Us',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">Welcome to Clothify, your number one source for all things fashion. We're dedicated to giving you the very best of clothing, with a focus on dependability, customer service and uniqueness.</p>
                <p class="text-gray-600 leading-relaxed font-medium">Founded in 2024, Clothify has come a long way from its beginnings. When we first started out, our passion for fashion-forward clothing drove us to do intense research so that Clothify can offer you the world's most stylish and premium apparel.</p>
                <div class="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <h3 class="font-black text-black uppercase tracking-tight text-lg mb-2">Our Mission</h3>
                    <p class="text-gray-500 font-bold text-[11px] uppercase tracking-widest">To empower people through fashion and quality.</p>
                </div>
            </div>
        `
    },
    'terms': {
        title: 'Terms and Conditions',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
                <h3 class="font-black text-black uppercase tracking-tight text-lg mt-6">Use License</h3>
                <p class="text-gray-600 leading-relaxed font-medium">Permission is granted to temporarily download one copy of the materials (information or software) on Clothify's website for personal, non-commercial transitory viewing only.</p>
            </div>
        `
    },
    'privacy': {
        title: 'Privacy Policy',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">Your privacy is important to us. It is Clothify's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
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
                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <span class="block font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Email Us</span>
                        <p class="font-black text-black">support@clothify.com</p>
                    </div>
                    <div class="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <span class="block font-black text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">Call Us</span>
                        <p class="font-black text-black">+91 96690 02380</p>
                    </div>
                </div>
                <div class="p-6 bg-black text-white rounded-2xl">
                    <h3 class="font-black text-[13px] uppercase tracking-widest mb-2 text-[#ffcc00]">Headquarters</h3>
                    <p class="text-[11px] font-bold opacity-80 leading-relaxed">Slikksync Technologies,<br/>Fashion Hub, Street 12,<br/>Mumbai, Maharashtra, India</p>
                </div>
            </div>
        `
    }
};

const LegalPage = () => {
    const { pageId } = useParams();
    const [pageContent, setPageContent] = useState(null);

    useEffect(() => {
        // 1. Try to get from localStorage (Admin updates will set this)
        const storedData = localStorage.getItem(`legal_content_${pageId}`);

        if (storedData) {
            setPageContent(JSON.parse(storedData));
        } else {
            // 2. Fallback to default bundled data
            setPageContent(DEFAULT_LEGAL_DATA[pageId] || {
                title: 'Information',
                content: '<p class="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Coming soon...</p>'
            });
        }
    }, [pageId]);

    if (!pageContent) return null;

    return (
        <AccountLayout>
            <div className="max-w-[800px] mx-auto animate-fadeInUp">
                <div className="mb-10">
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-black mb-2">
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
