import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PICKUP_LOCATION, ORDER_CATEGORIES } from '../constants/he.js';
import { getItems } from '../firebase/items.js';

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
      name: line.itemName || catalogItem?.name || 'פריט',
      quantity: line.quantity,
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

const buildInfoField = (label, value) => `
  <div style="padding: 6px 8px; background: #ffffff; border-radius: 8px; border: 1px solid #ccfbf1;">
    <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 2px;">${escapeHtml(label)}</div>
    <div style="font-size: 12px; font-weight: 700; color: #0f172a; line-height: 1.25;">${escapeHtml(value)}</div>
  </div>
`;

const buildCategoryTable = (group) => {
  const style = CATEGORY_STYLES[group.id] || CATEGORY_STYLES.other;
  const categoryQty = group.items.reduce((sum, item) => sum + item.quantity, 0);
  const rows = group.items
    .map(
      (item, index) => {
        const isLast = index === group.items.length - 1;
        const rowBorder = isLast ? '' : `border-bottom: 1px solid ${style.border};`;
        return `
        <tr style="background: ${index % 2 === 0 ? style.rowBg : style.rowAlt};">
          <td style="padding: 4px 8px; ${rowBorder} color: #1e293b; font-size: 11px; line-height: 1.25;">${escapeHtml(item.name)}</td>
          <td style="padding: 4px 6px; ${rowBorder} text-align: center; font-weight: 700; color: #0f766e; width: 36px; font-size: 11px;">${item.quantity}</td>
        </tr>`;
      },
    )
    .join('');

  return `
    <div style="margin-bottom: 8px; border-radius: 10px; overflow: hidden; border: 1px solid ${style.border}; box-shadow: 0 1px 4px rgba(15, 118, 110, 0.06); break-inside: avoid;">
      <div style="background: ${style.header}; color: ${style.headerText}; padding: 4px 10px 10px; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: space-between; gap: 8px; line-height: 1.25;">
        <span>${escapeHtml(group.label)}</span>
        <span style="font-size: 10px; font-weight: 600; opacity: 0.92; white-space: nowrap;">${categoryQty} יח׳</span>
      </div>
      <div style="padding-bottom: 10px; background: ${style.rowBg};">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: ${style.rowAlt};">
              <th style="padding: 4px 8px; text-align: right; font-weight: 700; color: #475569; font-size: 10px;">פריט</th>
              <th style="padding: 4px 6px; text-align: center; font-weight: 700; color: #475569; font-size: 10px; width: 36px;">כמות</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
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
    <div dir="rtl" style="font-family: Heebo, sans-serif; width: 210mm; box-sizing: border-box; font-size: 12px; line-height: 1.35; color: #0f172a; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #0f766e 0%, #14b8a6 100%); padding: 12px 16px 10px; color: #ffffff;">
        <div style="font-size: 10px; font-weight: 600; opacity: 0.9; margin-bottom: 2px;">גמ״ח כלים ואירועים</div>
        <h1 style="margin: 0; font-size: 18px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">סיכום הזמנה</h1>
        <p style="margin: 4px 0 0; font-size: 10px; opacity: 0.92; line-height: 1.3;">אישור ראשוני — צוות הגמ״ח ייצור קשר לאחר בדיקת ההזמנה</p>
      </div>

      <div style="padding: 10px 14px 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 10px; padding: 8px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px;">
          ${buildInfoField('שם מלא', order.customerName || '')}
          ${buildInfoField('טלפון', order.phone || '')}
          ${buildInfoField('עיר', order.city || '')}
          ${buildInfoField('תאריך האירוע', eventDateStr)}
          <div style="padding: 6px 8px; background: ${eventStyle.bg}; border-radius: 8px; border: 1px solid ${eventStyle.border};">
            <div style="font-size: 9px; font-weight: 600; color: #64748b; margin-bottom: 2px;">סוג אירוע</div>
            <div style="font-size: 12px; font-weight: 800; color: ${eventStyle.text};">${escapeHtml(order.eventType || '')}</div>
          </div>
          ${buildInfoField('סטטוס', order.status || 'ממתין')}
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 14px; font-weight: 800; color: #115e59;">פריטים להשאלה</h2>
          <div style="padding: 2px 10px 4px; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: 10px; font-weight: 700; white-space: nowrap; line-height: 1.2;">
            סה״כ ${totalQuantity} יח׳ · ${groupedItems.length} קטגוריות
          </div>
        </div>

        <div style="display: grid; grid-template-columns: ${useTwoColumns ? '1fr 1fr' : '1fr'}; gap: 8px; align-items: start;">
          ${categoryTables || '<p style="color: #64748b; font-size: 11px;">אין פריטים בהזמנה</p>'}
        </div>

        <div style="margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #fffbeb; border: 1px solid #fcd34d;">
          <div style="font-size: 10px; font-weight: 700; color: #92400e; margin-bottom: 2px;">מיקום איסוף</div>
          <div style="font-size: 11px; font-weight: 600; color: #78350f; line-height: 1.3;">${escapeHtml(PICKUP_LOCATION)}</div>
        </div>

        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; gap: 8px; font-size: 9px; color: #64748b;">
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

const renderHtmlToPdf = async (html, filename, { fitSinglePage = false } = {}) => {
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

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    if (fitSinglePage) {
      addCanvasToPdfFitSinglePage(doc, canvas);
    } else {
      addCanvasToPdf(doc, canvas);
    }
    doc.save(filename);
  } catch (e) {
    if (div.parentNode) document.body.removeChild(div);
    throw e;
  }
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
  let catalogItems = [];
  try {
    catalogItems = await getItems();
  } catch {
    catalogItems = [];
  }
  const html = buildOrderHtml(order, catalogItems);
  await renderHtmlToPdf(html, `gemach-order-${order.id || 'confirmation'}.pdf`, { fitSinglePage: true });
};
