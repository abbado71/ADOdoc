import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import { Topic } from '../types';

interface NewTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (newTopic: Pick<Topic, 'title' | 'category' | 'content'>) => void;
  existingCategories: string[];
}

export const NewTopicModal: React.FC<NewTopicModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  existingCategories = [],
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');

  if (!isOpen) return null;

  // Filter and sort unique existing categories
  const categoriesList = Array.from(
    new Set(existingCategories.map((c) => c.trim()).filter(Boolean))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = category.trim() || 'Generale';

    // Totalmente vuoto come richiesto dall'utente
    onCreate({
      title: title.trim(),
      category: finalCategory,
      content: '<p><br></p>',
    });

    // Reset form
    setTitle('');
    setCategory('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafd]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Nuovo Documento
              </h3>
              <p className="text-xs text-gray-500">
                Inserisci titolo e categoria (il foglio sarà totalmente vuoto)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form: Solo Titolo e Categoria */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Titolo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Titolo del Documento *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="es. Relazione Mensile, Studio Filosofia, Appunti Progetto..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Categoria Libera con suggerimenti dinamici */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Categoria *
              </label>
              <span className="text-[11px] text-gray-400">
                Scegli o scrivi una nuova
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                list="category-suggestions-modal"
                placeholder="es. Lavoro, Studio, Personale (o digita nuova)..."
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <datalist id="category-suggestions-modal">
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            {/* Quick clickable chips of existing categories */}
            {categoriesList.length > 0 && (
              <div className="pt-1.5">
                <span className="text-[11px] text-gray-500 block mb-1">
                  Categorie esistenti (tocca per selezionare):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-200/60">
                  {categoriesList.map((cat) => {
                    const isSelected = category.toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              Crea Documento Vuoto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
