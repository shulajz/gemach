import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PICKUP_LOCATION, ORDER_CATEGORIES, getEventTypeLabel } from '../constants/he.js';
import { getItems } from '../firebase/items.js';
import { getDisplayImageUrl, getGoogleDriveId } from './imageUrl.js';

const OTHER_CATEGORY = { id: 'other', label: 'אחר' };

const CATEGORY_STYLES = {
  'plates-dairy': { header: '#0284c7', headerText: '#ffffff', rowBg: '#f0f9ff', rowAlt: '#e0f2fe', border: '#7dd3fc' },
  'plates-meat': { header: '#dc2626', headerText: '#ffffff', rowBg: '#fef2f2', rowAlt: '#fee2e2', border: '#fca5a5' },
  tablecloths: { header: '#0d9488', headerText: '#ffffff', rowBg: '#f0fdfa', rowAlt: '#ccfbf1', border: '#5eead4' },
  underplates: { header: '#7c3aed', headerText: '#ffffff', rowBg: '#f5f3ff', rowAlt: '#ede9fe', border: '#c4b5fd' },
  'table-design': { header: '#db2777', headerText: '#ffffff', rowBg: '#fdf2f8', rowAlt: '#fce7f3', border: '#f9a8d4' },
  baskets: { header: '#d97706', headerText: '#ffffff', rowBg: '#fffbeb', rowAlt: '#fef3c7', border: '#fcd34d' },
  'bowls-trays': { header: '#059669', headerText: '#ffffff', rowBg: '#ecfdf5', rowAlt: '#d1fae5', border: '#6ee7b7' },
  electrical: { header: '#4f46e5', headerText: '#ffffff', rowBg: '#eef2ff', rowAlt: '#e0e7ff', border: '#a5b4fc' },
  other: { header: '#64748b', headerText: '#ffffff', rowBg: '#f8fafc', rowAlt: '#f1f5f9', border: '#cbd5e1' },
};

