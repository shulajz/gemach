import { useState } from 'react';
import { getDisplayImageUrl } from '../utils/imageUrl.js';

const ItemImage = ({
  src,
  alt,
  className = 'h-24 w-24 object-cover rounded-lg',
  fill = false,
  size = 'w500',
  loading = 'lazy',
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tryFallback, setTryFallback] = useState(false);
  const urlResult = src ? getDisplayImageUrl(src, size) : null;

  const isDriveUrl = urlResult && typeof urlResult === 'object' && urlResult.primary;
  const displaySrc = !urlResult
    ? ''
    : isDriveUrl
      ? tryFallback ? urlResult.fallback : urlResult.primary
      : urlResult;
  const originalUrl = isDriveUrl ? urlResult.original : null;

  const handleError = () => {
    if (isDriveUrl && !tryFallback) {
      setTryFallback(true);
    } else {
      setFailed(true);
    }
  };

  const wrapperClass = fill ? 'relative h-full w-full' : 'relative';

  if (!displaySrc) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-gray-200 text-gray-500 ${className}`}
        aria-hidden="true"
      >
        אין תמונה
      </div>
    );
  }

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg bg-gray-200 text-gray-500 ${className}`}
        aria-hidden="true"
      >
        <span>שגיאה בטעינה</span>
        {originalUrl && (
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-primary-600 underline hover:text-primary-700"
            onClick={(e) => e.stopPropagation()}
          >
            לצפייה בתמונה
          </a>
        )}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {!loaded && (
        <div
          className={`animate-pulse rounded-lg bg-gray-200 ${className}`}
          aria-hidden="true"
        />
      )}
      <img
        src={displaySrc}
        alt={alt || ''}
        className={`${className} ${!loaded ? 'absolute opacity-0' : ''}`}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        referrerPolicy="no-referrer"
        loading={loading}
      />
    </div>
  );
};

export default ItemImage;
