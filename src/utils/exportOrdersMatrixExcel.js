import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ORDER_CATEGORIES } from '../constants/he.js';

const HEBREW_WEEKDAYS = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת'];

/** Excel row numbers (1-based) — event date must stay on row 7 */
const ROW = {
  INSTRUCTION: 1,
  DATE_FILTER: 2,
  APPROVED: 3,
  NOTES: 4,
  EXTRA_RETURN: 5,
  FULL_NAME: 6,
  EVENT_DATE: 7,
  PHONE: 8,
  EVENT_DAY: 9,
  CITY: 10,
  FIRST_PRODUCT: 11,
};

const COL = {
  MAX: 1,
  TOTAL: 2,
  LABEL: 3,
  FIRST_ORDER: 4,
};

const COLORS = {
  greenBright: 'FF92D050',
  cyan: 'FFBDD7EE',
  productGrey: 'FFD9D9D9',
  rowAlt: 'FFF2F2F2',
  white: 'FFFFFFFF',
  red: 'FFFF0000',
  redLight: 'FFFFC7CE',
  greenBorder: 'FF548235',
};

const META_ROW_COLORS = {
  'אושרה ע"י': COLORS.greenBright,
  'שם מלא': COLORS.cyan,
  'מספר פלאפון': COLORS.cyan,
  'תאריך של האירוע': COLORS.cyan,
};

const thinBorder = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const greenLeftBorder = { style: 'medium', color: { argb: COLORS.greenBorder } };

const colLetter = (col1Based) => {
  let n = col1Based;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
};

const resolveCategoryId = (item) => {
  if (item.orderCategoryId) return item.orderCategoryId;
  if (item.category === 'חלבי') return 'plates-dairy';
  if (item.category === 'בשרי') return 'plates-meat';
  if (item.category === 'ניטרלי') return 'tablecloths';
  return 'other';
};

const sortCatalogItems = (items) =>
  [...items].sort((a, b) => {
    const categoryOrder = ORDER_CATEGORIES.map((c) => c.id);
    const rank = (item) => {
      const id = resolveCategoryId(item);
      const idx = categoryOrder.indexOf(id);
      return idx >= 0 ? idx : categoryOrder.length;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return (a.name || '').localeCompare(b.name || '', 'he');
  });

const toExcelDate = (eventDate) => {
  if (!eventDate) return null;
  const date = eventDate instanceof Date ? eventDate : new Date(eventDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getEventDay = (eventDate) => {
  const date = toExcelDate(eventDate);
  if (!date) return '';
  return HEBREW_WEEKDAYS[date.getDay()] || '';
};

const getOrderQuantity = (order, itemId) => {
  const line = (order.items || []).find((entry) => entry.itemId === itemId);
  const qty = Number(line?.quantity) || 0;
  return qty > 0 ? qty : '';
};

const buildProducts = (catalogItems, orders) => {
  const sortedItems = sortCatalogItems(catalogItems);
  const catalogIds = new Set(sortedItems.map((item) => item.id));

  const products = sortedItems.map((item) => ({
    itemId: item.id,
    label: `${item.name} (מקסימום ${Number(item.maxQuantity) || 0})`,
    maxQuantity: Number(item.maxQuantity) || 0,
  }));

  const orphanKeys = new Set();
  orders.forEach((order) => {
    (order.items || []).forEach((line) => {
      if (!line.itemId || catalogIds.has(line.itemId)) return;
      orphanKeys.add(line.itemId);
    });
  });

  orphanKeys.forEach((itemId) => {
    const line = orders.flatMap((o) => o.items || []).find((entry) => entry.itemId === itemId);
    products.push({
      itemId,
      label: line?.itemName ? `${line.itemName} (לא במלאי)` : '(פריט שנמחק)',
      maxQuantity: 0,
    });
  });

  return products;
};

const collectUniqueEventDates = (orders) => {
  const seen = new Map();
  orders.forEach((order) => {
    const date = toExcelDate(order.eventDate);
    if (!date) return;
    const key = format(date, 'yyyy-MM-dd');
    if (!seen.has(key)) seen.set(key, date);
  });
  return [...seen.values()].sort((a, b) => a.getTime() - b.getTime());
};

const styleCell = (cell, { fillArgb, bold = false, greenLeft = false } = {}) => {
  if (fillArgb) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillArgb } };
  }
  cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  if (bold) cell.font = { bold: true };
  cell.border = {
    top: thinBorder,
    bottom: thinBorder,
    right: thinBorder,
    left: greenLeft ? greenLeftBorder : thinBorder,
  };
};

