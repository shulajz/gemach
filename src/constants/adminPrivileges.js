/**
 * Emails allowed to permanently delete archived orders.
 * Prefer VITE_ARCHIVE_DELETE_EMAILS in .env (comma-separated).
 * Or list them below as a fallback.
 */
const FROM_ENV = String(import.meta.env.VITE_ARCHIVE_DELETE_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const FALLBACK_ARCHIVE_DELETE_EMAILS = [
  // e.g. 'you@gmail.com',
  // e.g. 'friend@gmail.com',
];

const ARCHIVE_DELETE_EMAILS =
  FROM_ENV.length > 0 ? FROM_ENV : FALLBACK_ARCHIVE_DELETE_EMAILS;

export const canPermanentlyDeleteFromArchive = (user) => {
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  return ARCHIVE_DELETE_EMAILS.includes(email);
};
