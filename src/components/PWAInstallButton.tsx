import React, { useState } from 'react';
import { Download, Monitor, Smartphone, X, CheckCircle2, Info, Copy, Check, QrCode } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const getPublicUrl = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin && (origin.includes('ais-dev-') || origin.includes('ais-pre-'))) {
        return origin;
      }
    }
    return 'https://ais-dev-vbo7u22ysnglcm36pshr5f-160749320957.europe-west3.run.app';
  };

  const devUrl = 'https://ais-dev-vbo7u22ysnglcm36pshr5f-160749320957.europe-west3.run.app';
  const preUrl = 'https://ais-pre-vbo7u22ysnglcm36pshr5f-160749320957.europe-west3.run.app';
  
  const [selectedUrlType, setSelectedUrlType] = useState<'dev' | 'pre'>('dev');
  const appUrl = window.location.origin + import.meta.env.BASE_URL;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(appUrl)}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleButtonClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {/* Install / Mobile Button in Header */}
      <button
        onClick={handleButtonClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer"
        title="Apri su smartphone o installa come app"
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-600" />
        <span>{isInstalled ? 'Apri su Cellulare' : 'Installa / Cellulare'}</span>
      </button>

      {/* Guide Modal: PC & Android / iOS Instructions + QR Code */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div 
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-[#f8fafd] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                    Come vedere e installare ADOdoc su cellulare
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Accessibile da qualsiasi smartphone Android e iPhone
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 text-xs text-gray-700 overflow-y-auto flex-1">
              {/* Important Explanatory Notice */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Perché compariva &quot;Impossibile trovare la pagina&quot;?</span>
                </p>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  L&apos;indirizzo <strong>ais-dev</strong> (qui sotto) è quello <strong>attivo subito</strong> mentre lavori nell&apos;editor. Richiede semplicemente di aver fatto l&apos;accesso con il tuo account Google nel browser del cellulare.
                </p>
                <p className="text-[11px] text-amber-800/90 leading-relaxed">
                  L&apos;indirizzo pubblico <strong>ais-pre</strong>, invece, diventa attivo appena fai clic sul pulsante <strong>&quot;Share&quot; / &quot;Condividi&quot;</strong> in alto a destra nella schermata di Google AI Studio.
                </p>
              </div>

              {/* QR Code & Direct Link Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50/70 border border-blue-200/80 text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>Inquadra con la Fotocamera del tuo Cellulare</span>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white p-3 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="p-2 bg-white rounded-lg border border-gray-200 shrink-0">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code per aprire ADOdoc" 
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto"
                      loading="lazy"
                    />
                  </div>
                  <div className="text-left space-y-2 flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">
                      Punta la fotocamera del tuo <strong>Android</strong> o <strong>iPhone</strong> sul codice QR per aprire istantaneamente <strong>ADOdoc</strong>.
                    </p>
                    <div className="pt-1">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Link attivo:
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          readOnly
                          value={appUrl}
                          className="text-[11px] bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-700 font-mono w-full truncate select-all"
                        />
                        <button
                          onClick={handleCopyLink}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                            copied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Copiato!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copia
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Android Card */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs sm:text-sm">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Su Android (Google Chrome o Edge)</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Puoi usarla direttamente nel browser o aggiungerla come app vera e propria:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-800 font-medium pl-1 text-[11px]">
                  <li>Apri il link in <strong>Google Chrome</strong> sul tuo telefono.</li>
                  <li>Tocca i <strong>3 puntini verticali (⋮)</strong> in alto a destra.</li>
                  <li>Seleziona <strong>&quot;Installa applicazione&quot;</strong> oppure <strong>&quot;Aggiungi a schermata Home&quot;</strong>.</li>
                  <li>L&apos;icona di <strong>ADOdoc</strong> apparirà sulla schermata iniziale e si aprirà a schermo intero senza barre del browser!</li>
                </ol>
              </div>

              {/* iOS Card */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-xs sm:text-sm">
                  <Smartphone className="w-4 h-4 text-purple-600" />
                  <span>Su iPhone / iPad (Safari)</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Installabile in 2 tocchi direttamente da Safari:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-gray-800 font-medium pl-1 text-[11px]">
                  <li>Apri il link su <strong>Safari</strong>.</li>
                  <li>Tocca l&apos;icona <strong>Condividi</strong> (quadrato con freccia verso l&apos;alto in basso al centro).</li>
                  <li>Scorri e premi <strong>&quot;Aggiungi alla schermata Home&quot;</strong>.</li>
                  <li>Tocca <strong>&quot;Aggiungi&quot;</strong> in alto a destra.</li>
                </ol>
              </div>

              {/* PC Card */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-1.5">
                <div className="flex items-center gap-2 text-gray-800 font-bold text-xs">
                  <Monitor className="w-4 h-4 text-gray-600" />
                  <span>Su PC (Chrome o Edge)</span>
                </div>
                <p className="text-gray-600 leading-relaxed text-[11px]">
                  Basta cliccare sull&apos;icona di installazione nella barra degli indirizzi URL a destra (o sul pulsante &quot;Installa&quot;) per usarla come programma da scrivania.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pronta per tutti i dispositivi</span>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

