import React, { useState, useMemo, useEffect } from 'react';
// @ts-ignore - Resolving TS error for missing exported members
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
  CheckIcon
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
  StandardPrimaryButton, 
  StandardFilterButton 
} from '../Common/ButtonComponents';

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

  // Update layout type on resize
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
    let successCount = 0;
    for (const id of selectedIds) {
      const ok = await deleteLibraryItem(id);
      if (ok) successCount++;
    }
    if (successCount > 0) {
      setSelectedIds([]);
      onRefresh();
    }
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
      return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    { key: 'subTopic', label: 'Sub Topic' },
    { key: 'type', label: 'Type' },
    { key: 'createdAt', label: 'Created At' },
  ];

  const mobileSortOptions: { key: keyof LibraryItem; label: string }[] = [
    { key: 'title', label: 'Title' },
    { key: 'author', label: 'Author' },
    { key: 'publisher', label: 'Publisher' },
    { key: 'year', label: 'Year' },
    { key: 'category', label: 'Category' },
    { key: 'topic', label: 'Topic' },
    { key: 'subTopic', label: 'Sub Topic' },
    { key: 'createdAt', label: 'Created At' },
  ];

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500 overflow-visible">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0">
        <SmartSearchBox 
          value={localSearch} 
          onChange={setLocalSearch} 
        />
        <StandardPrimaryButton 
          onClick={() => navigate('/add')}
          icon={<PlusIcon className="w-5 h-5" />}
        >
          Add Collection
        </StandardPrimaryButton>
      </div>

      <div className="flex items-center justify-between lg:justify-start gap-4 shrink-0 relative z-[30]">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar flex-1">
          {filters.map(filter => (
            <StandardFilterButton
              key={filter}
              isActive={activeFilter === filter}
              onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}
            >
              {filter}
            </StandardFilterButton>
          ))}
        </div>
        
        {/* Mobile Sort Menu */}
        <div className="relative lg:hidden shrink-0">
          <button 
            onClick={() => setShowSortMenu(!showSortMenu)}
            className={`p-2.5 rounded-xl border transition-all ${showSortMenu ? 'bg-[#004A74] border-[#004A74] text-white shadow-md' : 'bg-white border-gray-100 text-[#004A74] shadow-sm'}`}
          >
            <AdjustmentsHorizontalIcon className="w-5 h-5" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 z-[60] p-2 overflow-hidden animate-in fade-in zoom-in-95">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Sort By</p>
              {mobileSortOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { handleSort(opt.key); setShowSortMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${sortConfig.key === opt.key ? 'bg-[#FED400]/10 text-[#004A74]' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span>{opt.label}</span>
                  {sortConfig.key === opt.key && (
                    sortConfig.direction === 'asc' ? <ChevronUpIcon className="w-3 h-3 stroke-[3]" /> : <ChevronDownIcon className="w-3 h-3 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Select All Toggle for Mobile */}
      {isMobile && paginatedItems.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-[#004A74] hover:opacity-70 transition-opacity"
          >
            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${selectedIds.length === paginatedItems.length ? 'bg-[#004A74] border-[#004A74] text-white' : 'bg-white border-gray-300'}`}>
              {selectedIds.length === paginatedItems.length && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            {selectedIds.length === paginatedItems.length ? 'Deselect All' : 'Select All Halaman'}
          </button>
        </div>
      )}

      <StandardQuickAccessBar 
        isVisible={selectedIds.length > 0} 
        selectedCount={selectedIds.length}
      >
        <StandardQuickActionButton variant="danger" onClick={handleBatchDelete}><TrashIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="primary" onClick={() => handleBatchAction('isBookmarked')}><BookmarkIcon className="w-5 h-5" /></StandardQuickActionButton>
        <StandardQuickActionButton variant="warning" onClick={() => handleBatchAction('isFavorite')}><StarIcon className="w-5 h-5" /></StandardQuickActionButton>
      </StandardQuickAccessBar>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden lg:flex flex-col flex-1 min-h-0 overflow-hidden">
        <StandardTableContainer>
          <StandardTableWrapper>
            <thead>
              <tr>
                <th className="px-6 py-4 w-12 bg-gray-50 sticky left-0 z-40 border-r border-gray-100/50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                  <StandardCheckbox 
                    onChange={toggleSelectAll}
                    checked={paginatedItems.length > 0 && selectedIds.length === paginatedItems.length}
                  />
                </th>
                {tableColumns.map(col => (
                  <StandardTh 
                    key={col.key} 
                    onClick={() => handleSort(col.key)} 
                    isActiveSort={sortConfig.key === col.key}
                    width={col.width}
                    className={col.key === 'title' ? 'sticky left-12 z-40 border-r border-gray-100/50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]' : ''}
                  >
                    {col.label} {getSortIcon(col.key)}
                  </StandardTh>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={tableColumns.length + 1} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-4 bg-gray-50 rounded-full"><PlusIcon className="w-8 h-8 text-gray-300" /></div>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Collection Found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <StandardTr key={item.id}>
                    <td className="px-6 py-4 sticky left-0 z-20 border-r border-gray-100/50 bg-white group-even:bg-[#fbfbfc] group-hover:bg-[#f0f7fa] transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                      <StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
                    </td>
                    <StandardTd 
                      isActiveSort={sortConfig.key === 'title'}
                      className="sticky left-12 z-20 border-r border-gray-100/50 bg-white group-even:bg-[#fbfbfc] group-hover:bg-[#f0f7fa] transition-colors shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#004A74] line-clamp-1">{item.title}</span>
                        {item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}
                        {item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}
                      </div>
                    </StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'author'} className="text-xs text-gray-600 italic">{item.author || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'publisher'} className="text-xs text-gray-600">{item.publisher || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'year'} className="text-xs text-gray-600 font-mono">{item.year || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'category'} className="text-xs text-gray-600">{item.category || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'topic'} className="text-xs text-gray-600">{item.topic || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'subTopic'} className="text-xs text-gray-600">{item.subTopic || '-'}</StandardTd>
                    <StandardTd isActiveSort={sortConfig.key === 'type'}>
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${
                        item.type === LibraryType.LITERATURE ? 'bg-blue-50 border-blue-100 text-blue-600' :
                        item.type === LibraryType.TASK ? 'bg-orange-50 border-orange-100 text-orange-600' :
                        item.type === LibraryType.PERSONAL ? 'bg-green-50 border-green-100 text-green-600' :
                        'bg-gray-50 border-gray-100 text-gray-600'
                      }`}>
                        {item.type}
                      </span>
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

      {/* MOBILE CARD VIEW */}
      <div className="flex lg:hidden flex-col flex-1 min-h-0 space-y-3 overflow-y-auto custom-scrollbar pb-10">
        {paginatedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
            <PlusIcon className="w-8 h-8 text-gray-300" />
            <p className="text-xs font-bold text-gray-400 mt-2 uppercase tracking-widest">No Collection</p>
          </div>
        ) : (
          paginatedItems.map((item) => (
            <div 
              key={item.id} 
              className={`relative flex gap-4 p-4 bg-white border rounded-2xl transition-all ${selectedIds.includes(item.id) ? 'border-[#004A74] shadow-md bg-[#004A74]/5' : 'border-gray-100 shadow-sm'}`}
            >
              <div className="shrink-0 flex items-start pt-1">
                <StandardCheckbox checked={selectedIds.includes(item.id)} onChange={() => toggleSelectItem(item.id)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#004A74] opacity-60 truncate">
                    {item.topic || 'No Topic'}
                  </span>
                  <div className="flex gap-1">
                    {item.isBookmarked && <BookmarkSolid className="w-3 h-3 text-[#004A74]" />}
                    {item.isFavorite && <StarSolid className="w-3 h-3 text-[#FED400]" />}
                  </div>
                </div>
                <h3 className="text-sm font-bold text-[#004A74] line-clamp-2 leading-tight mb-2">
                  {item.title}
                </h3>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-500 italic truncate">
                    {item.author || 'Unknown Author'} {item.year ? `| ${item.year}` : ''}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400 truncate">
                    {item.publisher || '-'}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                   <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      item.type === LibraryType.LITERATURE ? 'bg-blue-50 border-blue-100 text-blue-600' :
                      item.type === LibraryType.TASK ? 'bg-orange-50 border-orange-100 text-orange-600' :
                      item.type === LibraryType.PERSONAL ? 'bg-green-50 border-green-100 text-green-600' :
                      'bg-gray-50 border-gray-100 text-gray-600'
                    }`}>
                      {item.type}
                    </span>
                    <span className="text-[9px] text-gray-300 font-medium">{formatDate(item.createdAt)}</span>
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Mobile Pagination Footer */}
        {totalPages > 1 && (
          <div className="pt-4 pb-6">
            <StandardTableFooter 
              totalItems={filteredAndSortedItems.length} 
              currentPage={currentPage} 
              itemsPerPage={itemsPerPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryMain;