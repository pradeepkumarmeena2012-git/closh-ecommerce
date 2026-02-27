import React from 'react';

const Newsletter = () => {
    return (
        <div className="py-10 md:py-[60px] bg-primary text-white">
            <div className="container flex flex-col md:flex-row justify-between items-center gap-6 md:gap-10 text-center md:text-left">
                <div>
                    <h2 className="text-xl md:text-[28px] font-bold mb-2">Subscribe to our newsletter</h2>
                    <p className="text-sm md:text-base opacity-80">Get updates on new drops and exclusive offers</p>
                </div>
                <form className="flex flex-col sm:flex-row gap-3 flex-1 max-w-[500px] w-full" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        className="flex-1 py-3.5 px-5 rounded-sm border border-white/20 bg-white/10 text-white text-sm outline-none placeholder:text-white/60"
                        required
                    />
                    <button type="submit" className="py-3.5 px-8 bg-white text-primary font-bold rounded-sm tracking-wider transition-all hover:bg-accent hover:text-white sm:w-auto w-full">
                        SUBSCRIBE
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Newsletter;