const EVENT_TYPE_STYLES = {
  חלבי: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
  בשרי: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  'לא רלוונטי': { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

const getTabsForEventType = (eventType) =>
  ORDER_CATEGORIES.filter((category) => category.eventType === eventType || category.eventType === null);

const resolveCategoryId = (catalogItem) => {
  if (!catalogItem) return 'other';
  if (catalogItem.orderCategoryId) return catalogItem.orderCategoryId;
  if (catalogItem.category === 'חלבי') return 'plates-dairy';
  if (catalogItem.category === 'בשרי') return 'plates-meat';
  if (catalogItem.category === 'ניטרלי') return 'tablecloths';
  return 'other';
};

const groupOrderItemsByCategory = (order, catalogItems) => {
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
  const tabsOrder = [...getTabsForEventType(order.eventType), OTHER_CATEGORY];
  const groups = new Map(tabsOrder.map((tab) => [tab.id, []]));

  for (const line of order.items || []) {
    if (!line.quantity) continue;
    const catalogItem = catalogById.get(line.itemId);
    const categoryId = resolveCategoryId(catalogItem);
    const bucket = groups.get(categoryId) ?? groups.get('other');
    bucket.push({
      itemId: line.itemId,
      name: line.itemName || catalogItem?.name || 'פריט',
      quantity: line.quantity,
      imageUrl: catalogItem?.imageUrl || '',
    });
  }

  return tabsOrder
    .map((tab) => ({
      ...tab,
      items: (groups.get(tab.id) || []).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    }))
    .filter((group) => group.items.length > 0);
};

const formatEventDate = (eventDate) => {
  if (eventDate instanceof Date) return eventDate.toLocaleDateString('he-IL');
  if (!eventDate) return '';
  return new Date(eventDate).toLocaleDateString('he-IL');
};

const buildInfoField = (label, value, { bg = '#ffffff', border = '#99f6e4', valueColor = '#0f172a' } = {}) => `
  <div style="padding: 7px 12px; background: ${bg}; border-radius: 8px; border: 1px solid ${border};">
    <div style="font-size: 10px; font-weight: 600; color: #0f766e; margin-bottom: 2px; line-height: 1.2;">${escapeHtml(label)}</div>
    <div style="font-size: 13px; font-weight: 700; color: ${valueColor}; line-height: 1.25;">${escapeHtml(value || '—')}</div>
  </div>
`;

const buildCategoryTable = (group) => {
  const style = CATEGORY_STYLES[group.id] || CATEGORY_STYLES.other;
  const categoryQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
  const rows = group.items
    .map((item, index) => {
      const isLast = index === group.items.length - 1;
      const rowBorder = isLast ? '' : `border-bottom: 1px solid ${style.border};`;
      return `
        <tr style="background: ${index % 2 === 0 ? style.rowBg : style.rowAlt};">
          <td style="padding: 10px 14px; ${rowBorder} color: #1e293b; font-size: 13px; line-height: 1.4; font-weight: 600;">${escapeHtml(item.name)}</td>
          <td style="padding: 10px 12px; ${rowBorder} text-align: center; font-weight: 700; color: #0f766e; width: 56px; font-size: 14px;">${item.quantity}</td>
        </tr>`;
    })
    .join('');

  return `
    <div style="border-radius: 12px; overflow: hidden; border: 1px solid ${style.border}; break-inside: avoid;">
      <div style="background: ${style.header}; color: ${style.headerText}; padding: 12px 16px; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: space-between; gap: 12px; line-height: 1.3;">
        <span>${escapeHtml(group.label)}</span>
        <span style="font-size: 12px; font-weight: 600; opacity: 0.95; white-space: nowrap;">${categoryQty} יח׳</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: ${style.rowAlt};">
            <th style="padding: 8px 14px; text-align: right; font-weight: 700; color: #475569; font-size: 11px; border-bottom: 1px solid ${style.border};">פריט</th>
            <th style="padding: 8px 12px; text-align: center; font-weight: 700; color: #475569; font-size: 11px; width: 56px; border-bottom: 1px solid ${style.border};">כמות</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
};

/**
 * Builds an HTML string for the order content so the browser renders Hebrew correctly.
 * We capture this with html2canvas and add to PDF to avoid jsPDF's lack of Hebrew font support.
 */
const buildOrderHtml = (order, catalogItems = []) => {
  const eventDateStr = formatEventDate(order.eventDate);
  const groupedItems = groupOrderItemsByCategory(order, catalogItems);
  const totalQuantity = (order.items || []).reduce((sum, line) => sum + (line.quantity || 0), 0);
  const eventStyle = EVENT_TYPE_STYLES[order.eventType] || { bg: '#f0fdfa', text: '#115e59', border: '#99f6e4' };
  const categoryTables = groupedItems.map((group) => buildCategoryTable(group)).join('');
  const useTwoColumns = groupedItems.length >= 2;
  const exportedAt = new Date().toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

  return `
    <div dir="rtl" style="font-family: Heebo, sans-serif; width: 210mm; box-sizing: border-box; font-size: 12px; line-height: 1.4; color: #0f172a; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 18px 20px 16px; color: #ffffff;">
        <div style="font-size: 12px; font-weight: 600; opacity: 0.9; margin-bottom: 6px;">גמ״ח כלים ואירועים</div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">סיכום הזמנה</h1>
        <p style="margin: 8px 0 0; font-size: 12px; opacity: 0.92; line-height: 1.4;">אישור ראשוני — צוות הגמ״ח ייצור קשר לאחר בדיקת ההזמנה</p>
      </div>

      <div style="padding: 18px 18px 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; padding: 10px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px;">
          ${buildInfoField('שם מלא', order.customerName || '')}
          ${buildInfoField('טלפון', order.phone || '')}
          ${buildInfoField('עיר', order.city || '')}
          ${buildInfoField('תאריך האירוע', eventDateStr)}
          ${buildInfoField('סוג אירוע', getEventTypeLabel(order.eventType), {
            bg: eventStyle.bg,
            border: eventStyle.border,
            valueColor: eventStyle.text,
          })}
          ${buildInfoField('סטטוס', order.status || 'ממתין')}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #115e59;">פריטים להשאלה</h2>
          <div style="padding: 6px 14px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; white-space: nowrap; line-height: 1.3;">
            סה״כ ${totalQuantity} יח׳ · ${groupedItems.length} קטגוריות
          </div>
        </div>

        <div style="display: grid; grid-template-columns: ${useTwoColumns ? '1fr 1fr' : '1fr'}; gap: 14px; align-items: start;">
          ${categoryTables || '<p style="color: #64748b; font-size: 13px;">אין פריטים בהזמנה</p>'}
        </div>

        <div style="margin-top: 20px; padding: 14px 16px; border-radius: 12px; background: #fffbeb; border: 1px solid #f59e0b;">
          <div style="font-size: 12px; font-weight: 700; color: #92400e; margin-bottom: 6px;">מיקום איסוף</div>
          <div style="font-size: 13px; font-weight: 600; color: #78350f; line-height: 1.45;">${escapeHtml(PICKUP_LOCATION)}</div>
        </div>

        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; gap: 12px; font-size: 11px; color: #64748b;">
          <span>מזהה: ${escapeHtml(order.id || '')}</span>
          <span>${escapeHtml(exportedAt)}</span>
        </div>
      </div>
    </div>
  `;
};

const escapeHtml = (str) => {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const collectOrderProductLines = (order, catalogItems = []) => {
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
  const seen = new Set();
  const lines = [];
  for (const line of order.items || []) {
    if (!line.quantity || seen.has(line.itemId)) continue;
    seen.add(line.itemId);
    const catalogItem = catalogById.get(line.itemId);
    lines.push({
      itemId: line.itemId,
      name: line.itemName || catalogItem?.name || 'פריט',
      quantity: line.quantity,
      imageUrl: catalogItem?.imageUrl || '',
    });
  }
  return lines.sort((a, b) => a.name.localeCompare(b.name, 'he'));
};

const resolveImageCandidates = (url) => {
  if (!url) return [];
  const result = getDisplayImageUrl(url, 'w400');
  if (result && typeof result === 'object' && result.primary) {
    const driveId = getGoogleDriveId(url);
    const extras = driveId
      ? [
          `https://lh3.googleusercontent.com/d/${driveId}=w400`,
          `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`,
        ]
      : [];
    return [...extras, result.primary, result.fallback].filter(Boolean);
  }
  return [result].filter(Boolean);
};

