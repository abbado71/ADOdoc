import React, { useRef } from 'react';
import {
  Undo,
  Redo,
  Printer,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ImagePlus,
  Check,
  Save,
  ZoomIn,
  Sparkles,
} from 'lucide-react';
import { EditorFormatting, ViewMode } from '../types';

interface GoogleDocsToolbarProps {
  viewMode: ViewMode;
  formatting: EditorFormatting;
  onChangeFormatting: (formatting: Partial<EditorFormatting>) => void;
  onApplyCommand: (command: string, value?: string) => void;
  onPrint: () => void;
  onManualSave: () => void;
  onInsertImageFile: (file: File) => void;
  zoomLevel: number;
  onChangeZoom: (newZoom: number) => void;
  isSaving: boolean;
}

const FONTS = [
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Google Sans', value: 'Google Sans, sans-serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Source Code Pro', value: 'Source Code Pro, monospace' },
];

export const GoogleDocsToolbar: React.FC<GoogleDocsToolbarProps> = ({
  viewMode,
  formatting,
  onChangeFormatting,
  onApplyCommand,
  onPrint,
  onManualSave,
  onInsertImageFile,
  zoomLevel,
  onChangeZoom,
  isSaving,
}) => {
  const isEditing = viewMode === 'edit';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onInsertImageFile(e.target.files[0]);
      // Reset input value so same file can be selected again
      e.target.value = '';
    }
  };

  return (
    <div className="bg-[#edf2fa] border-b border-[#dadce0] px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 overflow-x-auto text-gray-700 select-none scrollbar-none whitespace-nowrap touch-pan-x">
      {/* Hidden file input for inserting images into the document */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onApplyCommand('undo')}
          disabled={!isEditing}
          className="p-1.5 rounded hover:bg-[#d3e3fd] text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Annulla (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => onApplyCommand('redo')}
          disabled={!isEditing}
          className="p-1.5 rounded hover:bg-[#d3e3fd] text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Ripeti (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Print */}
      <button
        onClick={onPrint}
        className="p-1.5 rounded hover:bg-[#d3e3fd] text-gray-700 transition-colors hidden sm:inline-flex"
        title="Stampa documento (Ctrl+P)"
      >
        <Printer className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Zoom level */}
      <div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 text-xs text-gray-700 shrink-0">
        <ZoomIn className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
        <select
          value={zoomLevel}
          onChange={(e) => onChangeZoom(Number(e.target.value))}
          className="bg-transparent focus:outline-none cursor-pointer text-xs"
        >
          <option value={75}>75%</option>
          <option value={90}>90%</option>
          <option value={100}>100%</option>
          <option value={115}>115%</option>
          <option value={125}>125%</option>
        </select>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Heading / Style Selector */}
      <select
        disabled={!isEditing}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'p') onApplyCommand('formatBlock', '<p>');
          else if (val === 'h2') onApplyCommand('formatBlock', '<h2>');
          else if (val === 'h3') onApplyCommand('formatBlock', '<h3>');
          else if (val === 'blockquote') onApplyCommand('formatBlock', '<blockquote>');
        }}
        defaultValue="p"
        className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none cursor-pointer disabled:opacity-40 shrink-0"
      >
        <option value="p">Testo normale</option>
        <option value="h2">Titolo principale (H2)</option>
        <option value="h3">Sottotitolo (H3)</option>
        <option value="blockquote">Citazione</option>
      </select>

      {/* Font Family (Desktop & Tablet) */}
      <select
        value={formatting.fontFamily}
        onChange={(e) => onChangeFormatting({ fontFamily: e.target.value })}
        disabled={!isEditing}
        className="bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none cursor-pointer disabled:opacity-40 max-w-[110px] hidden md:block shrink-0"
      >
        {FONTS.map((font) => (
          <option key={font.name} value={font.value}>
            {font.name}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <div className="flex items-center bg-white border border-gray-300 rounded overflow-hidden shrink-0">
        <button
          disabled={!isEditing}
          onClick={() => onChangeFormatting({ fontSize: Math.max(10, formatting.fontSize - 1) })}
          className="px-2 py-1 hover:bg-gray-100 text-xs font-bold text-gray-600 disabled:opacity-40"
        >
          -
        </button>
        <span className="px-1.5 text-xs font-medium text-gray-800">{formatting.fontSize}</span>
        <button
          disabled={!isEditing}
          onClick={() => onChangeFormatting({ fontSize: Math.min(32, formatting.fontSize + 1) })}
          className="px-2 py-1 hover:bg-gray-100 text-xs font-bold text-gray-600 disabled:opacity-40"
        >
          +
        </button>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Bold, Italic, Underline */}
      <div className="flex items-center gap-0.5">
        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('bold');
            onChangeFormatting({ isBold: !formatting.isBold });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.isBold ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Grassetto (Ctrl+B)"
        >
          <Bold className="w-4 h-4 font-bold" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('italic');
            onChangeFormatting({ isItalic: !formatting.isItalic });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.isItalic ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Corsivo (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('underline');
            onChangeFormatting({ isUnderline: !formatting.isUnderline });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.isUnderline ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Sottolineato (Ctrl+U)"
        >
          <Underline className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Alignments */}
      <div className="flex items-center gap-0.5">
        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('justifyLeft');
            onChangeFormatting({ alignment: 'left' });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.alignment === 'left' ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Allinea a sinistra"
        >
          <AlignLeft className="w-4 h-4" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('justifyCenter');
            onChangeFormatting({ alignment: 'center' });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.alignment === 'center' ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Allinea al centro"
        >
          <AlignCenter className="w-4 h-4" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('justifyRight');
            onChangeFormatting({ alignment: 'right' });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.alignment === 'right' ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Allinea a destra"
        >
          <AlignRight className="w-4 h-4" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => {
            onApplyCommand('justifyFull');
            onChangeFormatting({ alignment: 'justify' });
          }}
          className={`p-1.5 rounded transition-colors disabled:opacity-40 ${
            formatting.alignment === 'justify' ? 'bg-[#d3e3fd] text-blue-800' : 'hover:bg-[#d3e3fd] text-gray-700'
          }`}
          title="Giustificato"
        >
          <AlignJustify className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Lists */}
      <div className="flex items-center gap-0.5">
        <button
          disabled={!isEditing}
          onClick={() => onApplyCommand('insertUnorderedList')}
          className="p-1.5 rounded hover:bg-[#d3e3fd] text-gray-700 disabled:opacity-40 transition-colors"
          title="Elenco puntato"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          disabled={!isEditing}
          onClick={() => onApplyCommand('insertOrderedList')}
          className="p-1.5 rounded hover:bg-[#d3e3fd] text-gray-700 disabled:opacity-40 transition-colors"
          title="Elenco numerato"
        >
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>

      <div className="h-5 w-px bg-gray-300 mx-1 shrink-0" />

      {/* Inserisci Immagine nel Documento (dal dispositivo o appunti) */}
      <button
        disabled={!isEditing}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-gray-300 text-blue-700 disabled:opacity-40 text-xs font-semibold transition-colors shrink-0 shadow-2xs"
        title="Scegli un'immagine dal dispositivo da inserire nel documento (oppure incollala con Ctrl+V)"
      >
        <ImagePlus className="w-4 h-4 text-blue-600" />
        <span>Inserisci Immagine</span>
      </button>

      <div className="flex-1 min-w-[8px]" />

      {/* Manual Save Button */}
      {isEditing && (
        <button
          onClick={onManualSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all disabled:opacity-60 shrink-0 ml-1"
          title="Salva subito e crea un punto di versione"
        >
          {isSaving ? (
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Salva Ora</span>
        </button>
      )}

      {!isEditing && (
        <span className="text-[11px] text-gray-500 italic px-2 flex items-center gap-1 shrink-0">
          <Check className="w-3.5 h-3.5 text-green-600" />
          Modalità Lettura
        </span>
      )}
    </div>
  );
};
