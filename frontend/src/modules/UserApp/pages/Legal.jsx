import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Shield, FileText, Users, Lock } from 'lucide-react';

const Legal = () => {
    const navigate = useNavigate();
    const [openSection, setOpenSection] = useState('terms');

    const sections = [
        {
            id: 'terms',
            icon: FileText,
            title: 'Terms of Service',
            content: `Welcome to our multi-vendor marketplace. By accessing or using our platform, you agree to be bound by these Terms of Service.

**Account Registration:** You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials.

**Orders & Payments:** All orders are subject to availability and confirmation. We reserve the right to refuse or cancel any order for any reason.

**Product Information:** Product descriptions and images are provided by vendors. While we strive for accuracy, we cannot guarantee that all information is complete or error-free.

**Delivery:** Delivery timelines are estimates and may vary depending on your location and vendor processing times.

**Cancellations & Returns:** You may cancel an order before it is shipped. Return policies vary by vendor — please check individual product pages for details.`
        },
        {
            id: 'privacy',
            icon: Lock,
            title: 'Privacy Policy',
            content: `We value your privacy and are committed to protecting your personal information.

**Information We Collect:** Name, email, phone number, shipping address, payment information, and browsing behavior.

**How We Use It:** To process orders, improve our services, send promotional updates (with your consent), and provide customer support.

**Data Sharing:** We share necessary information with vendors to fulfill orders and with payment processors to handle transactions. We do not sell your personal data.

**Data Security:** We implement industry-standard security measures to protect your information.

**Your Rights:** You can access, update, or delete your personal information at any time through your account settings.`
        },
        {
            id: 'refund',
            icon: Shield,
            title: 'Refund Policy',
            content: `We want you to be completely satisfied with your purchase.

**Eligibility:** Items must be returned within 7 days of delivery in their original condition with tags intact.

**Process:** Initiate a return request from your Order Details page. Once approved, schedule a pickup or drop off the item.

**Refund Timeline:** Refunds are processed within 5-7 business days after we receive the returned item.

**Non-Returnable Items:** Certain items like innerwear, swimwear, and customized products are non-returnable.

**Exchange:** Exchanges are subject to availability. If the replacement is unavailable, a full refund will be issued.`
        },
        {
            id: 'vendor',
            icon: Users,
            title: 'Vendor Policies',
            content: `Our platform connects you with multiple independent vendors.

**Vendor Verification:** All vendors undergo a verification process before listing products.

**Product Quality:** Each vendor is responsible for the quality and authenticity of their products.

**Shipping:** Shipping is handled by individual vendors. Delivery times may vary by vendor.

**Disputes:** In case of disputes between customers and vendors, our support team will mediate to find a resolution.

**Ratings & Reviews:** Your honest feedback helps other customers and ensures vendor accountability.`
        },
    ];

    return (
        <div className="bg-[#fafafa] min-h-screen pb-20">
            {/* Header */}
            <div className="sticky top-0 bg-white z-40 border-b border-gray-100 px-4 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-base font-black uppercase tracking-tight">Legal & Policies</h1>
            </div>

            <div className="container mx-auto px-4 py-6 max-w-2xl">
                <div className="space-y-3">
                    {sections.map(section => {
                        const Icon = section.icon;
                        const isOpen = openSection === section.id;
                        return (
                            <div key={section.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => setOpenSection(isOpen ? '' : section.id)}
                                    className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                                            <Icon size={18} className="text-gray-600" />
                                        </div>
                                        <span className="text-[14px] font-black text-gray-900 uppercase tracking-tight">{section.title}</span>
                                    </div>
                                    {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-6 pt-0 animate-fadeIn">
                                        <div className="text-[13px] text-gray-600 leading-relaxed whitespace-pre-line border-t border-gray-100 pt-4">
                                            {section.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Legal;
