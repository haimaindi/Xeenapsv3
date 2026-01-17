
import React, { useState, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SourceType, FileFormat, LibraryItem, LibraryType } from '../../types';
import { saveLibraryItem, uploadAndStoreFile } from '../../services/gasService';
import { extractMetadataWithAI } from '../../services/AddCollectionService';
import { 
  CheckIcon, 
  LinkIcon, 
  DocumentIcon, 
  CloudArrowUpIcon, 
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { showXeenapsAlert } from '../../utils/swalUtils';
import { 
  FormPageContainer, 
  FormStickyHeader, 
  FormContentArea, 
  FormField, 
  FormDropdown 
} from '../Common/FormComponents';

interface LibraryFormProps {
  onComplete: () => void;
  items: LibraryItem[];
}

const LibraryForm: React.FC<LibraryFormProps> = ({ onComplete, items = [] }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractionStage, setExtractionStage] = useState<'IDLE' | 'READING' | 'AI_ANALYSIS'>('IDLE');
  const [file, setFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    addMethod: 'LINK' as 'LINK' | 'FILE',
    type: LibraryType.LITERATURE, 
    category: 'Original Research',
    topic: '',
    subTopic: '',
    title: '',
    authors: [] as string[],
    publisher: '',
    year: '',
    keywords: [] as string[],
    labels: [] as string[],
    url: '',
    fileId: '',
    inTextAPA: '',
    inTextHarvard: '',
    inTextChicago: '',
    bibAPA: '',
    bibHarvard: '',
    bibChicago: '',
    chunks: [] as string[]
  });

  const existingValues = useMemo(() => ({
    topics: Array.from(new Set(items.map(i => i.topic).filter(Boolean))),
    subTopics: Array.from(new Set(items.map(i => i.subTopic).filter(Boolean))),
    publishers: Array.from(new Set(items.map(i => i.publisher).filter(Boolean))),
    allAuthors: Array.from(new Set(items.flatMap(i => i.authors || []).filter(Boolean))),
    allKeywords: Array.from(new Set(items.flatMap(i => i.keywords || []).filter(Boolean))),
    allLabels: Array.from(new Set(items.flatMap(i => i.labels || []).filter(Boolean))),
  }), [items]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 19.9 * 1024 * 1024) {
        showXeenapsAlert({ icon: 'error', title: 'File Too Large', text: 'Max 19.9MB.', confirmButtonText: 'OK' });
        return;
      }
      setFile(selectedFile);
      setExtractionStage('READING');
      try {
        const result = await uploadAndStoreFile(selectedFile);
        if (result) {
          setExtractionStage('AI_ANALYSIS');
          const aiMeta = await extractMetadataWithAI(result.aiSnippet || result.fullText || "");
          setFormData(prev => ({
            ...prev,
            ...aiMeta,
            fileId: result.fileId || prev.fileId,
            chunks: result.chunks || []
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setExtractionStage('IDLE');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newItem: LibraryItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title: formData.title || 'Untitled',
      type: formData.type,
      category: formData.category,
      topic: formData.topic,
      subTopic: formData.subTopic,
      author: formData.authors.join(', '),
      authors: formData.authors,
      publisher: formData.publisher,
      year: formData.year,
      addMethod: formData.addMethod,
      source: formData.addMethod === 'LINK' ? SourceType.LINK : SourceType.FILE,
      format: formData.addMethod === 'LINK' ? FileFormat.URL : FileFormat.PDF,
      url: formData.addMethod === 'LINK' ? formData.url : '',
      fileId: formData.addMethod === 'FILE' ? formData.fileId : '',
      keywords: formData.keywords,
      labels: formData.labels,
      tags: [...formData.keywords, ...formData.labels],
      inTextAPA: formData.inTextAPA,
      inTextHarvard: formData.inTextHarvard,
      inTextChicago: formData.inTextChicago,
      bibAPA: formData.bibAPA,
      bibHarvard: formData.bibHarvard,
      bibChicago: formData.bibChicago,
      extractedInfo1: formData.chunks[0] || '',
      extractedInfo2: formData.chunks[1] || '',
      extractedInfo3: formData.chunks[2] || '',
      extractedInfo4: formData.chunks[3] || '',
      extractedInfo5: formData.chunks[4] || '',
      extractedInfo6: formData.chunks[5] || '',
      extractedInfo7: formData.chunks[6] || '',
      extractedInfo8: formData.chunks[7] || '',
      extractedInfo9: formData.chunks[8] || '',
      extractedInfo10: formData.chunks[9] || '',
    };
    if (await saveLibraryItem(newItem)) {
      onComplete();
      navigate('/');
    }
    setIsSubmitting(false);
  };

  return (
    <FormPageContainer>
      <FormStickyHeader title="Add Collection" subtitle="Multi-Citation System" onBack={() => navigate('/')} />
      <FormContentArea>
        <form onSubmit={handleSubmit} className="space-y-8">
          <FormField label="Attachment" required>
            <label className="flex flex-col items-center justify-center h-40 bg-gray-50 border-2 border-dashed rounded-[2rem] cursor-pointer">
              {extractionStage !== 'IDLE' ? (
                <div className="flex flex-col items-center">
                  <ArrowPathIcon className="w-8 h-8 text-[#004A74] animate-spin mb-2" />
                  <p className="text-xs font-black text-[#004A74] uppercase">{extractionStage}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">{file ? file.name : 'Upload PDF (Max 19.9MB)'}</p>
              )}
              <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf" disabled={extractionStage !== 'IDLE'} />
            </label>
          </FormField>
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Type (Manual)"><FormDropdown value={formData.type} onChange={(v) => setFormData({...formData, type: v as LibraryType})} options={Object.values(LibraryType)} placeholder="Manual Select" /></FormField>
            <FormField label="Category"><FormDropdown value={formData.category} onChange={(v) => setFormData({...formData, category: v})} options={['Original Research', 'Review', 'Other']} placeholder="Category" /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <FormField label="Topic (2 Words)"><input className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={formData.topic} onChange={(e) => setFormData({...formData, topic: e.target.value})} /></FormField>
            <FormField label="Sub Topic (2 Words)"><input className="w-full px-4 py-3 bg-gray-50 rounded-xl border" value={formData.subTopic} onChange={(e) => setFormData({...formData, subTopic: e.target.value})} /></FormField>
          </div>
          <FormField label="Title"><input className="w-full px-4 py-3 bg-gray-50 rounded-xl border font-bold" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></FormField>
          
          <div className="p-6 bg-[#004A74]/5 rounded-[2rem] border border-[#004A74]/10 space-y-6">
            <h4 className="text-[10px] font-black uppercase text-[#004A74] tracking-widest">Citation Metadata (AI-Generated)</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><p className="text-[9px] font-bold text-gray-400">APA 7</p><input className="w-full p-2 bg-white text-[10px] border rounded-lg" value={formData.inTextAPA} readOnly /></div>
              <div className="space-y-2"><p className="text-[9px] font-bold text-gray-400">Harvard</p><input className="w-full p-2 bg-white text-[10px] border rounded-lg" value={formData.inTextHarvard} readOnly /></div>
              <div className="space-y-2"><p className="text-[9px] font-bold text-gray-400">Chicago</p><input className="w-full p-2 bg-white text-[10px] border rounded-lg" value={formData.inTextChicago} readOnly /></div>
            </div>
            <textarea className="w-full p-3 bg-white text-[10px] border rounded-xl font-mono h-20" value={formData.bibAPA} placeholder="Bibliographic Citation (APA 7)" readOnly />
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-[#004A74] text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-[#003859] transition-all">
            {isSubmitting ? 'Syncing...' : 'Register Item'}
          </button>
        </form>
      </FormContentArea>
    </FormPageContainer>
  );
};

export default LibraryForm;
