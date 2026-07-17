import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

const firebaseConfig = {
  apiKey: 'AIzaSyBWXUVNdTPVA2fYmcQ6RM3ZdFuojzxXLOs',
  authDomain: 'gemach-management.firebaseapp.com',
  projectId: 'gemach-management',
  storageBucket: 'gemach-management.firebasestorage.app',
  messagingSenderId: '540765053739',
  appId: '1:540765053739:web:9a15e8986e8201fc395b6e',
};

const EXCEL_CATEGORY_MAP = {
  'צלחות, כוסות וסכו"ם - חלבי': { orderCategoryId: 'plates-dairy', category: 'חלבי' },
  'צלחות, כוסות וסכו"ם - בשרי': { orderCategoryId: 'plates-meat', category: 'בשרי' },
  'מפות': { orderCategoryId: 'tablecloths', category: 'ניטרלי' },
  'תחתיות לאוכל / לקישוט': { orderCategoryId: 'underplates', category: 'ניטרלי' },
  'עיצוב שולחנות': { orderCategoryId: 'table-design', category: 'ניטרלי' },
  'סלסלאות': { orderCategoryId: 'baskets', category: 'ניטרלי' },
  'קערות / תבניות להגשה': { orderCategoryId: 'bowls-trays', category: 'ניטרלי' },
  'מוצרי חשמל': { orderCategoryId: 'electrical', category: 'ניטרלי' },
};

const stripUndefined = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

const parseExcel = (filePath) => {
  const wb = XLSX.read(readFileSync(filePath));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const items = [];
  const errors = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[1] ?? '').trim();
    const maxQuantity = Number(row[2]) || 0;
    const imageUrl = String(row[3] ?? '').trim();
    const notes = String(row[4] ?? '').trim();
    const excelCategory = String(row[5] ?? '').trim();

    if (!name) continue;

    const mapped = EXCEL_CATEGORY_MAP[excelCategory];
    if (!mapped) {
      errors.push({ row: i + 1, name, excelCategory });
      continue;
    }

    items.push(stripUndefined({
      name,
      category: mapped.category,
      orderCategoryId: mapped.orderCategoryId,
      maxQuantity,
      priceIfBroken: 0,
      imageUrl: imageUrl || undefined,
      notes: notes || undefined,
    }));
  }

  return { items, errors };
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const main = async () => {
  const filePath = resolve(process.argv[2] || '');
  const replace = process.argv.includes('--replace');
  const email = process.env.FIREBASE_ADMIN_EMAIL;
  const password = process.env.FIREBASE_ADMIN_PASSWORD;

  if (!filePath) throw new Error('Usage: node scripts/import-items.mjs <path-to-xlsx> [--replace]');
  if (!email || !password) throw new Error('Set FIREBASE_ADMIN_EMAIL and FIREBASE_ADMIN_PASSWORD');

  const { items, errors } = parseExcel(filePath);
  console.log(`Parsed ${items.length} items, ${errors.length} errors`);
  if (errors.length) {
    console.table(errors);
    throw new Error('Fix category mapping before importing');
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, email, password);
  console.log('Signed in');

  const itemsRef = collection(db, 'items');

  if (replace) {
    const snap = await getDocs(itemsRef);
    console.log(`Deleting ${snap.size} existing items...`);
    for (const batch of chunk(snap.docs, 10)) {
      await Promise.all(batch.map((d) => deleteDoc(d.ref)));
    }
  }

  console.log('Creating items...');
  let created = 0;
  for (const batch of chunk(items, 8)) {
    await Promise.all(
      batch.map((item) =>
        addDoc(itemsRef, {
          ...item,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );
    created += batch.length;
    console.log(`  ${created}/${items.length}`);
  }

  console.log('Done.');
  process.exit(0);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
