import { useState, useEffect, useCallback } from 'react';
import { getGalleryItems } from '../firebase/gallery.js';

export const useGallery = () => {
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getGalleryItems();
      setGalleryItems(list);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { galleryItems, loading, error, reload: load };
};
