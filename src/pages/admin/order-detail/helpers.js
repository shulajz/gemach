import { format } from 'date-fns';
import { ORDER_CATEGORIES } from '../../../constants/he.js';

export const toDateStr = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d || '').toString().slice(0, 10));

export const getReturnedQty = (returnedItems, itemId) =>
  Number((returnedItems || []).find((r) => r.itemId === itemId)?.quantity) || 0;

export const hasAnyReturnedItems = (returnedItems) =>
  (returnedItems || []).some((r) => (Number(r.quantity) || 0) > 0);

export const getTabsForEventType = (eventType) =>
  ORDER_CATEGORIES.filter((c) => c.eventType === eventType || c.eventType === null);

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
