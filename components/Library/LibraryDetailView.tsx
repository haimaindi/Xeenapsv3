
import React from 'react';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface LibraryDetailViewProps {
  item: LibraryItem;
  onClose: () => void;
}

const LibraryDetailView: React.FC<LibraryDetailViewProps> = ({ item, onClose }) => {
  const getYoutubeEmbed = (val?: string) => {
    if (!val) return null;
    if (val.length === 11) return `https://www.youtube.com/embed/${val}`;
    return null;
  };

  const videoUrl = getYoutubeEmbed(item.videoRecommendation);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-end md:p-4 pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl h-full md:h-[95vh] bg-white md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-right duration-500">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex-1 min-w-0 pr-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FED400] mb-1">
              {item.type} • {item.topic}
            </p>
            <h2 className="text-xl md:text-2xl font-black text-[#004A74] truncate">{item.title}</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-gray-100 rounded-full transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 pb-20">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <p className="text-[9px] font-black uppercase tracking-tighter text-blue-400 mb-1">Authors</p>
              <p className="text-sm font-bold text-[#004A74] line-clamp-1">{item.author}</p>
            </div>
            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
              <p className="text-[9px] font-black uppercase tracking-tighter text-orange-400 mb-1">Year</p>
              <p className="text-sm font-bold text-[#004A74]">{item.year || '-'}</p>
            </div>
            <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100">
              <p className="text-[9px] font-black uppercase tracking-tighter text-green-400 mb-1">Publisher</p>
              <p className="text-sm font-bold text-[#004A74] line-clamp-1">{item.publisher || '-'}</p>
            </div>
            <div className="p-4 bg-[#FED400]/10 rounded-2xl border border-[#FED400]/20">
              <p className="text-[9px] font-black uppercase tracking-tighter text-[#004A74]/50 mb-1">Category</p>
              <p className="text-sm font-bold text-[#004A74]">{item.category}</p>
            </div>
          </div>

          {/* Citations Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <AcademicCapIcon className="w-4 h-4" /> Academic Citations (APA 7)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">In-Text Citation</p>
                <code className="text-xs font-mono font-bold text-[#004A74] block bg-white p-3 rounded-xl border border-gray-100">{item.inTextCitation || 'Not Available'}</code>
              </div>
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Bibliographic Entry</p>
                <code className="text-xs font-mono font-bold text-[#004A74] block bg-white p-3 rounded-xl border border-gray-100 leading-relaxed">{item.bibCitation || 'Not Available'}</code>
              </div>
            </div>
          </section>

          {/* Summary & Abstract */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <BookOpenIcon className="w-4 h-4" /> Abstract
              </h3>
              <div className="bg-white border border-gray-100 p-6 rounded-[2rem] shadow-sm">
                <p className="text-sm text-gray-600 leading-relaxed italic">{item.abstract || 'No abstract available.'}</p>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> Summary Findings
              </h3>
              <div className="bg-[#004A74]/5 border border-[#004A74]/10 p-6 rounded-[2rem]">
                <p className="text-sm text-[#004A74] font-medium leading-relaxed">{item.summary || 'Summary not generated.'}</p>
              </div>
            </section>
          </div>

          {/* Methodology */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <BeakerIcon className="w-4 h-4" /> Research Methodology
            </h3>
            <div className="bg-gray-50 border border-gray-100 p-6 rounded-[2rem]">
              <p className="text-sm text-gray-600 leading-relaxed">{item.researchMethodology || 'No methodology specified.'}</p>
            </div>
          </section>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-green-500 flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="w-4 h-4" /> Key Strengths
              </h3>
              <div className="bg-green-50/30 border border-green-100 p-6 rounded-[2rem]">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {item.strength || 'No strengths analyzed.'}
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4" /> Identified Weaknesses
              </h3>
              <div className="bg-red-50/30 border border-red-100 p-6 rounded-[2rem]">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {item.weakness || 'No weaknesses analyzed.'}
                </div>
              </div>
            </section>
          </div>

          {/* Unfamiliar Terminology */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <LightBulbIcon className="w-4 h-4" /> Dictionary (Unfamiliar Terms)
            </h3>
            <div className="bg-[#FED400]/5 border border-[#FED400]/10 p-6 rounded-[2rem]">
              <div className="text-sm text-[#004A74] font-medium whitespace-pre-wrap leading-relaxed">
                {item.unfamiliarTerminology || 'No unfamiliar terms found.'}
              </div>
            </div>
          </section>

          {/* Video & Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <VideoCameraIcon className="w-4 h-4" /> Video Recommendation
              </h3>
              {videoUrl ? (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 shadow-lg">
                  <iframe 
                    src={videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title="YouTube Recommendation"
                  />
                </div>
              ) : (
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <p className="text-xs font-bold text-gray-400">Search Topic: <span className="text-[#004A74]">{item.videoRecommendation || item.topic}</span></p>
                </div>
              )}
            </section>
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <LightBulbIcon className="w-4 h-4" /> Quick Tips For You
              </h3>
              <div className="bg-[#004A74] p-6 rounded-[2rem] text-white shadow-xl shadow-[#004A74]/10">
                <p className="text-sm font-medium leading-relaxed italic">"{item.quickTipsForYou || 'No tips available yet.'}"</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryDetailView;
