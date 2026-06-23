import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Instagram, Twitter, Facebook } from 'lucide-react';

const ComingSoonPage = () => {
    return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-white/20">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] sm:w-[800px] h-[300px] sm:h-[500px] bg-indigo-500/20 rounded-full blur-[100px] sm:blur-[150px] opacity-50" />
                <div className="absolute bottom-0 right-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-fuchsia-500/10 rounded-full blur-[100px] sm:blur-[150px] opacity-30" />
            </div>

            <div className="relative z-10 w-full max-w-5xl px-6 py-12 md:py-20 flex flex-col items-center text-center">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-12 md:mb-24"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-[0.3em] uppercase">
                        Closh
                    </h1>
                </motion.div>

                {/* Main Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="max-w-3xl flex flex-col items-center"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 mb-6 sm:mb-8 backdrop-blur-sm">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] sm:text-[11px] font-bold text-white/80 uppercase tracking-widest">Under Construction</span>
                    </div>
                    
                    <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 tracking-tight leading-[1.1] mb-6 sm:mb-8 px-2">
                        Elevating<br/>Luxury Fashion
                    </h2>
                    
                    <p className="text-base sm:text-lg md:text-xl text-white/50 font-medium leading-relaxed max-w-2xl mx-auto mb-10 sm:mb-12 px-4 sm:px-0">
                        We are currently onboarding exclusive vendors and curating the finest collections. The ultimate fashion experience is almost here.
                    </p>
                </motion.div>

                {/* Notify Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                    className="w-full max-w-md relative group px-2 sm:px-0"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-700" />
                    <div className="relative flex flex-col sm:flex-row items-center bg-white/5 border border-white/10 rounded-2xl p-2 backdrop-blur-xl gap-2 sm:gap-0">
                        <div className="flex items-center w-full sm:flex-1 bg-white/5 sm:bg-transparent rounded-xl sm:rounded-none px-3 py-1 sm:p-0">
                            <div className="pr-2 text-white/40">
                                <Mail size={18} className="sm:w-[20px] sm:h-[20px]" />
                            </div>
                            <input 
                                type="email" 
                                placeholder="Enter email for early access" 
                                className="w-full bg-transparent border-none text-white placeholder-white/30 focus:outline-none focus:ring-0 text-[13px] sm:text-sm py-3"
                            />
                        </div>
                        <button className="w-full sm:w-auto bg-white text-black px-6 py-3.5 sm:py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-transform active:scale-95 shrink-0">
                            Notify Me
                        </button>
                    </div>
                </motion.div>

                {/* Footer/Socials */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="mt-20 md:mt-32 flex flex-col items-center gap-6"
                >
                    <div className="flex gap-4">
                        {[Instagram, Twitter, Facebook].map((Icon, idx) => (
                            <a key={idx} href="#" className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all hover:-translate-y-1">
                                <Icon size={18} />
                            </a>
                        ))}
                    </div>
                    <p className="text-xs text-white/30 font-medium uppercase tracking-widest">
                        © {new Date().getFullYear()} Closh. All rights reserved.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default ComingSoonPage;