const resizeImageSourceToDataUrl = (src, { useCrossOrigin = false } = {}) =>
  new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    if (useCrossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        if (!img.naturalWidth || !img.naturalHeight) {
          resolve(null);
          return;
        }
        const canvas = document.createElement('canvas');
        const maxSide = 280;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** Blob URLs are same-origin — safe for canvas export without CORS taint. */
const blobToResizedJpegDataUrl = async (blob) => {
  if (!blob || blob.size < 32) return null;
  // Reject obvious non-image error payloads (HTML/JSON from Drive)
  if (blob.type === 'text/html' || blob.type === 'application/json') return null;
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await resizeImageSourceToDataUrl(objectUrl, { useCrossOrigin: false });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const fetchUrlAsDataUrl = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return blobToResizedJpegDataUrl(blob);
  } catch {
    return null;
  }
};

/** Public Drive files via API key — googleapis.com allows CORS (unlike thumbnail hosts). */
const loadDriveImageViaApi = async (fileId) => {
  const apiKey = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY?.trim();
  if (!apiKey || !fileId) return null;

  try {
    const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}&supportsAllDrives=true`;
    const fromMedia = await fetchUrlAsDataUrl(mediaUrl);
    if (fromMedia) return fromMedia;
  } catch {
    // try metadata thumbnail next
  }

  try {
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=thumbnailLink&key=${encodeURIComponent(apiKey)}&supportsAllDrives=true`,
    );
    if (!metaRes.ok) return null;
    const meta = await metaRes.json();
    if (!meta.thumbnailLink) return null;
    const thumbUrl = String(meta.thumbnailLink).replace(/=s\d+/, '=s400');
    return fetchUrlAsDataUrl(thumbUrl);
  } catch {
    return null;
  }
};

const loadProductImageDataUrl = async (imageUrl) => {
  if (!imageUrl) return null;

  const driveId = getGoogleDriveId(imageUrl);
  if (driveId) {
    const fromApi = await loadDriveImageViaApi(driveId);
    if (fromApi) return fromApi;
  }

  const candidates = resolveImageCandidates(imageUrl);
  for (const candidate of candidates) {
    const viaFetch = await fetchUrlAsDataUrl(candidate);
    if (viaFetch) return viaFetch;
    const viaImage = await resizeImageSourceToDataUrl(candidate, { useCrossOrigin: true });
    if (viaImage) return viaImage;
  }
  return null;
};

