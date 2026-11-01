import { Topic } from '../types';

/**
 * Checks if the current browser environment is iOS Standalone (Home Screen WebClip).
 */
export function isIosStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIos && isStandalone;
}

/**
 * Checks if running on any mobile device (iOS or Android).
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
}

/**
 * Generates a clean, professional A4 PDF from a Topic.
 * If running on iOS/mobile with Web Share support, invokes native system share
 * which allows AirPrint printing AND saving to Apple Files app.
 * Otherwise triggers standard PDF download.
 */
export async function exportTopicToPdf(
  topic: Topic,
  options?: {
    forceDownload?: boolean;
    onProgress?: (status: string) => void;
  }
): Promise<{ success: boolean; method: 'share' | 'download' | 'fallback' }> {
  const cleanTitle = (topic.title || 'Documento').trim().replace(/[/\\?%*:|"<>]/g, '-');
  const fileName = `${cleanTitle} - ADOdoc.pdf`;

  if (options?.onProgress) {
    options.onProgress('Preparazione documento...');
  }

  // 1. Create an off-screen container matching standard A4 proportions (800px width)
  const printWrapper = document.createElement('div');
  printWrapper.id = 'pdf-export-temp-container';
  printWrapper.style.position = 'fixed';
  printWrapper.style.left = '-9999px';
  printWrapper.style.top = '0';
  printWrapper.style.width = '800px';
  printWrapper.style.backgroundColor = '#ffffff';
  printWrapper.style.color = '#1a1a1a';
  printWrapper.style.padding = '40px';
  printWrapper.style.boxSizing = 'border-box';
  printWrapper.style.fontFamily = 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  printWrapper.style.zIndex = '-9999';

  // Build clean HTML matching ADOdoc document paper
  printWrapper.innerHTML = `
    <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #333333;">
      ${
        topic.category
          ? `<div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              ${topic.category}
            </div>`
          : ''
      }
      <h1 style="font-size: 26px; font-weight: 700; color: #111827; margin: 0; line-height: 1.25;">
        ${topic.title || 'Senza Titolo'}
      </h1>
      <div style="font-size: 10px; color: #6b7280; margin-top: 8px;">
        Ultima modifica: ${new Date(topic.updatedAt || topic.createdAt || Date.now()).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}
      </div>
    </div>
    <div class="document-content" style="font-size: 13.5px; line-height: 1.6; color: #374151;">
      ${topic.content || '<p>Nessun contenuto nel documento.</p>'}
    </div>
  `;

  // Ensure all images in the container have appropriate styling and CORS
  const imgs = printWrapper.querySelectorAll('img');
  imgs.forEach((img) => {
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '12px auto';
    img.style.borderRadius = '6px';
    img.setAttribute('crossOrigin', 'anonymous');
  });

  document.body.appendChild(printWrapper);

  try {
    if (options?.onProgress) {
      options.onProgress('Generazione grafica in corso...');
    }

    // 2. Render canvas at high-res scale (2x)
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(printWrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 800,
    });

    if (options?.onProgress) {
      options.onProgress('Creazione file PDF...');
    }

    // 3. Setup A4 dimensions in mm
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12; // 12mm margin
    const contentWidth = pageWidth - margin * 2; // 186mm
    const contentHeight = pageHeight - margin * 2; // 273mm

    const pxPerMm = canvas.width / contentWidth;
    const pageCanvasHeight = Math.floor(contentHeight * pxPerMm);

    const totalPages = Math.ceil(canvas.height / pageCanvasHeight);

    // 4. Paginate cleanly across multiple A4 pages
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      const sourceY = page * pageCanvasHeight;
      const sourceHeight = Math.min(pageCanvasHeight, canvas.height - sourceY);

      // Create page canvas slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = pageCanvasHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvasHeight);
        ctx.drawImage(
          canvas,
          0,
          sourceY,
          canvas.width,
          sourceHeight,
          0,
          0,
          canvas.width,
          sourceHeight
        );
      }

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(pageImgData, 'JPEG', margin, margin, contentWidth, contentHeight);

      // Optional page footer number for multi-page documents
      if (totalPages > 1) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Pagina ${page + 1} di ${totalPages}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
    }

    // 5. Output PDF Blob
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 6. Native Share Sheet for iOS / Mobile (allows both AirPrint & Save to Files)
    const canShareFiles =
      !options?.forceDownload &&
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [pdfFile] });

    if (canShareFiles) {
      if (options?.onProgress) {
        options.onProgress('Apertura menu di condivisione...');
      }
      try {
        await navigator.share({
          files: [pdfFile],
          title: topic.title,
          text: `Documento "${topic.title}" esportato da ADOdoc`,
        });
        return { success: true, method: 'share' };
      } catch (shareErr) {
        // User cancelled share dialog or share was aborted
        if ((shareErr as Error)?.name === 'AbortError') {
          return { success: true, method: 'share' };
        }
        console.warn('Share fallito, fallback su download:', shareErr);
      }
    }

    // 7. Fallback or Desktop: direct download
    pdf.save(fileName);
    return { success: true, method: 'download' };
  } catch (err) {
    console.error('Errore durante la generazione PDF:', err);
    throw err;
  } finally {
    // Clean up temporary DOM node
    if (document.body.contains(printWrapper)) {
      document.body.removeChild(printWrapper);
    }
  }
}

