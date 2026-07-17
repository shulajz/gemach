/** Allow empty or digits-only while the user is typing. */
export const isValidQuantityDraft = (value) => value === '' || /^\d+$/.test(value);

export const parseQuantityInput = (raw, maxQty, minQty = 0) => {
  if (raw === '' || raw === undefined || raw === null) return 0;
  const num = parseInt(String(raw), 10);
  if (Number.isNaN(num)) return 0;
  return Math.max(minQty, Math.min(maxQty, num));
};

export const getQuantityDraft = (drafts, itemId, fallbackQty = 0) => {
  if (Object.prototype.hasOwnProperty.call(drafts, itemId)) {
    return String(drafts[itemId]);
  }
  return fallbackQty > 0 ? String(fallbackQty) : '';
};

export const normalizeQuantityDraft = (raw, maxQty, minQty = 0) => {
  const parsed = parseQuantityInput(raw, maxQty, minQty);
  if (parsed <= minQty && minQty === 0) return '';
  if (parsed <= minQty && minQty > 0) return String(minQty);
  return String(parsed);
};
