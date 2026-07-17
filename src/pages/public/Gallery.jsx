import { useState } from 'react';
import { useGallery } from '../../hooks/useGallery.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import Card from '../../components/Card.jsx';
import Spinner from '../../components/Spinner.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import Lightbox from '../../components/Lightbox.jsx';

const Gallery = () => {
  const { galleryItems, loading, error } = useGallery();
  const [lightboxIndex, setLightboxIndex] = useState(null);

  return (
    <div className="space-y-6">
      <Card className="bg-white shadow-lg">
        <h2 className="text-2xl font-bold text-teal-900">גלריית אירועים</h2>
        <p className="mt-2 text-sm text-gray-700">
          תמונות השראה מאירועים אמיתיים כדי לעזור לכן ולכם לתכנן את ההזמנה.
        </p>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-red-700">{getHebrewError(error)}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : galleryItems.length === 0 ? (
        <Card className="bg-gray-50">
          <p className="text-center text-gray-600">עדיין אין תמונות בגלריה</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {galleryItems.map((item, idx) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setLightboxIndex(idx)}
              className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-1 ring-gray-200/80 transition duration-300 hover:shadow-xl hover:ring-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              aria-label={item.title ? `הצג: ${item.title}` : 'הצג תמונה'}
            >
              <ItemImage
                fill
                src={item.imageUrl}
                alt={item.title || 'תמונת גלריה'}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-100 md:opacity-0 md:transition md:duration-300 md:group-hover:opacity-100" />
              {item.title && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-0 p-3 opacity-100 md:translate-y-2 md:opacity-0 md:transition md:duration-300 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                  <p className="text-right text-sm font-semibold text-white drop-shadow-md">
                    {item.title}
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          items={galleryItems}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
};

export default Gallery;
