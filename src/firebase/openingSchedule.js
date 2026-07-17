import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config.js";
import { getItems } from "./items.js";

const SETTINGS_COLLECTION = "settings";
const OPENING_SCHEDULE_DOC = "openingSchedule";
const ORDERS_COLLECTION = "orders";
const RESERVATIONS_COLLECTION = "reservations";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseDateKeyLocal = (value) => {
  if (!DATE_KEY_RE.test(String(value))) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toDate = (value) => {
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  const fromKey = parseDateKeyLocal(value);
  if (fromKey) return fromKey;
  return new Date(value);
};

const toDateStr = (value) => {
  const d = toDate(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const getDateRangeInclusive = (startDateStr, endDateStr) => {
  const out = [];
  const cur = toDate(startDateStr);
  const end = toDate(endDateStr);
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
};

export const getOpeningScheduleConfig = async () => {
  const ref = doc(db, SETTINGS_COLLECTION, OPENING_SCHEDULE_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { defaultWeekday: 3, overrides: {} }; // Wednesday default
  }
  const data = snap.data();
  return {
    defaultWeekday: Number.isInteger(data.defaultWeekday) ? data.defaultWeekday : 3,
    overrides: data.overrides || {},
  };
};

export const isOpeningDay = (dateValue, config) => {
  const dateStr = toDateStr(dateValue);
  if (config?.overrides && Object.prototype.hasOwnProperty.call(config.overrides, dateStr)) {
    return !!config.overrides[dateStr];
  }
  const weekday = toDate(dateValue).getDay();
  return weekday === (config?.defaultWeekday ?? 3);
};

const findPreviousOpening = (eventDate, config) => {
  const base = toDate(eventDate);
  const startOffset = isOpeningDay(base, config) ? 1 : 0;
  for (let i = startOffset; i <= 370; i += 1) {
    const candidate = addDays(base, -i);
    if (isOpeningDay(candidate, config)) return candidate;
  }
  throw new Error("לא נמצאה פתיחה קודמת בטווח החיפוש");
};

const findNextOpening = (eventDate, config) => {
  const base = toDate(eventDate);
  for (let i = 1; i <= 370; i += 1) {
    const candidate = addDays(base, i);
    if (isOpeningDay(candidate, config)) return candidate;
  }
  throw new Error("לא נמצאה פתיחה הבאה בטווח החיפוש");
};

export const getReservationWindowForEvent = async (eventDate, providedConfig = null) => {
  const config = providedConfig || (await getOpeningScheduleConfig());
  const prevOpening = findPreviousOpening(eventDate, config);
  const nextOpening = findNextOpening(eventDate, config);
  const startDateStr = toDateStr(prevOpening);
  const endDateStr = toDateStr(nextOpening);
  return {
    startDateStr,
    endDateStr,
    slotKey: `${startDateStr}__${endDateStr}`,
  };
};

export const getOpeningsForMonth = async (monthDate, providedConfig = null) => {
  const config = providedConfig || (await getOpeningScheduleConfig());
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days = [];
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    days.push({ dateStr: toDateStr(d), isOpen: isOpeningDay(d, config) });
  }
  return days;
};

const normalizeOverrides = (overrides, defaultWeekday) => {
  const cleaned = {};
  Object.entries(overrides || {}).forEach(([dateStr, isOpen]) => {
    const date = toDate(dateStr);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
    cleaned[dateStr] = !!isOpen;
  });
  return cleaned;
};

const collectOrdersConflicts = (orders, itemById) => {
  const byDay = {};
  orders.forEach((order) => {
    const start = order.reservationStartDate;
    const end = order.reservationEndDate;
    if (!start || !end) return;
    const days = getDateRangeInclusive(start, end);
    days.forEach((day) => {
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(order);
    });
  });

  const conflicts = [];
  const seenSignatures = new Set();
  Object.entries(byDay).forEach(([day, dayOrders]) => {
    const totals = {};
    dayOrders.forEach((order) => {
      (order.items || []).forEach((line) => {
        const qty = Number(line.quantity) || 0;
        if (qty <= 0) return;
        if (!totals[line.itemId]) {
          totals[line.itemId] = {
            itemId: line.itemId,
            itemName: line.itemName || itemById[line.itemId]?.name || line.itemId,
            total: 0,
            perOrder: [],
          };
        }
        totals[line.itemId].total += qty;
        totals[line.itemId].perOrder.push({
          orderId: order.id,
          customerName: order.customerName || "ללא שם",
          phone: order.phone || "",
          eventDate: toDateStr(order.eventDate),
          createdAt: order.createdAt || null,
          qty,
        });
      });
    });
    const overbookedItems = Object.values(totals)
      .map((entry) => ({
        ...entry,
        maxQuantity: Number(itemById[entry.itemId]?.maxQuantity) || 0,
      }))
      .filter((entry) => entry.maxQuantity > 0 && entry.total > entry.maxQuantity);
    if (!overbookedItems.length) return;
    const involvedOrderIds = new Set();
    overbookedItems.forEach((entry) => {
      entry.perOrder.forEach((perOrder) => involvedOrderIds.add(perOrder.orderId));
    });
    const ordersForConflict = dayOrders
      .filter((o) => involvedOrderIds.has(o.id))
      .map((o) => ({
        id: o.id,
        customerName: o.customerName || "ללא שם",
        phone: o.phone || "",
        eventDate: toDateStr(o.eventDate),
        createdAt: o.createdAt || null,
        status: o.status,
      }));

    const signature = JSON.stringify({
      orders: [...involvedOrderIds].sort(),
      items: overbookedItems.map((entry) => entry.itemId).sort(),
    });
    if (seenSignatures.has(signature)) return;
    seenSignatures.add(signature);

    conflicts.push({
      slotKey: day,
      orders: ordersForConflict,
      items: overbookedItems,
    });
  });
  return conflicts;
};

const rewriteReservationsByWindow = async (orders, config, onProgress) => {
  const reservationsRef = collection(db, RESERVATIONS_COLLECTION);
  const existingDocs = await getDocs(reservationsRef);
  const existingIds = new Set(existingDocs.docs.map((d) => d.id));
  const aggregated = {};

  const enrichedOrders = [];
  const totalOrders = orders.length;
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const eventDate = toDate(order.eventDate);
    const { slotKey, startDateStr, endDateStr } = await getReservationWindowForEvent(
      eventDate,
      config,
    );
    const items = (order.items || []).filter((line) => (Number(line.quantity) || 0) > 0);
    const days = getDateRangeInclusive(startDateStr, endDateStr);
    days.forEach((dateStr) => {
      if (!aggregated[dateStr]) {
        aggregated[dateStr] = {
          itemReservations: {},
        };
      }
      items.forEach((line) => {
        const qty = Number(line.quantity) || 0;
        if (!qty) return;
        aggregated[dateStr].itemReservations[line.itemId] =
          (aggregated[dateStr].itemReservations[line.itemId] || 0) + qty;
      });
    });
    enrichedOrders.push({ ...order, reservationWindowKey: slotKey });
    enrichedOrders[enrichedOrders.length - 1].reservationStartDate = startDateStr;
    enrichedOrders[enrichedOrders.length - 1].reservationEndDate = endDateStr;

    onProgress?.({
      message: totalOrders
        ? `מחשב חלונות הזמנה (${i + 1}/${totalOrders})...`
        : "מחשב חלונות הזמנה...",
      percent: totalOrders ? 25 + Math.round(((i + 1) / totalOrders) * 35) : 45,
    });
  }

  const reservationEntries = Object.entries(aggregated);
  const writeBatchSize = 12;
  for (let i = 0; i < reservationEntries.length; i += writeBatchSize) {
    const batch = reservationEntries.slice(i, i + writeBatchSize);
    await Promise.all(
      batch.map(([slotKey, data]) =>
        setDoc(doc(db, RESERVATIONS_COLLECTION, slotKey), {
          ...data,
          updatedAt: serverTimestamp(),
        }),
      ),
    );
    const written = Math.min(i + writeBatchSize, reservationEntries.length);
    onProgress?.({
      message: reservationEntries.length
        ? `מעדכן שמירות במערכת (${written}/${reservationEntries.length})...`
        : "מעדכן שמירות במערכת...",
      percent: reservationEntries.length
        ? 60 + Math.round((written / reservationEntries.length) * 20)
        : 75,
    });
  }

  const newIds = new Set(Object.keys(aggregated));
  const idsToDelete = [...existingIds].filter((id) => !newIds.has(id));
  if (idsToDelete.length) {
    onProgress?.({ message: "מנקה שמירות ישנות...", percent: 82 });
    for (let i = 0; i < idsToDelete.length; i += writeBatchSize) {
      await Promise.all(
        idsToDelete.slice(i, i + writeBatchSize).map((id) => deleteDoc(doc(db, RESERVATIONS_COLLECTION, id))),
      );
    }
  }

  return enrichedOrders;
};

export const applyOpeningScheduleChanges = async ({
  defaultWeekday,
  overrides,
  onProgress,
} = {}) => {
  const report = (message, percent) => onProgress?.({ message, percent });

  report("שומר את לוח הפתיחה...", 8);

  const normalizedOverrides = normalizeOverrides(overrides, defaultWeekday);
  await setDoc(
    doc(db, SETTINGS_COLLECTION, OPENING_SCHEDULE_DOC),
    {
      defaultWeekday,
      overrides: normalizedOverrides,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  report("טוען הזמנות...", 15);

  const ordersSnap = await getDocs(collection(db, ORDERS_COLLECTION));
  const allOrders = ordersSnap.docs
    .map((snap) => ({ id: snap.id, ...snap.data() }))
    .filter((order) => !order.archived && order.status !== "בוטל")
    .sort((a, b) => {
      const aDate = toDate(a.eventDate).getTime();
      const bDate = toDate(b.eventDate).getTime();
      return aDate - bDate;
    });

  const scheduleConfig = { defaultWeekday, overrides: normalizedOverrides };
  const enrichedOrders = await rewriteReservationsByWindow(allOrders, scheduleConfig, onProgress);

  report("בודק התנגשויות...", 88);

  const items = await getItems();
  const itemById = Object.fromEntries(items.map((item) => [item.id, item]));
  const conflicts = collectOrdersConflicts(enrichedOrders, itemById);

  const conflictOrderIds = new Set(
    conflicts.flatMap((conflict) => conflict.orders.map((order) => order.id)),
  );
  const approvedToPending = allOrders.filter(
    (order) => conflictOrderIds.has(order.id) && order.status === "אושר",
  );

  if (approvedToPending.length) {
    report(`מעדכן סטטוס הזמנות (${approvedToPending.length})...`, 94);
  }

  await Promise.all(
    approvedToPending.map((order) =>
      updateDoc(doc(db, ORDERS_COLLECTION, order.id), {
        status: "ממתין",
        updatedAt: serverTimestamp(),
      }),
    ),
  );

  report("הושלם", 100);

  return {
    conflicts,
    movedToPendingCount: approvedToPending.length,
  };
};

export const describeConflictsInHebrew = (conflicts) => {
  if (!conflicts?.length) return [];
  const formatDate = (value) => {
    if (!value) return "לא ידוע";
    const date = toDate(value);
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "לא ידוע";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatOrderDetails = (order) => {
    const phone = (order.phone || "").trim() || "לא ידוע";
    return [
      `• שם: ${order.customerName || "ללא שם"}`,
      `  טלפון: ${phone}`,
      `  תאריך ביצוע ההזמנה: ${formatDate(order.createdAt)}`,
      `  תאריך אירוע: ${formatDate(order.eventDate)}`,
    ].join("\n");
  };

  return conflicts.map((conflict) => {
    const uniqueOrders = [];
    const seenIds = new Set();
    conflict.orders.forEach((order) => {
      if (seenIds.has(order.id)) return;
      seenIds.add(order.id);
      uniqueOrders.push(order);
    });

    const pairText =
      uniqueOrders.length >= 2
        ? `הזמנה של ${uniqueOrders[0].customerName} (${formatDate(uniqueOrders[0].eventDate)}) מתנגשת עם הזמנה של ${uniqueOrders[1].customerName} (${formatDate(uniqueOrders[1].eventDate)}).`
        : `זוהתה התנגשות בחלון ${conflict.slotKey}.`;
    const ordersDetails = [
      "פרטי ההזמנות המעורבות:",
      ...uniqueOrders.map((order) => formatOrderDetails(order)),
    ];
    const itemsText = conflict.items.map((item) => {
      const topTwo = [];
      const seenOrderIds = new Set();
      item.perOrder.forEach((entry) => {
        if (seenOrderIds.has(entry.orderId)) return;
        seenOrderIds.add(entry.orderId);
        topTwo.push(entry);
      });
      const details =
        topTwo.length >= 2
          ? `${topTwo[0].customerName} הזמין ${topTwo[0].qty}, ${topTwo[1].customerName} הזמין ${topTwo[1].qty}`
          : `${topTwo[0]?.customerName || "לקוח"} הזמין ${topTwo[0]?.qty || 0}`;
      return `• ${item.itemName} - ${details}. סה"כ יש ${item.maxQuantity}.`;
    });
    return [
      pairText,
      ...ordersDetails,
      "המוצרים הבאים מתנגשים:",
      ...itemsText,
    ].join("\n");
  });
};

