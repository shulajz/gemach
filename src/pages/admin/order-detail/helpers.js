import { format } from 'date-fns';
import { ORDER_CATEGORIES, EVENT_TYPE_NO_UTENSILS } from '../../../constants/he.js';

export const toDateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d || '').toString().slice(0, 10));

const normalizeItemsForCompare = (items) =>
  [...(items || [])]
    .map((i) => ({
      itemId: i.itemId,
      quantity: Number(i.quantity) || 0,
    }))
    .filter((i) => i.quantity > 0)
    .sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)));

const normalizeReturnedForCompare = (items) =>
  [...(items || [])]
    .map((i) => ({
      itemId: i.itemId,
      quantity: Number(i.quantity) || 0,
    }))
    .filter((i) => i.quantity > 0)
    .sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)));

const normalizeBrokenForCompare = (items) =>
  [...(items || [])]
    .map((i) => ({
      itemId: i.itemId,
      quantity: Number(i.quantity) || 0,
      cost: Number(i.cost) || 0,
    }))
    .sort((a, b) => String(a.itemId).localeCompare(String(b.itemId)));

/** True when edit form differs from the saved order. */
export const isOrderFormDirty = (form, order) => {
  if (!form || !order) return false;
  if ((form.status || '') !== (order.status || '')) return true;
  if (Boolean(form.depositPaid) !== Boolean(order.depositPaid)) return true;
  if ((Number(form.donationAmount) || 0) !== (Number(order.donationAmount) || 0)) return true;
  if ((form.notes || '') !== (order.notes || '')) return true;
  if (
    JSON.stringify(normalizeItemsForCompare(form.items)) !==
    JSON.stringify(normalizeItemsForCompare(order.items))
  ) {
    return true;
  }
  if (
    JSON.stringify(normalizeReturnedForCompare(form.returnedItems)) !==
    JSON.stringify(normalizeReturnedForCompare(order.returnedItems))
  ) {
    return true;
  }
  if (
    JSON.stringify(normalizeBrokenForCompare(form.brokenItems)) !==
    JSON.stringify(normalizeBrokenForCompare(order.brokenItems))
  ) {
    return true;
  }
  return false;
};

export const getReturnedQty = (returnedItems, itemId) =>
  Number((returnedItems || []).find((r) => r.itemId === itemId)?.quantity) || 0;

export const hasAnyReturnedItems = (returnedItems) =>
  (returnedItems || []).some((r) => (Number(r.quantity) || 0) > 0);

export const isNoUtensilsEventType = (eventType) => eventType === EVENT_TYPE_NO_UTENSILS;

export const getTabsForEventType = (eventType) =>
  ORDER_CATEGORIES.filter((c) => c.eventType === eventType || c.eventType === null);

export const getItemsForEventType = (items, eventType) => {
  if (!eventType) return [];
  if (isNoUtensilsEventType(eventType)) {
    return items.filter((item) => item.category === 'ניטרלי');
  }
  return items.filter((item) => item.category === eventType || item.category === 'ניטרלי');
};

export const filterQuantitiesForEventType = (quantities, items, eventType) => {
  const validIds = new Set(getItemsForEventType(items, eventType).map((item) => item.id));
  return Object.fromEntries(
    Object.entries(quantities).filter(([id, qty]) => validIds.has(id) && (Number(qty) || 0) > 0),
  );
};

export const itemMatchesTab = (item, tabId) => {
  if (tabId === 'plates-dairy') {
    return item.category === 'חלבי' && (!item.orderCategoryId || item.orderCategoryId === 'plates-dairy');
  }
  if (tabId === 'plates-meat') {
    return item.category === 'בשרי' && (!item.orderCategoryId || item.orderCategoryId === 'plates-meat');
  }
  if (item.orderCategoryId) return item.orderCategoryId === tabId;
  return item.category === 'ניטרלי' && tabId === 'tablecloths';
};

export const isFullyReturned = (orderItems, returnedItems) => {
  const lines = orderItems || [];
  if (!lines.length) return false;
  return lines.every((line) => {
    const orderedQty = Number(line.quantity) || 0;
    if (orderedQty <= 0) return true;
    const returnedQty = getReturnedQty(returnedItems, line.itemId);
    return returnedQty >= orderedQty;
  });
};

export const normalizeReturnedItems = (orderItems, returnedItems) => {
  const orderQtyById = Object.fromEntries((orderItems || []).map((i) => [i.itemId, Number(i.quantity) || 0]));
  return (returnedItems || [])
    .filter((r) => orderQtyById[r.itemId] != null)
    .map((r) => ({
      itemId: r.itemId,
      itemName: r.itemName,
      quantity: Math.max(0, Math.min(orderQtyById[r.itemId], Number(r.quantity) || 0)),
    }))
    .filter((r) => r.quantity > 0);
};

const toWhatsAppPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
};

export const buildWhatsAppApprovalUrl = (order) => {
  const phone = toWhatsAppPhone(order?.phone);
  if (!phone) return '';
  if (order?.status !== 'אושר') return '';
  const eventDate = order?.eventDate
    ? format(order.eventDate instanceof Date ? order.eventDate : new Date(order.eventDate), 'dd/MM/yyyy')
    : '';
  const message = `שלום ${order?.customerName || ''}, ההזמנה שלך בגמ"ח אושרה לתאריך ${eventDate}. תודה רבה!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

/** WhatsApp deep link to send the private customer edit URL to the order phone. */
export const buildWhatsAppCustomerEditLinkUrl = (order, editLink) => {
  const phone = toWhatsAppPhone(order?.phone);
  if (!phone || !editLink) return '';
  const eventDate = order?.eventDate
    ? format(order.eventDate instanceof Date ? order.eventDate : new Date(order.eventDate), 'dd/MM/yyyy')
    : '';
  const message = [
    `שלום ${order?.customerName || ''},`,
    `קישור לעריכת ההזמנה שלך בגמ"ח (תאריך אירוע: ${eventDate}):`,
    editLink,
    '',
    'הקישור אישי ותקף ל-24 שעות. אין להעביר לאחרים.',
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};
