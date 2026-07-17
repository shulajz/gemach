import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config.js';

const ITEMS_COLLECTION = 'items';

export const getItemsCollectionRef = () => collection(db, ITEMS_COLLECTION);

export const getItems = async () => {
  const q = query(collection(db, ITEMS_COLLECTION), orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getItemById = async (id) => {
  const ref = doc(db, ITEMS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export const createItem = async (data) => {
  const ref = collection(db, ITEMS_COLLECTION);
  const payload = stripUndefined({
    ...data,
    maxQuantity: Number(data.maxQuantity) || 0,
    priceIfBroken: Number(data.priceIfBroken) || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docRef = await addDoc(ref, payload);
  return { id: docRef.id, ...payload };
};

export const updateItem = async (id, data) => {
  const ref = doc(db, ITEMS_COLLECTION, id);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  if (typeof data.maxQuantity !== 'undefined') payload.maxQuantity = Number(data.maxQuantity);
  if (typeof data.priceIfBroken !== 'undefined') payload.priceIfBroken = Number(data.priceIfBroken);
  await updateDoc(ref, stripUndefined(payload));
  return { id, ...data };
};

export const deleteItem = async (id) => {
  const ref = doc(db, ITEMS_COLLECTION, id);
  await deleteDoc(ref);
};
