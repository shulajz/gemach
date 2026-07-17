import { useCallback, useEffect, useRef, useState } from 'react';
import ItemImage from './ItemImage.jsx';

const Lightbox = ({ items, startIndex = 0, onClose }) => {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef(null);
  const total = items.length;

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') next();
      else if (e.key === 'ArrowRight') prev();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, next, prev]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;
    if (delta < -threshold) next();
    else if (delta > threshold) prev();
    touchStartX.current = null;
  };

  if (!items || total === 0) return null;
  const item = items[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="תצוגת גלריה"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 left-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="סגור"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {total > 1 && (
        <div className="absolute top-4 right-4 z-10 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
          {index + 1} / {total}
        </div>
      )}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:right-6"
            aria-label="הקודם"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white sm:left-6"
            aria-label="הבא"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      <div
        className="flex max-h-full max-w-full flex-col items-center justify-center px-4 py-12"
        onClick={(e) => e.stopPropagation()}
      >
        <ItemImage
          key={item.id}
          src={item.imageUrl}
          alt={item.title || 'תמונת גלריה'}
          size="w1600"
          loading="eager"
          className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
        />
        {item.title && (
          <p className="mt-4 max-w-[90vw] rounded-full bg-black/60 px-4 py-2 text-center text-sm font-medium text-white">
            {item.title}
          </p>
        )}
      </div>
    </div>
  );
};

export default Lightbox;