const buildTotalFormula = (row, firstOrderColLetter, lastOrderColLetter) =>
  `SUMPRODUCT((${firstOrderColLetter}$${ROW.EVENT_DATE}:${lastOrderColLetter}$${ROW.EVENT_DATE}>=MIN($A$${ROW.DATE_FILTER},$C$${ROW.DATE_FILTER}))*(${firstOrderColLetter}$${ROW.EVENT_DATE}:${lastOrderColLetter}$${ROW.EVENT_DATE}<=MAX($A$${ROW.DATE_FILTER},$C$${ROW.DATE_FILTER}))*${firstOrderColLetter}${row}:${lastOrderColLetter}${row})`;

const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

/**
 * Matrix Excel export with date-range totals, dropdown filters, and conditional formatting.
 */
export const exportOrdersMatrixExcel = async (
  orders,
  catalogItems,
  filename = 'gemach-orders.xlsx',
) => {
  if (!orders.length) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('הזמנות');
    worksheet.getCell(1, 2).value = 'אין הזמנות להצגה לפי הסינון הנוכחי';
    await downloadWorkbook(workbook, filename);
    return;
  }

  const products = buildProducts(catalogItems, orders);
  const uniqueDates = collectUniqueEventDates(orders);
  const lastCol = COL.FIRST_ORDER + orders.length - 1;
  const lastOrderColLetter = colLetter(lastCol);
  const firstOrderColLetter = colLetter(COL.FIRST_ORDER);
  const lastProductRow = ROW.FIRST_PRODUCT + products.length - 1;
  const dateListRef = uniqueDates.length
    ? `'_dates'!$A$1:$A$${uniqueDates.length}`
    : '""';

  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;

  const datesSheet = workbook.addWorksheet('_dates', { state: 'veryHidden' });
  uniqueDates.forEach((date, index) => {
    const cell = datesSheet.getCell(index + 1, 1);
    cell.value = date;
    cell.numFmt = 'dd/mm/yyyy';
  });

  const worksheet = workbook.addWorksheet('הזמנות', {
    views: [{ rightToLeft: true, state: 'normal' }],
  });

  worksheet.mergeCells(ROW.INSTRUCTION, COL.MAX, ROW.INSTRUCTION, lastCol);
  const instructionCell = worksheet.getCell(ROW.INSTRUCTION, COL.MAX);
  instructionCell.value =
    'בחרו טווח תאריכים כדי לראות האם יש חריגות בהזמנה. חריגות יסומנו בצבע אדום בעמודה A.';
  instructionCell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
  instructionCell.font = { bold: true };

  worksheet.getCell(ROW.DATE_FILTER, COL.MAX).value = uniqueDates.at(-1) || null;
  worksheet.getCell(ROW.DATE_FILTER, COL.MAX).numFmt = 'dd/mm/yyyy';
  worksheet.getCell(ROW.DATE_FILTER, COL.TOTAL).value = 'עד תאריך';
  worksheet.getCell(ROW.DATE_FILTER, COL.LABEL).value = uniqueDates[0] || null;
  worksheet.getCell(ROW.DATE_FILTER, COL.LABEL).numFmt = 'dd/mm/yyyy';
  worksheet.getCell(ROW.DATE_FILTER, COL.FIRST_ORDER).value = 'החל מתאריך';

  [worksheet.getCell(ROW.DATE_FILTER, COL.MAX), worksheet.getCell(ROW.DATE_FILTER, COL.LABEL)].forEach(
    (cell) => {
      cell.dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: [dateListRef],
        showErrorMessage: true,
        errorTitle: 'תאריך לא תקין',
        error: 'בחרו תאריך מהרשימה',
      };
    },
  );

  [COL.MAX, COL.TOTAL, COL.LABEL].forEach((colIndex) => {
    styleCell(worksheet.getCell(ROW.DATE_FILTER, colIndex));
  });
  styleCell(worksheet.getCell(ROW.DATE_FILTER, COL.FIRST_ORDER));

  const metaRows = [
    { row: ROW.APPROVED, label: 'אושרה ע"י', value: () => '' },
    { row: ROW.NOTES, label: 'הערות', value: (order) => order.notes || '' },
    { row: ROW.EXTRA_RETURN, label: 'החזרה נוספת של-', value: () => '' },
    { row: ROW.FULL_NAME, label: 'שם מלא', value: (order) => order.customerName || '' },
    { row: ROW.EVENT_DATE, label: 'תאריך של האירוע', value: (order) => toExcelDate(order.eventDate) },
    { row: ROW.PHONE, label: 'מספר פלאפון', value: (order) => order.phone || '' },
    { row: ROW.EVENT_DAY, label: 'יום האירוע', value: (order) => getEventDay(order.eventDate) },
    { row: ROW.CITY, label: 'עיר מגורים', value: (order) => order.city || '' },
  ];

  metaRows.forEach(({ row, label, value }) => {
    worksheet.getCell(row, COL.LABEL).value = label;
    styleCell(worksheet.getCell(row, COL.LABEL), {
      fillArgb: META_ROW_COLORS[label],
      bold: !!META_ROW_COLORS[label],
    });
    styleCell(worksheet.getCell(row, COL.MAX));
    styleCell(worksheet.getCell(row, COL.TOTAL));

    orders.forEach((order, orderIndex) => {
      const col = COL.FIRST_ORDER + orderIndex;
      const cell = worksheet.getCell(row, col);
      const cellValue = value(order);
      cell.value = cellValue ?? '';
      if (row === ROW.EVENT_DATE && cellValue) {
        cell.numFmt = 'dd/mm/yyyy';
      }
      styleCell(cell, {
        fillArgb: META_ROW_COLORS[label],
        bold: !!META_ROW_COLORS[label],
      });
    });
  });

  products.forEach((product, productIndex) => {
    const row = ROW.FIRST_PRODUCT + productIndex;
    const isAlt = productIndex % 2 === 1;

    const maxCell = worksheet.getCell(row, COL.MAX);
    maxCell.value = product.maxQuantity;
    styleCell(maxCell);

    const totalCell = worksheet.getCell(row, COL.TOTAL);
    totalCell.value = { formula: buildTotalFormula(row, firstOrderColLetter, lastOrderColLetter) };
    styleCell(totalCell, { fillArgb: COLORS.greenBright, bold: true });

    const labelCell = worksheet.getCell(row, COL.LABEL);
    labelCell.value = product.label;
    styleCell(labelCell, { fillArgb: COLORS.productGrey, greenLeft: true });

    orders.forEach((order, orderIndex) => {
      const col = COL.FIRST_ORDER + orderIndex;
      const cell = worksheet.getCell(row, col);
      const qty = getOrderQuantity(order, product.itemId);
      cell.value = qty === '' ? null : qty;
      styleCell(cell, { fillArgb: isAlt ? COLORS.rowAlt : COLORS.white });
    });
  });

  if (products.length > 0) {
    const orderRange = `${firstOrderColLetter}${ROW.FIRST_PRODUCT}:${lastOrderColLetter}${lastProductRow}`;
    const maxRange = `A${ROW.FIRST_PRODUCT}:A${lastProductRow}`;

    worksheet.addConditionalFormatting({
      ref: orderRange,
      rules: [
        {
          type: 'expression',
          priority: 1,
          formulae: [
            `AND(${firstOrderColLetter}$${ROW.EVENT_DATE}>=MIN($A$${ROW.DATE_FILTER},$C$${ROW.DATE_FILTER}),${firstOrderColLetter}$${ROW.EVENT_DATE}<=MAX($A$${ROW.DATE_FILTER},$C$${ROW.DATE_FILTER}),$B${ROW.FIRST_PRODUCT}>$A${ROW.FIRST_PRODUCT})`,
          ],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.red } },
            font: { color: { argb: COLORS.white }, bold: true },
          },
        },
      ],
    });

    worksheet.addConditionalFormatting({
      ref: maxRange,
      rules: [
        {
          type: 'expression',
          priority: 1,
          formulae: [`$B${ROW.FIRST_PRODUCT}>$A${ROW.FIRST_PRODUCT}`],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: COLORS.redLight } },
            font: { bold: true, color: { argb: COLORS.red } },
          },
        },
      ],
    });
  }

  worksheet.getColumn(COL.MAX).width = 14;
  worksheet.getColumn(COL.TOTAL).width = 10;
  worksheet.getColumn(COL.LABEL).width = 42;
  for (let col = COL.FIRST_ORDER; col <= lastCol; col += 1) {
    worksheet.getColumn(col).width = 14;
  }

  await downloadWorkbook(workbook, filename);
};
