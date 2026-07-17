import { Fragment, useState } from 'react';
import toast from 'react-hot-toast';
import { useItems } from '../../hooks/useItems.js';
import { createItem, updateItem, deleteItem } from '../../firebase/items.js';
import { validateItemForm } from '../../utils/validation.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import { CATEGORIES, ORDER_CATEGORIES, LABELS } from '../../constants/he.js';
import Card from '../../components/Card.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ItemImage from '../../components/ItemImage.jsx';
import Chip from '../../components/Chip.jsx';

const Inventory = () => {
  const { items, loading, error, reload } = useItems();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editingId, setEditingId] = useState(undefined);
  const [form, setForm] = useState({ name: '', category: '', orderCategoryId: '', maxQuantity: '', priceIfBroken: '', imageUrl: '', notes: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const filtered = items.filter((item) => {
    const matchName = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || item.category === categoryFilter;
    return matchName && matchCat;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', category: '', orderCategoryId: '', maxQuantity: '', priceIfBroken: '', imageUrl: '', notes: '' });
    setFormErrors({});
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      name: item.name || '',
      category: item.category || '',
      orderCategoryId: item.orderCategoryId || '',
      maxQuantity: String(item.maxQuantity ?? ''),
      priceIfBroken: String(item.priceIfBroken ?? ''),
      imageUrl: item.imageUrl || '',
      notes: item.notes || '',
    });
    setFormErrors({});
  };

  const handleSave = async () => {
    const errs = validateItemForm(form);
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateItem(editingId, { ...form, maxQuantity: Number(form.maxQuantity), priceIfBroken: Number(form.priceIfBroken), orderCategoryId: form.orderCategoryId || undefined });
        toast.success('הפריט עודכן');
      } else {
        await createItem({ ...form, maxQuantity: Number(form.maxQuantity), priceIfBroken: Number(form.priceIfBroken), orderCategoryId: form.orderCategoryId || undefined });
        toast.success('הפריט נוסף');
      }
      reload();
      setEditingId(null);
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteItem(deleteConfirm.id);
      toast.success('הפריט נמחק');
      reload();
      setDeleteConfirm(null);
    } catch (e) {
      toast.error(getHebrewError(e));
    }
  };

  const renderEditorPanel = () => (
    <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/30 p-6">
      <h2 className="mb-4 text-lg font-bold text-gray-900">{editingId ? 'עריכת פריט' : 'פריט חדש'}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Input label={LABELS.itemName} id="itemName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={formErrors.name} required />
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{LABELS.category}</label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            aria-label={LABELS.category}
          >
            <option value="">בחרו</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {formErrors.category && <p className="mt-1 text-sm text-danger">{formErrors.category}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{LABELS.orderCategory}</label>
          <select
            value={form.orderCategoryId}
            onChange={(e) => setForm((f) => ({ ...f, orderCategoryId: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            aria-label={LABELS.orderCategory}
          >
            <option value="">לא נבחר (יופיע לפי קטגוריה)</option>
            {ORDER_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <Input label={LABELS.maxQuantity} id="maxQty" type="number" min={0} value={form.maxQuantity} onChange={(e) => setForm((f) => ({ ...f, maxQuantity: e.target.value }))} error={formErrors.maxQuantity} required />
        <Input label={LABELS.priceIfBroken} id="priceBroken" type="number" min={0} value={form.priceIfBroken} onChange={(e) => setForm((f) => ({ ...f, priceIfBroken: e.target.value }))} />
        <Input label={LABELS.imageUrl} id="imageUrl" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} error={formErrors.imageUrl} placeholder="https://..." className="md:col-span-2" />
        <Input label={LABELS.notes} id="notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="md:col-span-2" />
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">{saving ? 'שומר...' : 'שמירה'}</Button>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setEditingId(undefined)}>ביטול</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">ניהול מלאי</h1>

      <Card>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <input
            type="text"
            placeholder="חיפוש פריט..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400 sm:min-w-[12rem] sm:flex-1"
            aria-label="חיפוש פריט"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400 sm:w-auto"
            aria-label="סינון קטגוריה"
          >
            <option value="">כל הקטגוריות</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button onClick={openAdd} className="w-full sm:w-auto" ariaLabel="הוספת פריט">הוספת פריט</Button>
        </div>

        {editingId === null && <div className="mb-6">{renderEditorPanel()}</div>}

        {error && <p className="text-danger">{getHebrewError(error)}</p>}
        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <ItemImage src={item.imageUrl} alt={item.name} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Chip variant="eventType" value={item.category}>{item.category}</Chip>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        {item.orderCategoryId ? (ORDER_CATEGORIES.find((c) => c.id === item.orderCategoryId)?.label ?? item.orderCategoryId) : '—'}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">כמות: {item.maxQuantity} · שבירה: {item.priceIfBroken ?? '-'} ₪</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button variant="secondary" className="w-full text-sm" onClick={() => openEdit(item)}>עריכה</Button>
                    <Button variant="danger" className="w-full text-sm" onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}>מחיקה</Button>
                  </div>
                  {editingId === item.id && (
                    <div className="mt-4 border-t border-gray-100 pt-4">{renderEditorPanel()}</div>
                  )}
                </div>
              ))}
              {filtered.length === 0 && <p className="py-4 text-center text-gray-600">אין פריטים</p>}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                  <th className="w-[9rem] p-3">תמונה</th>
                  <th className="p-3">שם</th>
                  <th className="p-3">קטגוריה</th>
                  <th className="p-3">קטגוריה בהזמנה</th>
                  <th className="p-3">כמות מקסימלית</th>
                  <th className="p-3">מחיר שבירה</th>
                  <th className="p-3">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <Fragment key={item.id}>
                    <tr className="border-b border-gray-100 align-middle transition-colors hover:bg-teal-100">
                      <td className="w-[9rem] py-4 px-3">
                        <ItemImage src={item.imageUrl} alt={item.name} className="h-[9rem] w-[9rem] object-cover rounded-lg" />
                      </td>
                      <td className="py-4 px-3 font-medium">{item.name}</td>
                      <td className="py-4 px-3"><Chip variant="eventType" value={item.category}>{item.category}</Chip></td>
                      <td className="py-4 px-3 text-sm text-gray-600">
                        {item.orderCategoryId ? (ORDER_CATEGORIES.find((c) => c.id === item.orderCategoryId)?.label ?? item.orderCategoryId) : '—'}
                      </td>
                      <td className="py-4 px-3">{item.maxQuantity}</td>
                      <td className="py-4 px-3">{item.priceIfBroken ?? '-'} ₪</td>
                      <td className="py-4 px-3">
                        <div className="flex flex-col gap-2">
                          <Button variant="secondary" className="text-sm" onClick={() => openEdit(item)}>עריכה</Button>
                          <Button variant="danger" className="text-sm" onClick={() => setDeleteConfirm({ id: item.id, name: item.name })}>מחיקה</Button>
                        </div>
                      </td>
                    </tr>
                    {editingId === item.id && (
                      <tr className="border-b border-gray-200 bg-primary-50/40">
                        <td colSpan={7} className="p-4">
                          {renderEditorPanel()}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="py-4 text-center text-gray-600">אין פריטים</p>}
          </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="מחיקת פריט"
        message={deleteConfirm ? `למחוק את "${deleteConfirm.name}"?` : ''}
        confirmLabel="מחיקה"
        cancelLabel="ביטול"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

export default Inventory;
