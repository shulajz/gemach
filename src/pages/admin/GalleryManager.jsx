import { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import { useGallery } from '../../hooks/useGallery.js';
import {
  createGalleryItem,
  createGalleryItems,
  updateGalleryItem,
  deleteGalleryItem,
} from '../../firebase/gallery.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import { isValidUrl } from '../../utils/validation.js';
import { isGoogleDriveFolderUrl } from '../../utils/imageUrl.js';
import { listDriveFolderImages, hasDriveApiKey } from '../../utils/googleDriveFolder.js';
import Card from '../../components/Card.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ItemImage from '../../components/ItemImage.jsx';

const LINK_MODES = {
  image: 'image',
  folder: 'folder',
};

const getGalleryFormErrors = (form, linkMode, isEditing) => {
  const errors = {};
  const url = form.imageUrl?.trim();

  if (!url) {
    errors.imageUrl = linkMode === LINK_MODES.folder ? 'נא להזין קישור לתיקייה' : 'נא להזין קישור לתמונה';
  } else if (!isValidUrl(url)) {
    errors.imageUrl = 'קישור לא תקין';
  } else if (!isEditing && linkMode === LINK_MODES.folder && !isGoogleDriveFolderUrl(url)) {
    errors.imageUrl = 'נא להזין קישור לתיקיית Google Drive';
  }

  return errors;
};

const GalleryManager = () => {
  const { galleryItems, loading, error, reload } = useGallery();
  const [editingId, setEditingId] = useState(undefined);
  const [linkMode, setLinkMode] = useState(LINK_MODES.image);
  const [form, setForm] = useState({ title: '', imageUrl: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const isEditing = Boolean(editingId);
  const isFolderMode = !isEditing && linkMode === LINK_MODES.folder;

  const openAdd = () => {
    setEditingId(null);
    setLinkMode(LINK_MODES.image);
    setForm({ title: '', imageUrl: '' });
    setFormErrors({});
    setImportProgress('');
  };

  const openEdit = (galleryItem) => {
    setEditingId(galleryItem.id);
    setLinkMode(LINK_MODES.image);
    setForm({
      title: galleryItem.title || '',
      imageUrl: galleryItem.imageUrl || '',
    });
    setFormErrors({});
    setImportProgress('');
  };

  const handleLinkModeChange = (mode) => {
    setLinkMode(mode);
    setFormErrors((current) => ({ ...current, imageUrl: null }));
    setImportProgress('');
  };

  const handleSaveImage = async () => {
    const payload = { title: form.title.trim(), imageUrl: form.imageUrl.trim() };
    if (editingId) {
      await updateGalleryItem(editingId, payload);
      toast.success('התמונה עודכנה');
    } else {
      await createGalleryItem(payload);
      toast.success('התמונה נוספה');
    }
  };

  const handleSaveFolder = async () => {
    setImportProgress('טוען רשימת תמונות מהתיקייה...');
    const images = await listDriveFolderImages(form.imageUrl.trim());

    if (!images.length) {
      throw new Error('לא נמצאו תמונות בתיקייה');
    }

    const existingUrls = new Set(galleryItems.map((item) => item.imageUrl));
    const newImages = images.filter((image) => !existingUrls.has(image.imageUrl));

    if (!newImages.length) {
      throw new Error('כל התמונות מהתיקייה כבר קיימות בגלריה');
    }

    setImportProgress(`מוסיף ${newImages.length} תמונות לגלריה...`);
    await createGalleryItems(newImages.map((image) => ({ title: '', imageUrl: image.imageUrl })));

    const skippedCount = images.length - newImages.length;
    if (skippedCount > 0) {
      toast.success(`נוספו ${newImages.length} תמונות (${skippedCount} כבר היו בגלריה)`);
    } else {
      toast.success(`נוספו ${newImages.length} תמונות מהתיקייה`);
    }
  };

  const handleSave = async () => {
    const errors = getGalleryFormErrors(form, linkMode, isEditing);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setImportProgress('');
    try {
      if (isFolderMode) {
        await handleSaveFolder();
      } else {
        await handleSaveImage();
      }
      reload();
      setEditingId(undefined);
      setForm({ title: '', imageUrl: '' });
      setLinkMode(LINK_MODES.image);
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setSaving(false);
      setImportProgress('');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteGalleryItem(deleteConfirm.id);
      toast.success('התמונה נמחקה');
      setDeleteConfirm(null);
      reload();
    } catch (err) {
      toast.error(getHebrewError(err));
    }
  };

  const renderLinkModeSelector = () => (
    <div>
      <span className="mb-3 block text-sm font-semibold text-gray-700">סוג קישור</span>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label
          className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors ${
            linkMode === LINK_MODES.image
              ? 'border-teal-500 bg-teal-500 text-white'
              : 'border-gray-300 bg-white text-gray-800 hover:border-teal-300'
          }`}
        >
          <input
            type="radio"
            name="gallery-link-mode"
            value={LINK_MODES.image}
            checked={linkMode === LINK_MODES.image}
            onChange={() => handleLinkModeChange(LINK_MODES.image)}
            className="sr-only"
          />
          תמונה בודדת
        </label>
        <label
          className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors ${
            linkMode === LINK_MODES.folder
              ? 'border-teal-500 bg-teal-500 text-white'
              : 'border-gray-300 bg-white text-gray-800 hover:border-teal-300'
          }`}
        >
          <input
            type="radio"
            name="gallery-link-mode"
            value={LINK_MODES.folder}
            checked={linkMode === LINK_MODES.folder}
            onChange={() => handleLinkModeChange(LINK_MODES.folder)}
            className="sr-only"
          />
          תיקיית Drive
        </label>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/30 p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {isEditing ? 'עריכת תמונה' : isFolderMode ? 'ייבוא תמונות מתיקייה' : 'תמונה חדשה'}
      </h2>
      <div className="grid gap-4">
        {!isEditing && renderLinkModeSelector()}

        {!isFolderMode && (
          <Input
            label="כותרת"
            id="gallery-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            error={formErrors.title}
          />
        )}

        <Input
          label={isFolderMode ? 'קישור לתיקייה ב-Drive' : 'קישור לתמונה'}
          id="gallery-image-url"
          value={form.imageUrl}
          onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
          error={formErrors.imageUrl}
          placeholder={
            isFolderMode
              ? 'https://drive.google.com/drive/folders/...'
              : 'https://drive.google.com/file/d/...'
          }
          required
        />

        {isFolderMode && (
          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-semibold">דרישות לייבוא מתיקייה:</p>
            <ol className="list-decimal space-y-1 pr-5">
              <li>התיקייה משותפת כ&quot;כל מי שיש לו את הקישור יכול לצפות&quot;</li>
              <li>Google Drive API מופעל בפרויקט gemach-management</li>
              <li>
                נוצר <strong>מפתח API ייעודי</strong> ל-Drive (הפעלת ה-API לבדה לא מספיקה!)
              </li>
            </ol>
            {!hasDriveApiKey() && (
              <p className="font-medium text-red-700">
                כרגע חסר מפתח API. צרי קובץ `.env` עם `VITE_GOOGLE_DRIVE_API_KEY=...` ובני מחדש.
              </p>
            )}
          </div>
        )}

        {importProgress && (
          <p className="text-sm font-medium text-teal-700" role="status">
            {importProgress}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-4 w-4" />
              {isFolderMode ? 'מייבא...' : 'שומר...'}
            </span>
          ) : isFolderMode ? (
            'ייבוא תמונות'
          ) : (
            'שמירה'
          )}
        </Button>
        <Button variant="secondary" onClick={() => setEditingId(undefined)} className="w-full sm:w-auto">
          ביטול
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">גלריית תמונות</h1>

      <Card>
        <div className="mb-6 flex flex-wrap gap-3">
          <Button onClick={openAdd} ariaLabel="הוספת תמונה לגלריה">
            הוספת תמונה
          </Button>
        </div>

        {editingId === null && <div className="mb-6">{renderEditor()}</div>}

        {error && <p className="text-danger">{getHebrewError(error)}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                  <th className="w-[9rem] p-3">תמונה</th>
                  <th className="p-3">כותרת</th>
                  <th className="p-3">קישור</th>
                  <th className="p-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {galleryItems.map((galleryItem) => (
                  <Fragment key={galleryItem.id}>
                    <tr className="border-b border-gray-100 align-middle transition-colors hover:bg-teal-100">
                      <td className="w-[9rem] py-4 px-3">
                        <ItemImage
                          src={galleryItem.imageUrl}
                          alt={galleryItem.title || 'תמונת גלריה'}
                          className="h-[9rem] w-[9rem] rounded-lg object-cover"
                        />
                      </td>
                      <td className="py-4 px-3 font-medium text-gray-500">{galleryItem.title || '—'}</td>
                      <td className="py-4 px-3">
                        <a
                          href={galleryItem.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-700 underline break-all"
                        >
                          {galleryItem.imageUrl}
                        </a>
                      </td>
                      <td className="py-4 px-3">
                        <Button variant="secondary" className="text-sm" onClick={() => openEdit(galleryItem)}>
                          עריכה
                        </Button>
                        <Button
                          variant="danger"
                          className="mr-2 text-sm"
                          onClick={() => setDeleteConfirm({ id: galleryItem.id, title: galleryItem.title })}
                        >
                          מחיקה
                        </Button>
                      </td>
                    </tr>
                    {editingId === galleryItem.id && (
                      <tr className="border-b border-gray-200 bg-primary-50/40">
                        <td colSpan={4} className="p-4">
                          {renderEditor()}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {galleryItems.length === 0 && <p className="py-4 text-center text-gray-600">אין תמונות בגלריה</p>}
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="מחיקת תמונה"
        message={deleteConfirm ? (deleteConfirm.title ? `למחוק את "${deleteConfirm.title}"?` : 'למחוק את התמונה?') : ''}
        confirmLabel="מחיקה"
        cancelLabel="ביטול"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default GalleryManager;
