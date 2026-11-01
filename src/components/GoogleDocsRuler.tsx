import React from 'react';

export const GoogleDocsRuler: React.FC = () => {
  return (
    <div className="bg-[#f0f4f9] border-b border-[#dadce0] h-4.5 relative hidden md:flex items-center justify-center select-none overflow-hidden">
      <div className="w-full max-w-[816px] h-full bg-white border-x border-[#dadce0] relative flex items-center justify-between text-[9px] text-gray-400 font-mono">
        {/* Margin triangle marker left */}
        <div className="absolute left-6 top-0 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-blue-600" />
        
        {/* Inch/CM ticks */}
        {[1, 2, 3, 4, 5, 6, 7].map((num) => (
          <div key={num} className="relative flex flex-col items-center flex-1">
            <span className="scale-75 text-[#5f6368] font-sans font-medium">{num}</span>
            <div className="w-px h-1 bg-[#dadce0]" />
          </div>
        ))}

        {/* Margin marker right */}
        <div className="absolute right-6 top-0 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-6 border-t-blue-600" />
      </div>
    </div>
  );
};
