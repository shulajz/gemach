const FIREBASE_ERROR_MAP = {
  'auth/invalid-email': 'כתובת אימייל לא תקינה',
  'auth/user-disabled': 'משתמש זה הושבת',
  'auth/user-not-found': 'לא נמצא משתמש עם אימייל זה',
  'auth/wrong-password': 'סיסמה שגויה',
  'auth/email-already-in-use': 'אימייל זה כבר רשום',
  'auth/weak-password': 'הסיסמה חלשה מדי',
  'auth/too-many-requests': 'ניסיונות רבים מדי. נא לנסות מאוחר יותר',
  'auth/network-request-failed': 'שגיאת רשת. נא לבדוק את החיבור',
  'auth/operation-not-allowed': 'פעולה לא מאושרת',
  'permission-denied': 'אין הרשאה לפעולה זו',
  'unavailable': 'השירות לא זמין. נא לנסות שוב',
  'failed-precondition': 'הפעולה נכשלה. ייתכן שהנתונים השתנו',
  'resource-exhausted': 'מכסת השירות נגמרה או עומס. נא לנסות מאוחר יותר',
};

export const getHebrewError = (error) => {
  const code = error?.code || '';
  if (FIREBASE_ERROR_MAP[code]) return FIREBASE_ERROR_MAP[code];
  const msg = String(error?.message || '');
  if (msg.includes('Missing or insufficient permissions')) {
    return FIREBASE_ERROR_MAP['permission-denied'];
  }
  return msg || 'אירעה שגיאה. נא לנסות שוב';
};
