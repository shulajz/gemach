import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config.js';

const GALLERY_COLLECTION = 'gallery';

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

export const getGalleryItems = async () => {
  const q = query(collection(db, GALLERY_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const createGalleryItem = async (data) => {
  const payload = stripUndefined({
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docRef = await addDoc(collection(db, GALLERY_COLLECTION), payload);
  return { id: docRef.id, ...payload };
};

const BATCH_LIMIT = 500;

export const createGalleryItems = async (items) => {
  if (!items?.length) return [];

  const created = [];
  const col = collection(db, GALLERY_COLLECTION);

  for (let offset = 0; offset < items.length; offset += BATCH_LIMIT) {
    const chunk = items.slice(offset, offset + BATCH_LIMIT);
    const batch = writeBatch(db);

    chunk.forEach((data) => {
      const ref = doc(col);
      const payload = stripUndefined({
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(ref, payload);
      created.push({ id: ref.id, ...data });
    });

    await batch.commit();
  }

  return created;
};

export const updateGalleryItem = async (id, data) => {
  const payload = stripUndefined({
    ...data,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, GALLERY_COLLECTION, id), payload);
  return { id, ...payload };
};

export const deleteGalleryItem = async (id) => {
  await deleteDoc(doc(db, GALLERY_COLLECTION, id));
};
