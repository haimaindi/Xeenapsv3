import React, { useState, useEffect } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { BRAND_ASSETS, SPREADSHEET_CONFIG } from '../../assets';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
  const location = useLocation();
  const [tutorialLink, setTutorialLink] = useState<string | null>(null);

  // Mapping path to Tutorial ID from Spreadsheet
  const getTutorialId = (pathname: string): string => {
    if (pathname === '/add') return 'AddLibrary';
    if (pathname === '/settings') return 'Settings';
    // Default or Library views
    if (pathname === '/' || pathname === '/favorite' || pathname === '/bookmark' || pathname === '/research') {
      return 'MainLibrary';
    }
    return 'General';
  };

  useEffect(() => {
    const fetchTutorialLink = async () => {
      const tutorialId = getTutorialId(location.pathname);
      const spreadsheetUrl = SPREADSHEET_CONFIG.TUTORIAL_CSV;
      
      try {
        const response = await fetch(spreadsheetUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvData = await response.text();
        const rows = csvData.split('\n');
        
        // Find row where Column A (index 0) matches tutorialId
        // Column C (index 2) is the LinkTutorial
        for (const row of rows) {
          const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
          if (cols[0] === tutorialId) {
            if (cols[2] && cols[2].startsWith('http')) {
              setTutorialLink(cols[2]);
              return;
            }
          }
        }
        setTutorialLink(null);
      } catch (e) {
        console.error('Failed to fetch tutorial link:', e);
        setTutorialLink(null);
      }
    };

    fetchTutorialLink();
  }, [location.pathname]);

  const handleTutorialClick = () => {
    if (tutorialLink) {
      window.open(tutorialLink, '_blank', 'noopener,noreferrer');
    }
  };

  // Placeholder user data
  const rawName = "Personal User";
  // Mengonversi ke Proper Case (Kapital di awal setiap kata)
  const userName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  
  const userPhoto = ""; // String kosong untuk memicu placeholder
  const placeholderUrl = BRAND_ASSETS.USER_DEFAULT;

  return (
    <header className="sticky top-0 z-[60] w-full py-4 lg:py-6 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-100/50 px-1">
      {/* Bagian Kiri: Welcome Message (Left Align) */}
      <div className="flex flex-col">
        <span className="text-[9px] md:text-[11px] uppercase font-normal tracking-[0.2em] text-[#004A74] opacity-90">
          WELCOME,
        </span>
        <h1 className="text-xl md:text-3xl font-bold text-[#004A74] leading-tight">
          {userName}!
        </h1>
      </div>

      {/* Bagian Kanan: Icons (Right Align) */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* YouTube Tutorial Icon */}
        {tutorialLink && (
          <button 
            onClick={handleTutorialClick}
            className="p-1 hover:bg-red-50 rounded-full transition-all duration-300 animate-in fade-in zoom-in group outline-none"
            title="Watch Tutorial"
          >
            <img 
              src={BRAND_ASSETS.YOUTUBE_ICON} 
              alt="Watch Tutorial" 
              className="w-7 h-7 md:w-8 md:h-8 object-contain transition-transform group-hover:scale-110" 
            />
          </button>
        )}

        {/* Bell Icon */}
        <button className="relative p-2 text-[#004A74] opacity-60 hover:opacity-100 hover:bg-gray-50 rounded-full transition-all duration-300">
          <BellIcon className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#FED400] rounded-full border-2 border-white"></span>
        </button>
        
        {/* User Photo with rounded frame */}
        <button className="flex items-center focus:outline-none p-1">
          <div className="relative">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-[#FED400] p-0.5 hover:border-[#004A74] transition-colors duration-300 overflow-hidden shadow-sm bg-white">
              <img 
                src={userPhoto || placeholderUrl} 
                alt="User Profile" 
                className="w-full h-full object-cover rounded-full bg-gray-50"
              />
            </div>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;