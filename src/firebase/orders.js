import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "./config.js";
import { reserveForOrderDateRange, releaseReservationDateRange } from "./reservations.js";

const ORDERS_COLLECTION = "orders";
const EDITABLE_STATUSES_BY_LINK = ["ממתין", "אושר"];

const toDateStr = (date) => {
  if (typeof date === "string") return date;
  if (date && date.toDate) return date.toDate().toISOString().slice(0, 10);
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  return "";
};

const orderToPlain = (snap) => {
  const d = snap.data();
  return {
    id: snap.id,
    ...d,
    eventDate: d.eventDate?.toDate ? d.eventDate.toDate() : d.eventDate,
    createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt,
    updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate() : d.updatedAt,
    customerEdit: d.customerEdit
      ? {
          ...d.customerEdit,
          expiresAt: d.customerEdit.expiresAt?.toDate
            ? d.customerEdit.expiresAt.toDate()
            : d.customerEdit.expiresAt,
          usedAt: d.customerEdit.usedAt?.toDate
            ? d.customerEdit.usedAt.toDate()
            : d.customerEdit.usedAt,
          createdAt: d.customerEdit.createdAt?.toDate
            ? d.customerEdit.createdAt.toDate()
            : d.customerEdit.createdAt,
        }
      : null,
  };
};

const sha256Hex = async (value) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

const createRandomToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};


export const getOrdersRef = () => collection(db, ORDERS_COLLECTION);

export const getOrderById = async (id) => {
  const ref = doc(db, ORDERS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return orderToPlain(snap);
};

export const getOrders = async (filters = {}) => {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  let list = snapshot.docs.map((d) => orderToPlain(d));
  if (filters.status) list = list.filter((o) => o.status === filters.status);
  if (filters.eventType)
    list = list.filter((o) => o.eventType === filters.eventType);
  if (filters.searchName) {
    const lower = filters.searchName.toLowerCase();
    list = list.filter((o) =>
      (o.customerName || "").toLowerCase().includes(lower),
    );
  }
  if (filters.searchPhone) {
    const digits = (filters.searchPhone || "").replace(/\D/g, "");
    list = list.filter((o) =>
      (o.phone || "").replace(/\D/g, "").includes(digits),
    );
  }
  if (filters.searchDate) {
    const target = filters.searchDate;
    list = list.filter((o) => toDateStr(o.eventDate) === target);
  }
  if (filters.includeArchived) {
    list = list.filter((o) => o.archived === true);
  } else {
    list = list.filter((o) => !o.archived);
  }
  return list;
};

export const getOrdersByEventDate = async (dateStr) => {
  const start = Timestamp.fromDate(new Date(dateStr + "T00:00:00"));
  const end = Timestamp.fromDate(new Date(dateStr + "T23:59:59.999"));
  const ref = collection(db, ORDERS_COLLECTION);
  const q = query(
    ref,
    where("eventDate", ">=", start),
    where("eventDate", "<=", end),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => orderToPlain(d));
};

export const getOrdersWithEventDateInRange = async (startDate, endDate) => {
  const start =
    startDate instanceof Date
      ? Timestamp.fromDate(startDate)
      : Timestamp.fromDate(new Date(startDate));
  const end =
    endDate instanceof Date
      ? Timestamp.fromDate(endDate)
      : Timestamp.fromDate(new Date(endDate));
  const ref = collection(db, ORDERS_COLLECTION);
  const q = query(
    ref,
    where("eventDate", ">=", start),
    where("eventDate", "<=", end),
    orderBy("eventDate"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => orderToPlain(d));
};

export const createOrder = async (orderData) => {
  const eventDate =
    orderData.eventDate instanceof Date
      ? orderData.eventDate
      : new Date(orderData.eventDate);
  const items = (orderData.items || [])
    .filter((i) => i.quantity > 0)
    .map((i) => ({ itemId: i.itemId, quantity: i.quantity }));

  if (items.length) {
    await reserveForOrderDateRange(eventDate, items);
  }

  const payload = {
    ...orderData,
    eventDate: Timestamp.fromDate(eventDate),
    status: "ממתין",
    depositPaid: false,
    depositAmount: 200,
    donationAmount: orderData.donationAmount || 0,
    brokenItems: orderData.brokenItems || [],
    notes: orderData.notes || "",
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    customerEdit: null,
  };
  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), payload);
  return { id: docRef.id, ...payload, eventDate };
};

export const generateCustomerEditLink = async (
  orderId,
  { hoursValid = 24, createdBy = "admin" } = {},
) => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("Order not found");
  const token = createRandomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAtDate = new Date(Date.now() + hoursValid * 60 * 60 * 1000);
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, {
    customerEdit: {
      enabled: true,
      tokenHash,
      expiresAt: Timestamp.fromDate(expiresAtDate),
      usedAt: null,
      createdBy,
      createdAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
  return { token, expiresAt: expiresAtDate };
};

export const revokeCustomerEditLink = async (orderId) => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, {
    customerEdit: {
      enabled: false,
      revokedAt: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });
};

