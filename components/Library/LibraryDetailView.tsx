
import React, { useState } from 'react';
import { LibraryItem } from '../../types';
import { 
  XMarkIcon, 
  BookOpenIcon, 
  BeakerIcon, 
  ChatBubbleBottomCenterTextIcon,
  AcademicCapIcon,
  VideoCameraIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
}

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose }) => {
  const [citeStyle, setCiteStyle] = useState<'APA' | 'HARVARD' | 'CHICAGO'>('APA');

  const getCitationData = () => {
    if (citeStyle === 'APA') return { inText: item.inTextAPA, bib: item.bibAPA };
    if (citeStyle === 'HARVARD') return { inText: item.inTextHarvard, bib: item.bibHarvard };
    return { inText: item.inTextChicago, bib: item.bibChicago };
  };

  const currentCite = getCitationData();

  const handleCopy = (text?: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      // Optional: Add toast notification
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm pointer-events-auto" onClick={onClose} />
      <div className="relative w-full max-w-4xl h-full bg-white md:rounded-l-[3rem] shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right duration-500">
        
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FED400] mb-1">{item.type} • {item.topic}</p>
            <h2 className="text-xl md:text-2xl font-black text-[#004A74] truncate">{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-[#004A74] rounded-full transition-all"><XMarkIcon className="w-6 h-6" /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 pb-20">
          {/* Multi-Style Citation Selector */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <AcademicCapIcon className="w-4 h-4" /> Academic Citations
              </h3>
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                {(['APA', 'HARVARD', 'CHICAGO'] as const).map(s => (
                  <button key={s} onClick={() => setCiteStyle(s)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${citeStyle === s ? 'bg-[#004A74] text-white' : 'text-gray-400 hover:text-[#004A74]'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 relative group">
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">In-Text Citation ({citeStyle})</p>
                <code className="text-xs font-mono font-bold text-[#004A74] block bg-white p-3 rounded-xl border border-gray-100">{currentCite.inText || 'Not Analyzed'}</code>
                <button onClick={() => handleCopy(currentCite.inText)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><DocumentDuplicateIcon className="w-4 h-4 text-gray-400" /></button>
              </div>
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 relative group">
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Bibliographic Citation</p>
                <code className="text-xs font-mono font-bold text-[#004A74] block bg-white p-3 rounded-xl border border-gray-100 leading-relaxed">{currentCite.bib || 'Not Analyzed'}</code>
                <button onClick={() => handleCopy(currentCite.bib)} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"><DocumentDuplicateIcon className="w-4 h-4 text-gray-400" /></button>
              </div>
            </div>
          </section>

          {/* Abstract & Summary Findings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Abstract</h3>
              <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-sm italic text-sm text-gray-600 leading-relaxed">{item.abstract || 'N/A'}</div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Summary</h3>
              <div className="bg-[#004A74]/5 border border-[#004A74]/10 p-6 rounded-[2.5rem] font-medium text-sm text-[#004A74] leading-relaxed">{item.summary || 'N/A'}</div>
            </section>
          </div>

          {/* Lists: Strength, Weakness, Terminology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-green-500 flex items-center gap-2"><ClipboardDocumentCheckIcon className="w-4 h-4" /> Strengths</h3>
              <div className="bg-green-50/50 border border-green-100 p-6 rounded-[2.5rem] text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.strength || 'N/A'}</div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2"><ExclamationTriangleIcon className="w-4 h-4" /> Weaknesses</h3>
              <div className="bg-red-50/50 border border-red-100 p-6 rounded-[2.5rem] text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.weakness || 'N/A'}</div>
            </section>
          </div>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><LightBulbIcon className="w-4 h-4" /> Unfamiliar Terminology</h3>
            <div className="bg-[#FED400]/10 border border-[#FED400]/20 p-6 rounded-[2.5rem] text-sm text-[#004A74] font-bold whitespace-pre-wrap leading-relaxed">{item.unfamiliarTerminology || 'N/A'}</div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><LightBulbIcon className="w-4 h-4" /> Quick Tips For You</h3>
            <div className="bg-[#004A74] p-8 rounded-[3rem] text-white shadow-xl shadow-[#004A74]/20 italic text-sm leading-relaxed">"{item.quickTipsForYou || 'Focus on the core methodology for your next review.'}"</div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LibraryDetailView;
