import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Bird, AlertCircle, Filter, Radio, StopCircle, Archive, RotateCcw, Clock, ExternalLink, Layers } from 'lucide-react';
import { kickService } from './services/kickService';
import { ChatAnalysisResult, AnalysisStatus, LinkItem } from './types';
import { LinkCard } from './components/LinkCard';

const App: React.FC = () => {
  const [chatId, setChatId] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<ChatAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showArchive, setShowArchive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ref to hold the current result for the callback updates without dependency cycles
  const resultRef = useRef<ChatAnalysisResult>({
    chatSummary: "Linkler Aranıyor...",
    links: [],
    stats: { totalLinks: 0, topCategory: 'YOK' }
  });

  const handleStop = () => {
    kickService.disconnect();
    setStatus(AnalysisStatus.IDLE);
  };

  const handleLinkFound = (newLink: LinkItem) => {
    const current = resultRef.current;
    
    // Check for duplicates based on URL to avoid spam
    if (current.links.some(l => l.url === newLink.url)) return;

    const updatedLinks = [newLink, ...current.links];
    
    // Recalculate stats
    const categories: Record<string, number> = {};
    updatedLinks.forEach(l => {
      categories[l.category] = (categories[l.category] || 0) + 1;
    });

    let topCat = 'YOK';
    let maxCount = 0;
    Object.entries(categories).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    });

    const newResult = {
      chatSummary: `${chatId} kanalının canlı sohbeti dinleniyor...`,
      links: updatedLinks,
      stats: {
        totalLinks: updatedLinks.length,
        topCategory: topCat
      }
    };

    resultRef.current = newResult;
    setResult(newResult);
  };

  const handleVisit = (url: string) => {
    const current = resultRef.current;
    const updatedLinks = current.links.map(link => 
      link.url === url ? { ...link, visited: true } : link
    );

    const newResult = {
      ...current,
      links: updatedLinks
    };

    resultRef.current = newResult;
    setResult(newResult);
  };

  const handleVisitBatch = (urls: string[]) => {
    const current = resultRef.current;
    const updatedLinks = current.links.map(link => 
      urls.includes(link.url) ? { ...link, visited: true } : link
    );

    const newResult = {
      ...current,
      links: updatedLinks
    };

    resultRef.current = newResult;
    setResult(newResult);
  };

  // Improved batch open with delays to handle browser popup blockers
  const handleOpenBatch = (items: LinkItem[]) => {
    if (items.length === 0) return;
    
    // Safety check for large amounts
    if (items.length > 5 && !window.confirm(`${items.length} adet sekme açılacak. Onaylıyor musunuz? (Pop-up izni gerektirebilir)`)) return;

    items.forEach((link, index) => {
      setTimeout(() => {
        window.open(link.url, '_blank');
      }, index * 300); // 300ms delay between tabs
    });

    handleVisitBatch(items.map(l => l.url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatId.trim()) return;

    // Reset State
    kickService.disconnect();
    setStatus(AnalysisStatus.LOADING);
    setError(null);
    setShowArchive(false);
    const initialResult = {
      chatSummary: `${chatId} kanalına bağlanılıyor...`,
      links: [],
      stats: { totalLinks: 0, topCategory: '-' }
    };
    setResult(initialResult);
    resultRef.current = initialResult;
    setSelectedCategory('ALL');

    try {
      await kickService.connect(chatId, handleLinkFound);
      // If connection successful, we are now "Listening" (which we treat as partial success/streaming)
      setStatus(AnalysisStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Bağlantı hatası. Kanal adını kontrol edin.");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      kickService.disconnect();
    };
  }, []);

  // Separate Active and Archived Links
  const activeLinks = React.useMemo(() => {
    return result?.links.filter(l => !l.visited) || [];
  }, [result]);

  const archivedLinks = React.useMemo(() => {
    return result?.links.filter(l => l.visited) || [];
  }, [result]);

  // Group ACTIVE links by category for display
  const groupedLinks = React.useMemo<Record<string, LinkItem[]>>(() => {
    const groups: Record<string, LinkItem[]> = {};
    activeLinks.forEach(link => {
      if (!groups[link.category]) {
        groups[link.category] = [];
      }
      groups[link.category].push(link);
    });
    return groups;
  }, [activeLinks]);

  // Extract unique categories for filter (only from active links)
  const categories = React.useMemo(() => {
    if (!result) return [];
    const cats = Array.from(new Set(activeLinks.map(link => link.category)));
    return ['ALL', ...cats];
  }, [activeLinks, result]);

  // Filter groups based on selection
  const filteredGroups = React.useMemo(() => {
    if (selectedCategory === 'ALL') return groupedLinks;
    return { [selectedCategory]: groupedLinks[selectedCategory] || [] };
  }, [groupedLinks, selectedCategory]);

  const getCategoryCount = (cat: string) => {
    if (cat === 'ALL') return activeLinks.length;
    return groupedLinks[cat]?.length || 0;
  };

  const isLive = status === AnalysisStatus.SUCCESS || status === AnalysisStatus.LOADING;

  return (
    <div className="min-h-screen bg-black text-neutral-300 font-sans selection:bg-blue-900 selection:text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        
        {/* Header - Now includes Status Controls and Clock */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
              <Bird className="text-blue-500 w-10 h-10" strokeWidth={2.5} />
              LinKick 
            </h1>
            <p className="text-neutral-500 text-lg max-w-lg">
              Kick.com canlı sohbet link yakalayıcı.
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Clock Component */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg shadow-lg">
              <Clock size={16} className="text-blue-500" />
              <span className="text-white font-mono font-bold tracking-widest text-sm">
                {currentTime.toLocaleTimeString('tr-TR', { 
                  timeZone: 'Europe/Istanbul',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>

            {/* Status Indicators */}
            {isLive && (
              <div className="flex items-center gap-4 bg-neutral-900/50 p-2 pr-4 rounded-full border border-neutral-800 animate-fade-in">
                  <div className="flex items-center gap-2 pl-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    <span className="text-red-500 font-mono text-sm tracking-wide uppercase font-bold mr-2">CANLI</span>
                  </div>
                  <div className="w-px h-6 bg-neutral-800"></div>
                  <button 
                    type="button"
                    onClick={handleStop}
                    className="px-4 py-1.5 bg-neutral-800 text-neutral-300 hover:bg-red-900/80 hover:text-red-100 font-bold rounded-full transition-all text-xs flex items-center gap-2"
                  >
                    <StopCircle size={14} /> DURDUR
                  </button>
              </div>
            )}
          </div>
        </header>

        {/* Input Section */}
        <div className="mb-10">
          <form onSubmit={handleSubmit} className="relative max-w-2xl">
            {/* Input Box */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {status === AnalysisStatus.LOADING ? (
                   <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
                ) : isLive && result?.links ? (
                   <Bird className="h-5 w-5 text-blue-500" />
                ) : (
                   <Search className="h-5 w-5 text-neutral-500 group-focus-within:text-blue-500 transition-colors" />
                )}
              </div>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="Kick Kullanıcı Adı (örn: elraenn)"
                className={`block w-full pl-12 pr-4 py-4 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-blue-800 transition-all shadow-lg shadow-black/50 text-base`}
                disabled={status === AnalysisStatus.LOADING}
              />
              
              {/* Connect Button inside Input (Only when not live) */}
              {!isLive && (
                <div className="absolute right-2 top-2 bottom-2">
                  <button 
                    type="submit"
                    disabled={!chatId.trim()}
                    className="px-6 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 font-bold rounded-md transition-colors text-sm shadow-lg shadow-blue-900/20 h-full"
                  >
                    BAĞLAN
                  </button>
                </div>
              )}
            </div>

            {status === AnalysisStatus.IDLE && (
              <p className="mt-2 text-xs text-neutral-600 pl-1">
                *Canlı sohbette link paylaşıldığı anda aşağıya düşecektir.
              </p>
            )}
          </form>
        </div>

        {/* Error State */}
        {status === AnalysisStatus.ERROR && (
          <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-400 mb-8">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="animate-fade-in pb-24">
            
            {/* Filter and Archive Bar */}
            {(activeLinks.length > 0 || archivedLinks.length > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-neutral-900">
                
                {/* Left: Filters (Only visible if not in archive mode) */}
                <div className="flex items-center gap-3">
                  {!showArchive && activeLinks.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 text-neutral-500 mr-2">
                        <Filter size={16} />
                        <span className="text-sm font-medium">Filtrele:</span>
                      </div>
                      {categories.map(cat => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`group flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                            }`}
                          >
                            <span>{cat === 'ALL' ? 'Tümü' : cat}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                              isSelected 
                                ? 'bg-black/20 text-white' 
                                : 'bg-neutral-800 text-neutral-500 group-hover:bg-neutral-700 group-hover:text-neutral-300'
                            }`}>
                              {getCategoryCount(cat)}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                  {showArchive && (
                    <div className="flex items-center gap-2 text-neutral-500">
                       <Archive size={16} />
                       <span className="text-sm font-bold text-white uppercase tracking-wider">Arşiv / Ziyaret Edilenler</span>
                    </div>
                  )}
                </div>

                {/* Right: Archive Toggle & Open All Button */}
                <div className="ml-auto flex items-center gap-2">
                   {/* Open All Button - Moved Here */}
                   {!showArchive && selectedCategory === 'ALL' && activeLinks.length > 0 && (
                      <button
                        onClick={() => handleOpenBatch(activeLinks)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02]"
                      >
                        <span>TÜM LİNKLERİ AÇ</span>
                        <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{activeLinks.length}</span>
                      </button>
                   )}

                   <button
                    onClick={() => setShowArchive(!showArchive)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all border ${
                      showArchive
                        ? 'bg-neutral-800 text-white border-neutral-600'
                        : 'bg-neutral-900/50 text-neutral-500 border-neutral-800 hover:border-neutral-700 hover:text-neutral-300'
                    }`}
                   >
                     {showArchive ? <RotateCcw size={14} /> : <Archive size={14} />}
                     <span>{showArchive ? 'Aktif Linkler' : 'Arşiv'}</span>
                     {archivedLinks.length > 0 && (
                       <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                         showArchive ? 'bg-white/20 text-white' : 'bg-neutral-800 text-neutral-400'
                       }`}>
                         {archivedLinks.length}
                       </span>
                     )}
                   </button>
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="space-y-6">
              
              {/* LOADING STATE */}
              {!showArchive && activeLinks.length === 0 && isLive && (
                <div className="text-center py-16 border border-dashed border-neutral-800 rounded-lg bg-neutral-900/20">
                  <Loader2 className="animate-spin h-8 w-8 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-500 text-sm">Linkler Aranıyor...</p>
                </div>
              )}

              {/* ARCHIVE VIEW */}
              {showArchive && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 animate-fade-in">
                    {archivedLinks.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-neutral-600 text-sm italic">
                        Henüz arşivlenmiş (tıklanmış) bir link yok.
                      </div>
                    ) : (
                      archivedLinks.map((link, idx) => (
                        <LinkCard 
                          key={`archived-${link.url}-${idx}`} 
                          link={link} 
                        />
                      ))
                    )}
                 </div>
              )}

              {/* ACTIVE VIEW */}
              {!showArchive && (
                <>
                  {Object.entries(filteredGroups).map(([category, links]) => {
                    const linkItems = links as LinkItem[];
                    if (linkItems.length === 0) return null;
                    
                    return (
                      <div key={category} className="border-t border-neutral-800 pt-4 first:border-t-0 first:pt-0 animate-fade-in-up">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                              {category}
                            </h2>
                            <span className="text-xs text-neutral-500 font-mono bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
                              {linkItems.length} Link
                            </span>
                          </div>
                          
                          {/* Individual Category Open Button (Hidden if ALL is selected) */}
                          {selectedCategory !== 'ALL' && (
                            <button
                              onClick={() => handleOpenBatch(linkItems)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/20 hover:bg-blue-800/40 text-blue-400 hover:text-blue-200 text-xs font-bold rounded border border-blue-900/40 transition-all"
                            >
                              <ExternalLink size={12} />
                              HEPSİNİ AÇ
                            </button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                          {linkItems.map((link, idx) => (
                            <LinkCard 
                              key={`${link.url}-${idx}`} 
                              link={link} 
                              onVisit={handleVisit}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty State / Welcome */}
        {!result && status === AnalysisStatus.IDLE && (
          <div className="border border-dashed border-neutral-800 rounded-xl p-16 text-center bg-neutral-900/20">
            <div className="inline-flex items-center justify-center p-6 bg-blue-950/20 border border-blue-900/30 rounded-full mb-6">
              <Radio className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-3xl font-bold text-blue-100 mb-4">Linkleri Yakala</h3>
            <p className="text-neutral-400 text-xl max-w-lg mx-auto">
              Kick sohbetindeki bağlantıları anlık olarak listelemek için kanalı girin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;