export const validateCustomerEditAccess = async (orderId, token) => {
  const order = await getOrderById(orderId);
  if (!order) throw new Error("ההזמנה לא נמצאה");
  if (!token) throw new Error("קישור עריכה לא תקין");
  const edit = order.customerEdit;
  if (!edit?.enabled || !edit?.tokenHash) {
    throw new Error("קישור העריכה בוטל או לא פעיל");
  }
  if (!edit.expiresAt || new Date(edit.expiresAt) <= new Date()) {
    throw new Error("תוקף קישור העריכה פג");
  }
  const tokenHash = await sha256Hex(token);
  if (tokenHash !== edit.tokenHash) {
    throw new Error("קישור עריכה לא תקין");
  }
  if (!EDITABLE_STATUSES_BY_LINK.includes(order.status)) {
    throw new Error("לא ניתן לערוך הזמנה בסטטוס הנוכחי");
  }
  const eventDate = order.eventDate
    ? order.eventDate instanceof Date
      ? order.eventDate
      : new Date(order.eventDate)
    : null;
  if (!eventDate || eventDate < new Date(new Date().toDateString())) {
    throw new Error("לא ניתן לערוך הזמנה לאחר תאריך האירוע");
  }
  return order;
};

export const updateOrderByCustomerLink = async (
  orderId,
  token,
  updates,
) => {
  const previousOrder = await validateCustomerEditAccess(orderId, token);
  const safeUpdates = {
    customerName: updates.customerName,
    phone: updates.phone,
    city: updates.city,
    eventDate: updates.eventDate,
    eventType: updates.eventType,
    notes: updates.notes || "",
    items: updates.items || [],
  };
  const updated = await updateOrder(orderId, safeUpdates, previousOrder);
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    editHistory: arrayUnion({
      at: new Date().toISOString(),
      actor: "customer-link",
      summary: "Customer updated order via private link",
    }),
  });
  return updated;
};

export const updateOrder = async (orderId, updates, previousOrder = null) => {
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  const prev = previousOrder || (await getOrderById(orderId));
  if (!prev) throw new Error("Order not found");

  const archiveOnly =
    Object.keys(updates).length === 1 && updates.archived !== undefined;

  const eventDateUnchanged =
    updates.eventDate === undefined ||
    (prev.eventDate && updates.eventDate && toDateStr(prev.eventDate) === toDateStr(updates.eventDate));

  const itemsMap = (arr) =>
    Object.fromEntries((arr || []).map((i) => [i.itemId, i.quantity]));
  const prevMap = itemsMap(prev.items);
  const nextMap = itemsMap(updates.items);
  const itemsUnchanged =
    updates.items === undefined ||
    (Object.keys(prevMap).length === Object.keys(nextMap).length &&
      Object.keys(prevMap).every((id) => prevMap[id] === nextMap[id]));

  const skipReservations =
    archiveOnly || (eventDateUnchanged && itemsUnchanged);

  if (!skipReservations) {
    const newEventDate =
      updates.eventDate !== undefined
        ? updates.eventDate instanceof Date
          ? updates.eventDate
          : new Date(updates.eventDate)
        : prev.eventDate;
    const newItems = updates.items !== undefined ? updates.items : prev.items;

    const prevEventDate =
      prev.eventDate instanceof Date ? prev.eventDate : new Date(prev.eventDate);
    if ((prev.items || []).some((i) => i.quantity > 0)) {
      await releaseReservationDateRange(
        prevEventDate,
        (prev.items || []).map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        })),
      );
    }
    const itemsToReserve = (newItems || [])
      .filter((i) => i.quantity > 0)
      .map((i) => ({ itemId: i.itemId, quantity: i.quantity }));
    if (itemsToReserve.length) {
      const newEventDateObj =
        newEventDate instanceof Date ? newEventDate : new Date(newEventDate);
      await reserveForOrderDateRange(newEventDateObj, itemsToReserve);
    }
  }

  const payload = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  if (updates.eventDate !== undefined) {
    const date =
      updates.eventDate instanceof Date
        ? updates.eventDate
        : new Date(updates.eventDate);
    payload.eventDate = Timestamp.fromDate(date);
  }
  await updateDoc(ref, payload);
  return getOrderById(orderId);
};

export const deleteOrder = async (orderId) => {
  const order = await getOrderById(orderId);
  if (!order) return;
  const eventDate =
    order.eventDate instanceof Date
      ? order.eventDate
      : new Date(order.eventDate);
  if ((order.items || []).length) {
    await releaseReservationDateRange(
      eventDate,
      (order.items || []).map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
      })),
    );
  }
  const ref = doc(db, ORDERS_COLLECTION, orderId);
  await updateDoc(ref, { status: "בוטל", updatedAt: serverTimestamp() });
};
