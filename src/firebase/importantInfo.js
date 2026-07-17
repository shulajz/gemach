import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config.js';
import { IMPORTANT_INFO } from '../constants/he.js';

const SETTINGS_COLLECTION = 'settings';
const IMPORTANT_INFO_DOC = 'importantInfo';

const flattenDefaultParagraphs = () =>
  IMPORTANT_INFO.sections.flatMap((section) => section.paragraphs || []);

export const getImportantInfoSettings = async () => {
  const ref = doc(db, SETTINGS_COLLECTION, IMPORTANT_INFO_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return {
      title: IMPORTANT_INFO.title,
      paragraphs: flattenDefaultParagraphs(),
    };
  }
  const data = snap.data() || {};
  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : IMPORTANT_INFO.title;
  const paragraphs = Array.isArray(data.paragraphs)
    ? data.paragraphs.map((paragraph) => String(paragraph || '').trim()).filter(Boolean)
    : flattenDefaultParagraphs();
  return { title, paragraphs };
};

export const updateImportantInfoSettings = async ({ title, paragraphs }) => {
  const cleanedTitle = String(title || '').trim();
  const cleanedParagraphs = (paragraphs || []).map((paragraph) => String(paragraph || '').trim()).filter(Boolean);
  await setDoc(
    doc(db, SETTINGS_COLLECTION, IMPORTANT_INFO_DOC),
    {
      title: cleanedTitle,
      paragraphs: cleanedParagraphs,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};