/** Prefer more columns so cards stay compact and text stays readable after fit-to-page. */
const pickGalleryColumns = (count) => {
  if (count <= 1) return 1;
  if (count === 2) return 2;
  if (count <= 6) return 3;
  if (count <= 12) return 4;
  if (count <= 20) return 5;
  return 6;
};

const galleryTextSizes = (cols) => {
  if (cols <= 2) return { name: 18, qty: 16, empty: 14, gap: 10, pad: 10 };
  if (cols === 3) return { name: 15, qty: 14, empty: 13, gap: 8, pad: 8 };
  if (cols === 4) return { name: 13, qty: 12, empty: 12, gap: 7, pad: 7 };
  return { name: 12, qty: 11, empty: 11, gap: 6, pad: 6 };
};

const buildProductsGalleryHtml = (products) => {
  const cols = pickGalleryColumns(products.length);
  const type = galleryTextSizes(cols);
  const cells = products
    .map((product) => {
      const imageBlock = product.dataUrl
        ? `<img src="${product.dataUrl}" alt="" style="width: 100%; height: 100%; object-fit: contain; display: block;" />`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #e2e8f0; color: #64748b; font-size: ${type.empty}px; font-weight: 700;">אין תמונה</div>`;
      return `
        <div style="break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; display: flex; flex-direction: column;">
          <div style="aspect-ratio: 1 / 1; background: #f8fafc; overflow: hidden; flex: 0 0 auto;">
            ${imageBlock}
          </div>
          <div style="padding: ${type.pad}px ${Math.max(6, type.pad - 1)}px ${type.pad + 2}px; text-align: center; background: #ffffff; border-top: 1px solid #e2e8f0;">
            <div style="font-size: ${type.name}px; font-weight: 800; color: #0f172a; line-height: 1.3;">
              ${escapeHtml(product.name)}
            </div>
            <div style="margin-top: 4px; font-size: ${type.qty}px; font-weight: 700; color: #0f766e;">
              ${product.quantity} יח׳
            </div>
          </div>
        </div>`;
    })
    .join('');

  return `
    <div dir="rtl" style="font-family: Heebo, sans-serif; width: 210mm; box-sizing: border-box; color: #0f172a; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 10px 14px 9px; color: #ffffff;">
        <div style="font-size: 12px; font-weight: 600; opacity: 0.9; margin-bottom: 2px;">גמ״ח כלים ואירועים</div>
        <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">תמונות הפריטים בהזמנה</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.92; line-height: 1.3;">
          ${products.length} פריטים · לתצוגה מהירה באיסוף
        </p>
      </div>
      <div style="padding: 12px 12px 14px;">
        ${
          products.length
            ? `<div style="display: grid; grid-template-columns: repeat(${cols}, minmax(0, 1fr)); gap: ${type.gap}px; align-content: start;">
                ${cells}
              </div>`
            : `<p style="color: #64748b; font-size: 16px;">אין פריטים בהזמנה</p>`
        }
      </div>
    </div>
  `;
};

const addCanvasToPdfFitSinglePage = (doc, canvas, { margin = 8 } = {}) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  const contentH = pageH - 2 * margin;
  const imgData = canvas.toDataURL('image/png');

  let drawW = contentW;
  let drawH = (canvas.height * drawW) / canvas.width;

  if (drawH > contentH) {
    drawH = contentH;
    drawW = (canvas.width * drawH) / canvas.height;
  }

  const x = margin + (contentW - drawW) / 2;
  doc.addImage(imgData, 'PNG', x, margin, drawW, drawH, undefined, 'FAST');
};

const addCanvasToPdf = (doc, canvas, { margin = 10 } = {}) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  const contentH = pageH - 2 * margin;
  const pxPerMm = canvas.width / contentW;
  const pageSliceHeightPx = Math.floor(contentH * pxPerMm);

  let yOffsetPx = 0;
  let pageIndex = 0;

  while (yOffsetPx < canvas.height) {
    const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - yOffsetPx);

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;

    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      yOffsetPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx,
    );

    const sliceImgData = pageCanvas.toDataURL('image/png');
    const sliceHeightMm = sliceHeightPx / pxPerMm;

    if (pageIndex > 0) doc.addPage();
    doc.addImage(sliceImgData, 'PNG', margin, margin, contentW, sliceHeightMm, undefined, 'FAST');

    yOffsetPx += sliceHeightPx;
    pageIndex += 1;
  }
};

