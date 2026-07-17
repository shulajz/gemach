/**
 * Israeli phone: 9 digits, optionally with 02/03/04/05/07/08/09 prefix, with or without dashes
 */
export const isValidIsraeliPhone = (value) => {
  const digits = (value || '').replace(/\D/g, '');
  if (digits.length === 9) return /^[2-9]/.test(digits);
  if (digits.length === 10) return /^0[2-9]/.test(digits);
  if (digits.length === 11) return /^0[2-9]\d{9}$/.test(digits);
  return false;
};

export const formatIsraeliPhone = (value) => {
  const digits = (value || '').replace(/\D/g, '').slice(-9);
  if (digits.length < 9) return digits;
  return `0${digits.slice(0, 2)}-${digits.slice(2, 9)}`;
};

export const isValidUrl = (value) => {
  if (!value || typeof value !== 'string') return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

export const validateOrderForm = (form) => {
  const errors = {};
  if (!form.customerName?.trim()) errors.customerName = 'נא להזין שם מלא';
  if (!form.phone?.trim()) errors.phone = 'נא להזין מספר טלפון';
  else if (!isValidIsraeliPhone(form.phone)) errors.phone = 'נא להזין מספר טלפון תקין (ישראל)';
  if (!form.eventDate) errors.eventDate = 'נא לבחור תאריך אירוע';
  if (!form.city?.trim()) errors.city = 'נא להזין עיר מגורים';
  if (!form.eventType) errors.eventType = 'נא לבחור סוג אירוע';
  return errors;
};

export const validateItemForm = (form) => {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'נא להזין שם פריט';
  if (!form.category) errors.category = 'נא לבחור קטגוריה';
  if (form.maxQuantity === '' || form.maxQuantity == null) errors.maxQuantity = 'נא להזין כמות מקסימלית';
  else if (Number(form.maxQuantity) < 0) errors.maxQuantity = 'כמות חיובית';
  if (form.imageUrl?.trim() && !isValidUrl(form.imageUrl)) errors.imageUrl = 'קישור לתמונה לא תקין';
  return errors;
};
