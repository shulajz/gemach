import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';
import { getReservationWindowForEvent } from './openingSchedule.js';

const RESERVATIONS_COLLECTION = 'reservations';
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const getReservationRef = (dateStr) => doc(db, RESERVATIONS_COLLECTION, dateStr);
const parseDateKeyLocal = (value) => {
  if (!DATE_KEY_RE.test(String(value))) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, month - 1, day);
};
const toDateStr = (value) => {
  const fromKey = parseDateKeyLocal(value);
  const d = value instanceof Date ? value : fromKey || new Date(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateRangeInclusive = (startDateStr, endDateStr) => {
  const out = [];
  const cur = parseDateKeyLocal(startDateStr) || new Date(startDateStr);
  const end = parseDateKeyLocal(endDateStr) || new Date(endDateStr);
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

/**
 * Reserve items for reservation window around event date
 * (between closest opening before event and next opening after event).
 */
export const reserveForOrderDateRange = async (eventDate, items) => {
  const { startDateStr, endDateStr } = await getReservationWindowForEvent(eventDate);
  const dateStrs = getDateRangeInclusive(startDateStr, endDateStr);
  const payload = items.map((i) => ({ itemId: i.itemId, quantity: i.quantity }));
  await Promise.all(dateStrs.map((dateStr) => updateReservationsForDate(dateStr, payload)));
};

/**
 * Release reservation for reservation window around event date.
 */
export const releaseReservationDateRange = async (eventDate, items) => {
  const { startDateStr, endDateStr } = await getReservationWindowForEvent(eventDate);
  const dateStrs = getDateRangeInclusive(startDateStr, endDateStr);
  const payload = items.map((i) => ({ itemId: i.itemId, quantity: -i.quantity }));
  await Promise.all(dateStrs.map((dateStr) => updateReservationsForDate(dateStr, payload)));
};

/**
 * Get reserved quantities per item for a given date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Promise<Record<string, number>>} itemId -> reserved quantity
 */
export const getReservationsForDate = async (dateStr) => {
  const ref = getReservationRef(dateStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) return {};
  const data = snap.data();
  return data.itemReservations || {};
};

/**
 * All reservation day docs: [{ date, itemReservations }].
 */
export const getAllReservationDocs = async () => {
  const snapshot = await getDocs(collection(db, RESERVATIONS_COLLECTION));
  return snapshot.docs.map((d) => ({
    date: d.id,
    itemReservations: d.data()?.itemReservations || {},
  }));
};

/**
 * Apply reservation delta for an order: add or remove quantities for a date.
 * Used when creating (add), updating (add new - remove old), or cancelling (remove).
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array<{ itemId: string, quantity: number }>} items - items to add (positive) or remove (negative)
 */
export const updateReservationsForDate = async (dateStr, items) => {
  const ref = getReservationRef(dateStr);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const current = snap.exists() ? { ...(snap.data().itemReservations || {}) } : {};
    for (const { itemId, quantity } of items) {
      if (!itemId) continue;
      const prev = Number(current[itemId]) || 0;
      const next = Math.max(0, prev + quantity);
      if (next === 0) delete current[itemId];
      else current[itemId] = next;
    }
    transaction.set(ref, {
      itemReservations: current,
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Reserve items for an order (call when creating order or when changing order items/date).
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array<{ itemId: string, quantity: number }>} items
 */
export const reserveForOrder = (dateStr, items) =>
  updateReservationsForDate(dateStr, items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })));

/**
 * Release reservation (call when cancelling order or when editing order to remove items/change date).
 * @param {string} dateStr - YYYY-MM-DD
 * @param {Array<{ itemId: string, quantity: number }>} items
 */
export const releaseReservation = (dateStr, items) =>
  updateReservationsForDate(
    dateStr,
    items.map((i) => ({ itemId: i.itemId, quantity: -i.quantity }))
  );