const renderHtmlToCanvas = async (html) => {
  const div = document.createElement('div');
  div.innerHTML = html;
  div.style.cssText = 'position:fixed; left:-9999px; top:0; width:210mm; background:white; z-index:9999;';
  document.body.appendChild(div);

  try {
    const canvas = await html2canvas(div, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    document.body.removeChild(div);
    return canvas;
  } catch (e) {
    if (div.parentNode) document.body.removeChild(div);
    throw e;
  }
};

const renderHtmlToPdfDoc = async (html, { fitSinglePage = false } = {}) => {
  const canvas = await renderHtmlToCanvas(html);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  if (fitSinglePage) {
    addCanvasToPdfFitSinglePage(doc, canvas);
  } else {
    addCanvasToPdf(doc, canvas);
  }
  return doc;
};

const renderHtmlToPdf = async (html, filename, { fitSinglePage = false } = {}) => {
  const doc = await renderHtmlToPdfDoc(html, { fitSinglePage });
  doc.save(filename);
};

const buildOrderPdfDoc = async (order) => {
  let catalogItems = [];
  try {
    catalogItems = await getItems();
  } catch {
    catalogItems = [];
  }

  const productLines = collectOrderProductLines(order, catalogItems);
  const productsWithImages = await Promise.all(
    productLines.map(async (product) => ({
      ...product,
      dataUrl: await loadProductImageDataUrl(product.imageUrl),
    })),
  );

  const summaryCanvas = await renderHtmlToCanvas(buildOrderHtml(order, catalogItems));
  const galleryCanvas = await renderHtmlToCanvas(buildProductsGalleryHtml(productsWithImages));

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  addCanvasToPdfFitSinglePage(doc, summaryCanvas);
  doc.addPage();
  addCanvasToPdfFitSinglePage(doc, galleryCanvas);
  return doc;
};

const buildConflictsHtml = ({ conflictMessages, pendingCount, exportedAt }) => {
  const pendingBlock =
    pendingCount > 0
      ? `<p style="margin: 12px 0; padding: 12px; border: 1px solid #fcd34d; background: #fffbeb; border-radius: 8px; color: #78350f;">
          ${pendingCount} הזמנות שהיו בסטטוס "אושר" הוחזרו אוטומטית ל-"ממתין".
        </p>`
      : '';

  const conflictsBlock =
    conflictMessages.length === 0
      ? `<p style="margin: 12px 0; padding: 12px; border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 8px; color: #166534;">
          לא זוהו התנגשויות.
        </p>`
      : conflictMessages
          .map(
            (message, index) => `
        <div style="margin: 16px 0; padding: 16px; border: 1px solid #fecaca; border-radius: 12px; background: #fff; white-space: pre-wrap; line-height: 1.75; font-size: 14px;">
          <div style="font-weight: 700; color: #9f1239; margin-bottom: 8px;">התנגשות ${index + 1}</div>
          ${escapeHtml(message)}
        </div>`,
          )
          .join('');

  return `
    <div dir="rtl" style="font-family: Heebo, sans-serif; padding: 24px; width: 210mm; box-sizing: border-box; font-size: 14px; line-height: 1.5; color: #111;">
      <h1 style="font-size: 20px; margin-bottom: 8px; color: #881337;">דוח התנגשויות – לו״ז פתיחת גמ״ח</h1>
      <p style="font-size: 12px; color: #64748b; margin-bottom: 16px;">נוצר: ${escapeHtml(exportedAt)}</p>
      ${pendingBlock}
      ${conflictsBlock}
    </div>
  `;
};

/**
 * Export opening-schedule conflict report as PDF (Hebrew via html2canvas).
 */
export const downloadConflictsPdf = async ({ conflictMessages = [], pendingCount = 0 } = {}) => {
  const exportedAt = new Date().toLocaleString('he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  const html = buildConflictsHtml({ conflictMessages, pendingCount, exportedAt });
  await renderHtmlToPdf(html, `gemach-conflicts-${stamp}.pdf`);
};

/**
 * Generate and download a PDF for an order. Uses html2canvas to capture Hebrew-rendered HTML
 * so the PDF displays Hebrew correctly (jsPDF default font does not support Hebrew).
 */
export const downloadOrderPdf = async (order) => {
  const doc = await buildOrderPdfDoc(order);
  doc.save(`gemach-order-${order.id || 'confirmation'}.pdf`);
};
