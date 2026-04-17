import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { getPublicSetting } from '../services/settingsService';

const DEFAULT_LEGAL_DATA = {
    'terms': {
        title: 'Terms and Conditions',
        content: `
            <div class="space-y-4">
                <p class="text-gray-600 leading-relaxed font-medium">By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>
                <h3 class="font-bold text-black uppercase text-lg mt-6">Use License</h3>
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
    }
};

const PolicyModal = ({ isOpen, onClose, type }) => {
    const [pageContent, setPageContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const keyMap = {
        'terms': 'terms_policy',
        'privacy': 'privacy_policy'
    };

    useEffect(() => {
        if (!isOpen) return;

        const fetchContent = async () => {
            setIsLoading(true);
            try {
                const key = keyMap[type];
                if (key) {
                    // Try 'content' category first (User edits in Content & Features go here)
                    const contentRes = await getPublicSetting('content', true);
                    if (contentRes?.data && contentRes.data[key]) {
                        setPageContent({
                            title: DEFAULT_LEGAL_DATA[type]?.title || 'Information',
                            content: contentRes.data[key]
                        });
                        return;
                    }

                    // Try direct key next (Seeded defaults or specific Policy pages)
                    const res = await getPublicSetting(key, true);
                    if (res?.data && !res.data.includes('<h1>Terms and Conditions</h1>')) { // Avoid placeholder
                        setPageContent({
                            title: DEFAULT_LEGAL_DATA[type]?.title || 'Information',
                            content: res.data
                        });
                        return;
                    }
                }

                // Fallback to default bundled data
                setPageContent(DEFAULT_LEGAL_DATA[type] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px]">Coming soon...</p>'
                });
            } catch (err) {
                console.error('Error fetching legal content:', err);
                setPageContent(DEFAULT_LEGAL_DATA[type] || {
                    title: 'Information',
                    content: '<p class="text-gray-500 font-bold uppercase text-[10px]">Coming soon...</p>'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchContent();
    }, [isOpen, type]);

    // Prevent background scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-6 md:p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-black uppercase tracking-tight">
                                    {pageContent?.title || 'Loading...'}
                                </h2>
                                <div className="h-1 w-12 bg-[#ffcc00] rounded-full mt-1"></div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-black"
                            >
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1">
                            {isLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                                    <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                                </div>
                            ) : (
                                <div
                                    className="legal-rich-text text-gray-700 leading-relaxed font-medium"
                                    dangerouslySetInnerHTML={{ __html: pageContent?.content }}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end shrink-0">
                            <button
                                onClick={onClose}
                                className="px-8 py-2.5 bg-black text-white rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PolicyModal;
