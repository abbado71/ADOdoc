import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Layers,
  X,
  SlidersHorizontal,
  FileText,
  CloudCheck,
  Folder,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Topic } from '../types';

interface TopicSidebarProps {
  topics: Topic[];
  selectedTopicId: string | null;
  onSelectTopic: (topic: Topic) => void;
  onOpenNewTopicModal: () => void;
  onRequestDeleteTopic: (topic: Topic) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const TopicSidebar: React.FC<TopicSidebarProps> = ({
  topics,
  selectedTopicId,
  onSelectTopic,
  onOpenNewTopicModal,
  onRequestDeleteTopic,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutti');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'created'>('updated');
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);

  // Derive all unique categories dynamically from existing topics
  const categories = useMemo(() => {
    const set = new Set<string>();
    topics.forEach((t) => {
      if (t.category && t.category.trim()) {
        set.add(t.category.trim());
      }
    });
    return ['Tutti', ...Array.from(set)];
  }, [topics]);

  // Compute document counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Tutti: topics.length };
    topics.forEach((t) => {
      const c = t.category?.trim();
      if (c) {
        counts[c] = (counts[c] || 0) + 1;
      }
    });
    return counts;
  }, [topics]);

  // Filter and sort topics: RICERCA ESCLUSIVAMENTE SU TITOLO E CATEGORIA
  const filteredTopics = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return topics
      .filter((t) => {
        // Filtro per categoria selezionata
        if (selectedCategory !== 'Tutti' && t.category !== selectedCategory) {
          return false;
        }

        // Se la casella di ricerca è vuota, passa
        if (!q) return true;

        // La ricerca va fatta SOLTANTO sulle parole del TITOLO e sulla CATEGORIA
        const inTitle = t.title.toLowerCase().includes(q);
        const inCategory = (t.category || '').toLowerCase().includes(q);

        return inTitle || inCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title, 'it');
        }
        if (sortBy === 'created') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [topics, searchQuery, selectedCategory, sortBy]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('it-IT', {
        day: 'numeric',
        month: 'short',
      }).format(d);
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-2xs animate-fade-in print:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-10 w-80 sm:w-88 max-w-[88vw] lg:max-w-none bg-[#f8fafd] border-r border-[#dadce0] flex flex-col transition-transform duration-200 ease-in-out shrink-0 print:hidden ${
          isOpen ? 'translate-x-0 shadow-2xl lg:shadow-none' : '-translate-x-full lg:hidden'
        }`}
      >
        {/* Top Header of Sidebar */}
        <div className="p-3.5 sm:p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Indice Documenti
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onOpenNewTopicModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Aggiungi nuovo documento"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuovo</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg lg:hidden"
                aria-label="Chiudi menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ricerca per Titolo e Categoria */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cerca per titolo o categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 focus:bg-white border border-gray-300 focus:border-blue-500 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5"
                title="Cancella ricerca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Dynamic Categories (Avvolgimento a capo e selettore a tendina per non eccedere lo schermo) */}
        <div className="px-3 py-2.5 border-b border-gray-200 bg-white/80">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider truncate">
                Categorie ({categories.length - 1})
              </span>
            </div>

            {/* Menu a tendina rapido: comodissimo se le categorie sono tante */}
            {categories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-[11px] font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md px-2 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[130px] truncate cursor-pointer"
                title="Seleziona categoria dall'elenco a tendina"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat} ({categoryCounts[cat] || 0})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tag delle Categorie: usano flex-wrap così vanno a capo e non escono MAI dalla larghezza dello schermo */}
          <div
            className={`flex flex-wrap gap-1.5 transition-all ${
              !isCategoriesExpanded && categories.length > 6
                ? 'max-h-[72px] overflow-hidden'
                : 'max-h-44 overflow-y-auto'
            }`}
          >
            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-xs ring-1 ring-blue-700/30'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200/60'
                  }`}
                  title={`Filtra per ${cat} (${count} ${count === 1 ? 'documento' : 'documenti'})`}
                >
                  <span className="truncate max-w-[120px]">{cat}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/25 text-white'
                        : 'bg-gray-200/90 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pulsante Mostra Tutte / Riduci se ci sono più di 6 categorie */}
          <div className="flex items-center justify-between mt-1.5 pt-1 text-[11px]">
            {categories.length > 6 ? (
              <button
                type="button"
                onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
                className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer py-0.5"
              >
                {isCategoriesExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Mostra meno</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Tutte le categorie ({categories.length - 1})</span>
                  </>
                )}
              </button>
            ) : <span />}

            {selectedCategory !== 'Tutti' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('Tutti')}
                className="text-gray-500 hover:text-red-600 font-medium cursor-pointer ml-auto"
              >
                Azzera filtro
              </button>
            )}
          </div>

          {/* Conteggio documenti e ordinamento */}
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100 text-[11px] text-gray-500">
            <span className="font-medium">
              {filteredTopics.length} {filteredTopics.length === 1 ? 'documento' : 'documenti'}
              {selectedCategory !== 'Tutti' && (
                <span className="text-blue-600 font-semibold ml-1">({selectedCategory})</span>
              )}
            </span>
            <div className="flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[11px] text-gray-600 focus:outline-none cursor-pointer font-medium hover:text-gray-900"
              >
                <option value="updated">Ultima modifica</option>
                <option value="title">Titolo A-Z</option>
                <option value="created">Data creazione</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Topic Card List (Solo Titolo e Categoria) */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {filteredTopics.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs font-medium text-gray-600">Nessun documento trovato</p>
              <p className="text-[11px] text-gray-400 mt-1">
                {searchQuery ? 'Nessun titolo o categoria corrispondente' : 'Crea il primo documento!'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Tutti');
                  }}
                  className="mt-3 px-3 py-1 text-xs text-blue-600 hover:underline"
                >
                  Azzera filtri
                </button>
              )}
            </div>
          ) : (
            filteredTopics.map((topic) => {
              const isSelected = topic.id === selectedTopicId;

              return (
                <div
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className={`group relative rounded-xl p-3 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-50/90 border-blue-400 shadow-xs ring-1 ring-blue-300/40'
                      : 'bg-white hover:bg-gray-50/80 border-gray-200/80 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Clean Document Badge */}
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                      }`}
                    >
                      <FileText className="w-5 h-5 stroke-[2]" />
                    </div>

                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider truncate">
                          {topic.category}
                        </span>
                        {topic.googleDriveSyncedAt && (
                          <span title="Sincronizzato su Google Drive">
                            <CloudCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug line-clamp-2 mt-0.5 ${
                          isSelected ? 'text-blue-950 font-semibold' : 'text-gray-900'
                        }`}
                      >
                        {topic.title}
                      </h4>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/80 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(topic.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delete button: SEMPRE VISIBILE anche su touch/iPhone */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestDeleteTopic(topic);
                    }}
                    className="absolute top-2.5 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                    title="Elimina questo documento"
                    aria-label={`Elimina ${topic.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
