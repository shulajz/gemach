import { getGoogleDriveFolderId, toGoogleDriveFileUrl } from './imageUrl.js';

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const IMAGE_MIME_PREFIX = 'image/';

const getDriveApiKey = () => import.meta.env.VITE_GOOGLE_DRIVE_API_KEY?.trim() || '';

const isImageMimeType = (mimeType) =>
  typeof mimeType === 'string' && mimeType.startsWith(IMAGE_MIME_PREFIX);

const formatDriveApiError = (status, errorBody) => {
  const reason = errorBody?.error?.errors?.[0]?.reason || '';
  const message = errorBody?.error?.message || '';

  if (reason === 'accessNotConfigured' || message.includes('has not been used') || message.includes('is disabled')) {
    return 'Google Drive API לא מופעל בפרויקט. הפעילי אותו ב-Google Cloud Console.';
  }

  if (
    reason === 'ipRefererBlocked' ||
    reason === 'refererBlocked' ||
    message.includes('referer') ||
    message.includes('referrer')
  ) {
    return 'מפתח ה-API חסום לדומיין הזה. צרי מפתח API ייעודי ל-Drive והגדירי אותו בקובץ .env (ראי הוראות בטופס).';
  }

  if (reason === 'forbidden' && message.includes('API key')) {
    return 'מפתח ה-API לא מורשה לקרוא מ-Drive. צרי מפתח API חדש עם הרשאה ל-Google Drive API.';
  }

  if (reason === 'insufficientFilePermissions' || reason === 'insufficientPermissions') {
    return 'אין גישה לתיקייה. ודאי שהתיקייה משותפת כ"כל מי שיש לו את הקישור יכול לצפות" (לא רק עם אימייל ספציפי).';
  }

  if (status === 403) {
    return 'אין גישה לתיקייה. בדקי שיתוף התיקייה, ושמפתח API ייעודי ל-Drive מוגדר (לא מספיק להפעיל את ה-API בלבד).';
  }

  if (status === 404) {
    return 'התיקייה לא נמצאה. בדקי את הקישור.';
  }

  return message || 'שגיאה בקריאת תיקיית Drive';
};

const fetchFolderPage = async (folderId, apiKey, pageToken) => {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'nextPageToken,files(id,name,mimeType)',
    pageSize: '100',
    orderBy: 'name',
    key: apiKey,
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  if (pageToken) params.set('pageToken', pageToken);

  const response = await fetch(`${DRIVE_FILES_URL}?${params.toString()}`);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(formatDriveApiError(response.status, errorBody));
  }
  return response.json();
};

/**
 * Lists image files in a public Google Drive folder.
 * Requires VITE_GOOGLE_DRIVE_API_KEY — a dedicated API key allowed to call Drive API.
 */
export const listDriveFolderImages = async (folderUrl) => {
  const folderId = getGoogleDriveFolderId(folderUrl);
  if (!folderId) {
    throw new Error('קישור תיקייה לא תקין. הדביקו קישור לתיקייה ב-Google Drive.');
  }

  const apiKey = getDriveApiKey();
  if (!apiKey) {
    throw new Error(
      'חסר מפתח API ל-Drive. צרי מפתח API ייעודי ב-Google Cloud והוסיפי אותו לקובץ .env בשורה VITE_GOOGLE_DRIVE_API_KEY=...',
    );
  }

  const images = [];
  let pageToken;

  do {
    const page = await fetchFolderPage(folderId, apiKey, pageToken);
    const files = page.files || [];
    files
      .filter((file) => file.id && isImageMimeType(file.mimeType))
      .forEach((file) => {
        images.push({
          id: file.id,
          name: file.name || '',
          imageUrl: toGoogleDriveFileUrl(file.id),
        });
      });
    pageToken = page.nextPageToken;
  } while (pageToken);

  return images;
};

export const hasDriveApiKey = () => Boolean(getDriveApiKey());