/**
 * Exports all topics into a single combined multi-page A4 PDF file.
 * Includes a clean Table of Contents / Index page at the beginning,
 * followed by each topic on fresh pages with proper pagination and typography.
 */
export async function exportAllTopicsToSinglePdf(
  topics: Topic[],
  options?: {
    onProgress?: (message: string, current: number, total: number) => void;
  }
): Promise<{ success: boolean; totalTopics: number; totalPages: number }> {
  if (!topics || topics.length === 0) {
    throw new Error('Nessun argomento disponibile da esportare.');
  }

  const { jsPDF } = await import('jspdf');
  const { default: html2canvas } = await import('html2canvas');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12; // 12mm margin
  const contentWidth = pageWidth - margin * 2; // 186mm
  const contentHeight = pageHeight - margin * 2; // 273mm

  const todayStr = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // Helper function to render an off-screen HTML block to canvas
  const renderHtmlBlockToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    wrapper.style.backgroundColor = '#ffffff';
    wrapper.style.color = '#1a1a1a';
    wrapper.style.padding = '40px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.fontFamily = 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    wrapper.style.zIndex = '-9999';
    wrapper.innerHTML = html;

    const imgs = wrapper.querySelectorAll('img');
    imgs.forEach((img) => {
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '12px auto';
      img.style.borderRadius = '6px';
      img.setAttribute('crossOrigin', 'anonymous');
    });

    document.body.appendChild(wrapper);
    try {
      return await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800,
      });
    } finally {
      if (document.body.contains(wrapper)) {
        document.body.removeChild(wrapper);
      }
    }
  };

  // 1. Generate Table of Contents / Index Cover Page
  if (options?.onProgress) {
    options.onProgress('Creazione indice generale...', 0, topics.length);
  }

  const tocHtml = `
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
      <div style="font-size: 13px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">
        ADOdoc
      </div>
      <h1 style="font-size: 28px; font-weight: 800; color: #111827; margin: 0 0 8px 0;">
        Archivio Completo Documenti
      </h1>
      <p style="font-size: 12px; color: #6b7280; margin: 0;">
        Esportazione del ${todayStr} • Raccolta di <strong>${topics.length}</strong> ${
          topics.length === 1 ? 'argomento' : 'argomenti'
        }
      </p>
    </div>

    <div style="margin-top: 25px;">
      <h2 style="font-size: 15px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px;">
        Indice degli Argomenti
      </h2>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${topics
          .map(
            (t, idx) => `
          <div style="display: flex; align-items: baseline; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px;">
            <div style="display: flex; align-items: baseline; gap: 8px; max-width: 80%;">
              <span style="font-weight: 700; color: #2563eb; min-width: 24px;">${idx + 1}.</span>
              <span style="font-weight: 600; color: #111827;">${t.title || 'Senza Titolo'}</span>
            </div>
            ${
              t.category
                ? `<span style="font-size: 10px; font-weight: 700; color: #4b5563; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                    ${t.category}
                  </span>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  const tocCanvas = await renderHtmlBlockToCanvas(tocHtml);
  const pxPerMm = tocCanvas.width / contentWidth;
  const pageCanvasHeight = Math.floor(contentHeight * pxPerMm);
  const tocPages = Math.ceil(tocCanvas.height / pageCanvasHeight);

  for (let p = 0; p < tocPages; p++) {
    if (p > 0) pdf.addPage();
    const sourceY = p * pageCanvasHeight;
    const sourceHeight = Math.min(pageCanvasHeight, tocCanvas.height - sourceY);

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = tocCanvas.width;
    sliceCanvas.height = pageCanvasHeight;
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, pageCanvasHeight);
      ctx.drawImage(
        tocCanvas,
        0,
        sourceY,
        tocCanvas.width,
        sourceHeight,
        0,
        0,
        tocCanvas.width,
        sourceHeight
      );
    }
    const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
  }

  // 2. Render each topic sequentially on fresh pages
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    if (options?.onProgress) {
      options.onProgress(
        `Elaborazione argomento ${i + 1} di ${topics.length}: "${topic.title}"...`,
        i + 1,
        topics.length
      );
    }

    const topicHtml = `
      <div style="margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          ${
            topic.category
              ? `<span style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em; background: #eff6ff; padding: 2px 8px; border-radius: 4px;">
                  ${topic.category}
                </span>`
              : '<span></span>'
          }
          <span style="font-size: 10px; font-weight: 600; color: #6b7280;">
            Argomento ${i + 1} di ${topics.length}
          </span>
        </div>
        <h1 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0 0 6px 0; line-height: 1.3;">
          ${topic.title || 'Senza Titolo'}
        </h1>
        <div style="font-size: 10px; color: #9ca3af;">
          Ultimo aggiornamento: ${new Date(topic.updatedAt || topic.createdAt || Date.now()).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>
      <div class="document-content" style="font-size: 13.5px; line-height: 1.6; color: #374151;">
        ${topic.content || '<p>Nessun contenuto nel documento.</p>'}
      </div>
    `;

    const topicCanvas = await renderHtmlBlockToCanvas(topicHtml);
    const topicPxPerMm = topicCanvas.width / contentWidth;
    const topicPageCanvasHeight = Math.floor(contentHeight * topicPxPerMm);
    const pagesForThisTopic = Math.ceil(topicCanvas.height / topicPageCanvasHeight);

    for (let p = 0; p < pagesForThisTopic; p++) {
      // Always start each topic and topic overflow on fresh page
      pdf.addPage();

      const sourceY = p * topicPageCanvasHeight;
      const sourceHeight = Math.min(topicPageCanvasHeight, topicCanvas.height - sourceY);

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = topicCanvas.width;
      sliceCanvas.height = topicPageCanvasHeight;
      const ctx = sliceCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sliceCanvas.width, topicPageCanvasHeight);
        ctx.drawImage(
          topicCanvas,
          0,
          sourceY,
          topicCanvas.width,
          sourceHeight,
          0,
          0,
          topicCanvas.width,
          sourceHeight
        );
      }
      const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight);
    }
  }

  // 3. Stamp global footers with unified page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('ADOdoc - Archivio Completo Documenti', margin, pageHeight - 5);
    pdf.text(`Pagina ${p} di ${totalPages}`, pageWidth - margin, pageHeight - 5, {
      align: 'right',
    });
  }

  // 4. Download file
  if (options?.onProgress) {
    options.onProgress('Download file PDF in corso...', topics.length, topics.length);
  }

  const exportDate = new Date().toISOString().slice(0, 10);
  const outFileName = `ADOdoc_Archivio_Completo_${exportDate}.pdf`;
  pdf.save(outFileName);

  return { success: true, totalTopics: topics.length, totalPages };
}

