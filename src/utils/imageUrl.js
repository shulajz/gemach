/**
 * Extracts Google Drive file ID from sharing links.
 */
export const getGoogleDriveId = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const fileMatch = trimmed.match(
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
  );
  if (fileMatch) return fileMatch[1];
  const lhMatch = trimmed.match(
    /lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/,
  );
  if (lhMatch) return lhMatch[1];
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("googleusercontent.com")
  ) {
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
  }
  return null;
};

/**
 * Extracts Google Drive folder ID from folder links.
 */
export const getGoogleDriveFolderId = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const folderMatch = trimmed.match(
    /drive\.google\.com\/drive(?:\/u\/\d+)?\/folders\/([a-zA-Z0-9_-]+)/,
  );
  if (folderMatch) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && trimmed.includes("drive.google.com")) return idParamMatch[1];
  return null;
};

export const isGoogleDriveFolderUrl = (url) => Boolean(getGoogleDriveFolderId(url));

export const toGoogleDriveFileUrl = (fileId) =>
  `https://drive.google.com/file/d/${fileId}/view?usp=drive_link`;

/**
 * Google Drive mobile share links sometimes end with "drivesdk".
 * Replace with "drive_link" so the URL is normalized before image parsing/loading.
 */
const normalizeGoogleDriveShareUrl = (url) => {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (!trimmed.endsWith("drivesdk")) return trimmed;
  return `${trimmed.slice(0, -"drivesdk".length)}drive_link`;
};

/**
 * Converts Google Drive sharing links to embeddable image URLs.
 * Returns { primary, fallback, original }. primary = thumbnail API; fallback = uc?export=view.
 */
export const getDisplayImageUrl = (url, size = "w500") => {
  if (!url || typeof url !== "string") return url;
  const normalized = normalizeGoogleDriveShareUrl(url);
  const id = getGoogleDriveId(normalized);
  if (id) {
    return {
      primary: `https://drive.google.com/thumbnail?id=${id}&sz=${size}`,
      fallback: `https://drive.google.com/uc?export=view&id=${id}`,
      original: normalized,
    };
  }
  return normalized;
};
