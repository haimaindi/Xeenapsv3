
import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { LibraryItem, LibraryType } from '../../types';
import { deleteLibraryItem, saveLibraryItem } from '../../services/gasService';
import { 
  TrashIcon, 
  BookmarkIcon, 
  StarIcon, 
  PlusIcon, 
  ChevronUpIcon, 
  ChevronDownIcon, 
  ArrowsUpDownIcon,
  AdjustmentsHorizontalIcon,
  CheckIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { 
  BookmarkIcon as BookmarkSolid, 
  StarIcon as StarSolid 
} from '@heroicons/react/24/solid';
import { SmartSearchBox } from '../Common/SearchComponents';
import { 
  StandardTableContainer, 
  StandardTableWrapper, 
  StandardTh, 
  StandardTr, 
  StandardTd, 
  StandardTableFooter, 
  StandardCheckbox 
} from '../Common/TableComponents';
import { 
  StandardQuickAccessBar, 
  StandardQuickActionButton, 
  StandardPrimaryButton as AddButton,
  StandardFilterButton 
} from '../Common/ButtonComponents';
import LibraryDetailView from './LibraryDetailView';

interface LibraryMainProps {
  items: LibraryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  globalSearch: string;
}

type SortConfig = {
  key: keyof LibraryItem | 'none';
  direction: 'asc' | 'desc' | null;
};

const LibraryMain: React.FC<LibraryMainProps> = ({ items, isLoading, onRefresh, globalSearch }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [localSearch, setLocalSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | LibraryType>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'title', direction: 'asc' });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const itemsPerPage = isMobile ? 10 : 25;
  const filters: ('All' | LibraryType)[] = ['All', LibraryType.LITERATURE, LibraryType.TASK, LibraryType.PERSONAL, LibraryType.OTHER];
  const effectiveSearch = localSearch || globalSearch;

  const handleSort = (key: keyof LibraryItem) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key: direction ? key : 'none', direction });
  };

  const getSortIcon = (key: keyof LibraryItem) => {
    if (sortConfig.key !== key) return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
    if (sortConfig.direction === 'asc') return <ChevronUpIcon className="w-3 h-3 text-[#004A74]" />;
    if (sortConfig.direction === 'desc') return <ChevronDownIcon className="w-3 h-3 text-[#004A74]" />;
    return <ArrowsUpDownIcon className="w-3 h-3 text-gray-300" />;
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      const query = effectiveSearch.toLowerCase();
      const matchesSearch = !query || Object.values(item).some(val => {
        if (typeof val === 'string') return val.toLowerCase().includes(query);
        if (Array.isArray(val)) return val.some(v => typeof v === 'string' && v.toLowerCase().includes(query));
        return false;
      });

      const matchesCategory = activeFilter === 'All' || item.type === activeFilter;
      const isFavoritePath = location.pathname === '/favorite';
      const isBookmarkPath = location.pathname === '/bookmark';
      const isResearchPath = location.pathname === '/research';
      
      const matchesPath = 
        (isFavoritePath ? item.isFavorite : true) && 
        (isBookmarkPath ? item.isBookmarked : true) &&
        (isResearchPath ? (item.type === LibraryType.LITERATURE || item.type === LibraryType.TASK) : true);

      return matchesSearch && matchesCategory && matchesPath;
    });

    if (sortConfig.key !== 'none' && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const valA = (a[sortConfig.key as keyof LibraryItem] || '').toString().toLowerCase();
        const valB = (b[sortConfig.key as keyof LibraryItem] || '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, effectiveSearch, activeFilter, location.pathname, sortConfig]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const paginatedItems = filteredAndSortedItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedItems.map(item => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      await deleteLibraryItem(id);
    }
    setSelectedIds([]);
    onRefresh();
  };

  const handleBatchAction = async (property: 'isBookmarked' | 'isFavorite') => {
    if (selectedIds.length === 0) return;
    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const anyFalse = selectedItems.some(i => !i[property]);
    const newValue = anyFalse;
    for (const item of selectedItems) {
      await saveLibraryItem({ ...item, [property]: newValue });
    }
    onRefresh();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-12 w-full skeleton rounded-xl" />
        <div className="h-64 w-full skeleton rounded-2xl" />
      </div>
    );
  }

  const tableColumns: { key: keyof LibraryItem; label: string; width?: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author(s)' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year' },
    { key: 'category', label: 'Category' },
    { key: 'topic', label: 'Topic' },
    { key: 'type', label: 'Type' },
    { key: 'createdAt', label: 'Created At' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-visible relative">
      {/* Detail Overlay */}
      {selectedItem && (
        <LibraryDetailView item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0">
        <SmartSearchBox value={localSearch} onChange={setLocalSearch} />
        <AddButton onClick={() => navigate('/add')} icon={<PlusIcon className="w-5 h-5" />}>Add Collection</AddButton>
      </div>

      <div className="flex items-center justify-between lg:justify-start gap-4 shrink-0 relative z-[30]">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
          {filters.map(filter => (
            <StandardFilterButton key={filter} isActive={activeFilter === filter} onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}>{filter}</StandardFilterButton>
          ))}
        </div>
        
        <div className="relative lg:hidden shrink-0">
          <button onClick={() => setShowSortMenu(!showSortMenu)} className={`p-2.5 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}><AdjustmentsHorizontalIcon className="w-5 h-5" /></button>
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[60] p-2 animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {['title', 'author', 'year', 'createdAt'].map((k) => (
                <button key={k} onClick={() => { handleSort(k as keyof LibraryItem); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === k ? 'bg-[#FED400]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <span className="capitalize">{k}</span>
                  {sortConfig.key === k && (sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-3 h-3 stroke-[3]" /> : <ChevronDownIcon className="w-3 h-3 stroke-[3]" />)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <StandardQuickAccessBar isVisible={selectedIds.length > 0} selectedCount={selectedIds.length}>
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete}><TrashIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="primary" onClick={() => handleBatchAction('isBookmarked')}><BookmarkIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')}><StarIcon className="w-5 h-5" /></StandardQuickActionButton>
      </StandardQuickAccessBar>

      <div className="hidden lg:flex flex-col flex-1 min-h-0 overflow-hidden">
        <StandardTableContainer>
          <StandardTableWrapper>
            <thead>
              <tr>
                <th className="px-6 py-4 w-12 bg-gray-50 sticky left-0 z-40 border-r border-gray-100/50 shadow-sm"><StandardCheckbox onChange={toggleSelectAll} checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length} /></th>
                {tableColumns.map(col => (
                  <StandardTh key={col.key} onClick={() => handleSort(col.key)} isActiveSort={sortConfig.key === col.key} className={col.key === 'title' ? 'sticky left-12 z-40 border-r border-gray-100/50 shadow-sm' : ''}>{col.label} {getSortIcon(col.key)}</StandardTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.length === 0 ? (
                <tr><td colSpan={tableColumns.length + 1} className="px-6 py-24 text-center"><div className="flex flex-col items-center justify-center space-y-2"><div className="p-4 bg-gray-50 rounded-full"><PlusIcon className="w-8 h-8 text-gray-300" /></div><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Collection Found</p></div></td></tr>
              ) : (
                paginatedItems.map((item) => (
                  <StandardTr key={item.id}>
                    <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-even:bg-[#fbfbfc] group-hover:bg-[#f0f7fa] shadow-sm"><StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} /></td>
                    <StandardTd isActiveSort={sortConfig.key === 'title'} className="sticky left-12 z-20 border-r border-gray-100/50 bg-white group-even:bg-[#fbfbfc] group-hover:bg-[#f0f7fa] shadow-sm">
                      <div className="flex items-center gap-2 cursor-pointer group/title" onClick={() => setSelectedItem(item)}>
                        <span className="text-sm font-bold text-[#004A74] line-clamp-1 group-hover/title:underline">{item.title}</span>
                        <EyeIcon className="w-3.5 h-3.5 text-gray-300 group-hover/title:text-[#004A74] opacity-0 group-hover/title:opacity-100 transition-all" />
                        {item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}
                        {item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}
                      </div>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'author'} className="text-xs text-gray-600 italic">{item.author || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'publisher'} className="text-xs text-gray-600">{item.publisher || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'year'} className="text-xs text-gray-600 font-mono">{item.year || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'category'} className="text-xs text-gray-600">{item.category || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'topic'} className="text-xs text-gray-600">{item.topic || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'type'}>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${item.type === LibraryType.LITERATURE ? 'bg-blue-50 border-blue-100 text-blue-600' : item.type === LibraryType.TASK ? 'bg-orange-50 border-orange-100 text-orange-600' : item.type === LibraryType.PERSONAL ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>{item.type}</span>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'createdAt'} className="text-xs font-medium text-gray-400">{formatDate(item.createdAt)}</StandardTd>
                  </StandardTr>
                ))
              )}
            </tbody>
          </StandardTableWrapper>
          <StandardTableFooter totalItems={filteredAndSortedItems.length} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </StandardTableContainer>
      </div>

      <div className="flex lg:hidden flex-col flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar pb-10">
        {paginatedItems.map((item) => (
          <div key={item.id} className={`relative flex gap-4 p-4 bg-white border rounded-2xl transition-all ${selectedIds.includes(item.id) ? 'border-[#004A74] shadow-md bg-[#004A74]/5' : 'border-gray-100 shadow-sm'}`} onClick={() => setSelectedItem(item)}>
            <div className="shrink-0 pt-1" onClick={(e) => e.stopPropagation()}><StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1"><span className="text-[10px] font-black uppercase tracking-widest text-[#004A74] opacity-60 truncate">{item.topic || 'No Topic'}</span><div className="flex gap-1">{item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}{item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}</div></div>
              <h3 className="text-sm font-bold text-[#004A74] line-clamp-2 leading-tight mb-2">{item.title}</h3>
              <p className="text-xs font-medium text-gray-500 italic truncate">{item.author || 'Unknown Author'} {item.year ? `| ${item.year}` : ''}</p>
              <div className="mt-3 flex items-center justify-between"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${item.type === LibraryType.LITERATURE ? 'bg-blue-50 border-blue-100 text-blue-600' : item.type === LibraryType.TASK ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-green-50 border-green-100 text-green-600'}`}>{item.type}</span><span className="text-[9px] text-gray-300 font-medium">{formatDate(item.createdAt)}</span></div>
            </div>
          </div>
        ))}
        {totalPages > 1 && <div className="pt-4 pb-6"><StandardTableFooter totalItems={filteredAndSortedItems.length} currentPage={currentPage} itemsPerPage={itemsPerPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
      </div>
    </div>
  );
};

export default LibraryMain;
