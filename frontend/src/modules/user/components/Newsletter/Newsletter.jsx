import React from 'react';

const Newsletter = () => {
    return (
        <div className="py-16 md:py-[80px] bg-[#111111] text-[#FAFAFA] relative overflow-hidden border-t border-white/5">
            {/* Elegant Background Grid */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            <div className="container relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto px-6">

                <h2 className="text-3xl md:text-5xl font-premium font-black mb-3 tracking-tighter uppercase">
                    Join The <span className="text-[#D4AF37] italic font-light drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">Inner Circle</span>
                </h2>
                <p className="text-[12px] md:text-[14px] font-premium text-white/50 tracking-widest uppercase mb-10 max-w-lg leading-relaxed">
                    Exclusive early access to new drops, VIP sales, and highly curated luxury edits delivered to your inbox.
                </p>

                <form className="flex flex-col sm:flex-row gap-4 w-full max-w-[600px] relative group" onSubmit={(e) => e.preventDefault()}>
                    <div className="relative flex-1">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="w-full py-4 px-6 rounded-full border border-white/10 bg-white/5 text-[#FAFAFA] text-sm font-premium outline-none placeholder:text-white/30 placeholder:tracking-widest focus:border-[#D4AF37]/50 focus:bg-white/10 transition-all duration-500 backdrop-blur-md"
                            required
                        />
                        {/* Subtle glowing focus ring */}
                        <div className="absolute inset-0 rounded-full border border-[#D4AF37] opacity-0 group-focus-within:opacity-20 group-focus-within:scale-[1.02] group-focus-within:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all duration-700 pointer-events-none" />
                    </div>

                    <button type="submit" className="relative overflow-hidden py-4 px-10 bg-[#FAFAFA] text-[#111111] text-[11px] font-premium font-black tracking-[0.2em] uppercase rounded-full transition-all duration-500 hover:bg-[#D4AF37] hover:text-[#FAFAFA] group/btn hover:-translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(212,175,55,0.3)] sm:w-auto w-full flex items-center justify-center">
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover/btn:animate-shimmer skew-x-12" />
                        <span className="relative z-10">Subscribe</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Newsletter;
