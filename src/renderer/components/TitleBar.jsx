import React from 'react';

const TitleBar = ({ onToggleBackend, isActive }) => {
  return (
    <div className="h-[38px] bg-[#323232] text-white flex items-center justify-between px-3 border-b border-black/40 select-none z-[100] flex-shrink-0 relative" style={{ WebkitAppRegion: 'drag' }}>
      {/* Spacer for native macOS traffic lights (approx 72px) */}
      <div className="w-[72px] flex-shrink-0" />

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] text-gray-400 font-medium tracking-tight pointer-events-none">
        Gapplet
      </div>

      <div className="flex items-center">
        {/* The Code Button */}
        <div className="group/code no-drag">
          <button
            onClick={onToggleBackend}
            className={`w-[12px] h-[12px] rounded-full transition-all flex items-center justify-center border-[0.5px] border-black/20 shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.1)] active:brightness-75 ${isActive ? 'bg-[#007aff] shadow-lg shadow-blue-900/50' : 'bg-[#007aff]'}`}
            title="Toggle Backend Interface"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-0 group-hover/code:opacity-100 transition-opacity pointer-events-none">
              <path d="M4.5 4.5L3 6l1.5 1.5M7.5 4.5L9 6 7.5 7.5M6.5 3.5l-1 5" fill="none" stroke="#1e3a8a" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TitleBar;
