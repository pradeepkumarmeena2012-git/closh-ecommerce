import React from 'react';

const ProductSkeleton = () => {
    return (
        <div className="relative flex flex-col group w-full animate-pulse">
            {/* Image Placeholder */}
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-[24px] bg-white/5 border border-white/5 shadow-sm mb-4">
                {/* Simulated Glow */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </div>

            {/* Content Placeholder */}
            <div className="flex flex-col px-1 w-full gap-2">
                {/* Brand & Price Row */}
                <div className="flex justify-between items-center w-full">
                    <div className="h-3 w-1/3 bg-white/10 rounded-full" />
                    <div className="h-3 w-1/4 bg-white/10 rounded-full" />
                </div>
                {/* Title Row */}
                <div className="h-4 w-2/3 bg-white/10 rounded-full mt-1" />
            </div>
        </div>
    );
};

export default ProductSkeleton;
