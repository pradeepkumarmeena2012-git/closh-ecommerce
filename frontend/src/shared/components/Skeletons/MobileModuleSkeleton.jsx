import React from 'react';

const MobileModuleSkeleton = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white animate-pulse">
      {/* Mobile Header Skeleton */}
      <header className="sticky top-0 left-0 z-50 bg-[#0f172a] h-14 w-full flex items-center px-4">
        <div className="w-8 h-8 rounded-lg bg-white/10 mr-3"></div>
        <div className="flex flex-col gap-1">
          <div className="w-20 h-3 bg-white/20 rounded"></div>
          <div className="w-12 h-2 bg-indigo-400/20 rounded"></div>
        </div>
        <div className="ml-auto w-10 h-5 bg-emerald-500/20 rounded-full"></div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Banner/Hero Skeleton */}
        <div className="h-48 bg-slate-100 rounded-[2rem]"></div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-50 rounded-2xl"></div>
          <div className="h-24 bg-slate-50 rounded-2xl"></div>
        </div>

        {/* List Items */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-4 gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-3 bg-slate-200 rounded"></div>
                <div className="w-1/2 h-2 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom Nav Skeleton */}
      <footer className="h-16 bg-white border-t border-slate-100 flex items-center justify-around px-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-8 h-8 rounded-xl bg-slate-100"></div>
        ))}
      </footer>
    </div>
  );
};

export default MobileModuleSkeleton;
