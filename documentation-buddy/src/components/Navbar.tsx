import Image from 'next/image';
import React from 'react';

interface NavbarProps {
  apiKey: string;
  onOpenSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ apiKey, onOpenSidebar }) => {
  return (
    <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-2">
        <Image src="/wordmark.svg" alt="Documentation Buddy" className="h-6 w-auto" width={24} height={24} />
      </div>
      <div className="flex items-center space-x-4">
        <button
          onClick={onOpenSidebar}
          className={`px-4 py-2 rounded-lg text-sm font-mono uppercase tracking-tight02 transition-all duration-200 ${
            apiKey 
              ? 'bg-[#F0FF26]/20 text-[#F0FF26] border border-[#F0FF26]/30' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
        >
          {apiKey ? '🔑 API Connected' : '🔑 Setup API Key'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar; 