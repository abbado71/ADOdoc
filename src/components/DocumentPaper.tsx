import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Edit3,
  Calendar,
  HardDrive,
  Sparkles,
  Trash2,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  X,
} from 'lucide-react';
import { Topic, ViewMode, EditorFormatting } from '../types';
import { optimizeImageFile } from '../utils/imageOptimizer';

interface DocumentPaperProps {
  topic: Topic;
  viewMode: ViewMode;
  formatting: EditorFormatting;
  zoomLevel: number;
  existingCategories: string[];
  onUpdateTopic: (updatedFields: Partial<Topic>, isSignificantEdit?: boolean) => void;
  onToggleViewMode: () => void;
  onNotify?: (message: string) => void;
}

export const DocumentPaper: React.FC<DocumentPaperProps> = ({
  topic,
  viewMode,
  formatting,
  zoomLevel,
  existingCategories,
  onUpdateTopic,
  onToggleViewMode,
  onNotify,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const isEditing = viewMode === 'edit';

  // Selected image state for interactive resizing
  const [selectedImgEl, setSelectedImgEl] = useState<HTMLImageElement | null>(null);
  const [selectedImgWidth, setSelectedImgWidth] = useState<number>(100);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);

  // Synchronize contentEditable HTML when topic changes or switching topics
  useEffect(() => {
    if (contentRef.current) {
      if (contentRef.current.innerHTML !== topic.content) {
        contentRef.current.innerHTML = topic.content || '<p><br></p>';
      }
    }
    // Deselect any image when switching topics
    setSelectedImgEl(null);
    setToolbarPos(null);
  }, [topic.id]);

  // When switching between view and edit modes, ensure DOM is fully aligned
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = topic.content || '<p><br></p>';
    }
    setSelectedImgEl(null);
    setToolbarPos(null);
  }, [viewMode]);

  const handleContentInput = useCallback(() => {
    if (contentRef.current) {
      const newHtml = contentRef.current.innerHTML;
      onUpdateTopic({ content: newHtml }, false);
    }
  }, [onUpdateTopic]);

  /**
   * Updates the position of the floating image resize toolbar relative to the selected image
   */
  const updateToolbarPosition = useCallback((img: HTMLImageElement) => {
    const parentContainer = contentRef.current?.closest('.google-doc-page');
    if (!parentContainer) return;

    const parentRect = parentContainer.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Center the toolbar directly under the image, bounded by the page container
    const approxToolbarWidth = Math.min(330, Math.max(260, parentRect.width - 24));
    const idealLeft = imgRect.left - parentRect.left + (imgRect.width / 2) - (approxToolbarWidth / 2);
    const clampedLeft = Math.max(8, Math.min(idealLeft, parentRect.width - approxToolbarWidth - 8));

    setToolbarPos({
      top: imgRect.bottom - parentRect.top + 8,
      left: clampedLeft,
    });

    // Detect current width %
    const styleWidth = img.style.width || img.getAttribute('width');
    if (styleWidth && styleWidth.includes('%')) {
      setSelectedImgWidth(parseInt(styleWidth, 10));
    } else {
      setSelectedImgWidth(100);
    }
  }, []);

  /**
   * Listen to clicks inside the editor to select an image for resizing or deselect
   */
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target && target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setSelectedImgEl(img);
      updateToolbarPosition(img);
      img.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (!target.closest('.image-resize-toolbar')) {
      setSelectedImgEl(null);
      setToolbarPos(null);
    }
  };

  /**
   * Set width on the selected image element and trigger real-time save
   */
  const handleResizeImage = (widthPercent: number) => {
    if (!selectedImgEl) return;
    const clamped = Math.max(15, Math.min(100, widthPercent));
    selectedImgEl.style.width = `${clamped}%`;
    selectedImgEl.style.maxWidth = '100%';
    selectedImgEl.style.height = 'auto';
    setSelectedImgWidth(clamped);
    handleContentInput();
  };

  /**
   * Set alignment on the selected image
   */
  const handleAlignImage = (alignment: 'left' | 'center' | 'right') => {
    if (!selectedImgEl) return;
    selectedImgEl.style.display = 'block';
    if (alignment === 'center') {
      selectedImgEl.style.marginLeft = 'auto';
      selectedImgEl.style.marginRight = 'auto';
    } else if (alignment === 'right') {
      selectedImgEl.style.marginLeft = 'auto';
      selectedImgEl.style.marginRight = '0';
    } else {
      selectedImgEl.style.marginLeft = '0';
      selectedImgEl.style.marginRight = 'auto';
    }
    handleContentInput();
  };

  /**
   * Delete selected image
   */
  const handleDeleteImage = () => {
    if (!selectedImgEl) return;
    const parent = selectedImgEl.parentElement;
    selectedImgEl.remove();
    // If parent paragraph is empty, clean it up or leave br
    if (parent && parent.innerHTML.trim() === '') {
      parent.innerHTML = '<br>';
    }
    setSelectedImgEl(null);
    setToolbarPos(null);
    handleContentInput();
    if (onNotify) {
      onNotify('Immagine rimossa dal documento.');
    }
  };

  /**
   * Keydown listener to delete selected image with Backspace or Delete
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImgEl && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteImage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImgEl]);

  /**
   * Inserts an image file (data URL) at current cursor position or appends to content
   */
  const insertImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    try {
      if (onNotify) {
        onNotify('Ottimizzazione immagine in corso...');
      }
      const dataUrl = await optimizeImageFile(file);
      if (!dataUrl) return;

      if (!isEditing) {
        onToggleViewMode();
      }

      // Default style with 75% width and centered for nice presentation
      const imgHtml = `<p style="text-align: center;"><img src="${dataUrl}" alt="Immagine inserita" style="width: 75%; max-width: 100%; height: auto; border-radius: 8px; margin: 12px auto; display: block; box-shadow: 0 1px 3px rgba(0,0,0,0.12); cursor: pointer;" /></p><p><br></p>`;

      if (contentRef.current) {
        contentRef.current.focus();
        const inserted = document.execCommand('insertHTML', false, imgHtml);
        if (!inserted) {
          contentRef.current.innerHTML += imgHtml;
        }
        handleContentInput();
        if (onNotify) {
          onNotify('Immagine ottimizzata e inserita!');
        }
        // Auto-select and show resize toolbar underneath the image
        setTimeout(() => {
          if (contentRef.current) {
            const imgs = contentRef.current.querySelectorAll('img');
            const latestImg = imgs[imgs.length - 1] as HTMLImageElement;
            if (latestImg) {
              setSelectedImgEl(latestImg);
              updateToolbarPosition(latestImg);
              latestImg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }, 80);
      }
    } catch (err) {
      console.error('Errore inserimento immagine:', err);
      if (onNotify) {
        onNotify("Errore durante l'inserimento dell'immagine.");
      }
    }
  };

  /**
   * Handles pasting images directly from system clipboard (Ctrl+V or mobile Paste)
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          insertImageFile(file);
        }
        return;
      }
    }
  };

  /**
   * Handles drag & drop of image files onto the document paper
   */
  const handleDrop = (e: React.DragEvent) => {
    if (!isEditing) return;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        insertImageFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isEditing && e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTopic({ title: e.target.value }, true);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTopic({ category: e.target.value }, false);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="transition-transform origin-top duration-150 ease-out w-full"
      style={{ transform: `scale(${zoomLevel / 100})` }}
    >
      <div className="google-doc-page relative p-6 sm:p-12 md:p-16 bg-white border border-gray-200 shadow-md my-2 sm:my-4 rounded-xs min-h-[960px] sm:min-h-[1056px]">
        {/* Document Header Metadata Bar - hidden on mobile so no extra row appears under Drive Synced */}
        <div className="hidden sm:flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-200 text-xs text-gray-500 gap-2 select-none print:hidden">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="flex items-center gap-1 font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] sm:text-xs">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Modifica: {formatDate(topic.updatedAt)}</span>
            </span>
            {topic.googleDriveSyncedAt && (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium text-[11px] sm:text-xs">
                <HardDrive className="w-3.5 h-3.5 shrink-0" />
                <span>Drive Synced</span>
              </span>
            )}
          </div>
        </div>

        {/* Intestazione esclusiva per Stampa e Salvataggio in PDF */}
        <div className="hidden print:block mb-6 pb-3 border-b-2 border-gray-800">
          {topic.category && (
            <div className="text-xs uppercase font-bold tracking-wider text-gray-700 mb-1">
              {topic.category}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 leading-tight">
            {topic.title}
          </h1>
        </div>

        {/* Category Metadata (No tags, no subtitle) */}
        {isEditing ? (
          <div className="mb-5 p-3 sm:p-4 bg-[#f8fafd] rounded-xl border border-blue-100/80 space-y-2 print:hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Categoria Documento</span>
              </div>
              <span className="text-[11px] text-gray-400 font-normal">
                Modifica libera
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                list="category-edit-suggestions"
                value={topic.category}
                onChange={handleCategoryChange}
                placeholder="es. Scienza, Lavoro, Personale..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-gray-900"
              />
              <datalist id="category-edit-suggestions">
                {existingCategories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Quick clickable chips for existing categories */}
            {existingCategories.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1 max-h-16 overflow-y-auto">
                {existingCategories
                  .filter((c) => c !== topic.category)
                  .slice(0, 6)
                  .map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateTopic({ category: c }, false)}
                      className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600 hover:border-blue-400 hover:text-blue-600"
                    >
                      {c}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mb-4 print:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 inline-block">
              {topic.category}
            </span>
          </div>
        )}

        {/* Topic Title (No Subtitle) */}
        <div className="mb-4 sm:mb-6 print:hidden">
          {isEditing ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-gray-500 uppercase">
                Titolo Documento:
              </label>
              <input
                type="text"
                value={topic.title}
                onChange={handleTitleChange}
                placeholder="Titolo del documento"
                className="w-full text-2xl sm:text-3xl font-bold text-gray-900 border-b-2 border-blue-500 pb-1 focus:outline-none font-['Google_Sans'] bg-transparent"
              />
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 tracking-tight font-['Google_Sans'] leading-tight">
              {topic.title}
            </h1>
          )}
        </div>

        {/* Divider line before document body */}
        <hr className="my-4 sm:my-6 border-gray-200 print:hidden" />

        {/* Floating Image Control & Resize Toolbar - Positioned directly underneath the selected image on BOTH Mobile & Desktop */}
        {selectedImgEl && isEditing && toolbarPos && (
          <div
            style={{
              top: `${toolbarPos.top}px`,
              left: `${toolbarPos.left}px`,
              maxWidth: 'calc(100% - 16px)',
            }}
            className="image-resize-toolbar absolute z-30 bg-[#202124] text-white rounded-xl shadow-2xl p-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs border border-gray-700 animate-fade-in select-none"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {/* Quick Size Presets */}
            <div className="flex items-center gap-1 border-r border-gray-700 pr-1.5 sm:pr-2">
              <span className="text-[10px] text-gray-400 uppercase font-semibold mr-0.5 hidden sm:inline">
                Dim.:
              </span>
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handleResizeImage(pct)}
                  className={`px-1.5 sm:px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    selectedImgWidth === pct
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Fine adjustment +/- */}
            <div className="flex items-center gap-0.5 border-r border-gray-700 pr-1.5 sm:pr-2">
              <button
                type="button"
                onClick={() => handleResizeImage(selectedImgWidth - 10)}
                className="p-1 hover:bg-gray-700 rounded text-gray-300"
                title="Riduci (-10%)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] text-gray-200 font-mono px-0.5 sm:px-1">
                {selectedImgWidth}%
              </span>
              <button
                type="button"
                onClick={() => handleResizeImage(selectedImgWidth + 10)}
                className="p-1 hover:bg-gray-700 rounded text-gray-300"
                title="Ingrandisci (+10%)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Alignment buttons */}
            <div className="flex items-center gap-0.5 border-r border-gray-700 pr-1.5 sm:pr-2">
              <button
                type="button"
                onClick={() => handleAlignImage('left')}
                className="p-1 hover:bg-gray-700 rounded text-gray-300"
                title="Allinea a sinistra"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignImage('center')}
                className="p-1 hover:bg-gray-700 rounded text-gray-300"
                title="Centra"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleAlignImage('right')}
                className="p-1 hover:bg-gray-700 rounded text-gray-300"
                title="Allinea a destra"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Delete Image button */}
            <button
              type="button"
              onClick={handleDeleteImage}
              className="p-1.5 hover:bg-red-600/80 bg-red-500/30 text-red-300 hover:text-white rounded transition-colors"
              title="Elimina questa immagine"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Close Toolbar */}
            <button
              type="button"
              onClick={() => {
                setSelectedImgEl(null);
                setToolbarPos(null);
              }}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
              title="Chiudi"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Document Content Canvas (Real-time Editable in Edit Mode with Complete Content Preserved) */}
        <div
          ref={contentRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onClick={handleEditorClick}
          onInput={handleContentInput}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            fontFamily: formatting.fontFamily,
            fontSize: `${formatting.fontSize}px`,
            textAlign: formatting.alignment,
          }}
          className={`document-content outline-none leading-relaxed min-h-[450px] transition-all text-gray-900 ${
            isEditing
              ? 'p-3 sm:p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/10 focus:border-blue-500'
              : ''
          }`}
          dangerouslySetInnerHTML={!isEditing ? { __html: topic.content || '<p><br></p>' } : undefined}
        />
      </div>
    </div>
  );
};
