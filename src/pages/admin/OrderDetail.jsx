import { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  getOrderById,
  updateOrder,
  generateCustomerEditLink,
  revokeCustomerEditLink,
} from '../../firebase/orders.js';
import { getItems } from '../../firebase/items.js';
import { getReservationsForDate } from '../../firebase/reservations.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import { downloadOrderPdf } from '../../utils/pdfExport.js';
import { ORDER_STATUSES, LABELS } from '../../constants/he.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import Chip from '../../components/Chip.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import WhatsAppPrompt from './order-detail/WhatsAppPrompt.jsx';
import OrderMetaEditCollapse from './order-detail/OrderMetaEditCollapse.jsx';
import OrderItemsEditCollapse from './order-detail/OrderItemsEditCollapse.jsx';
import OrderReturnsCollapse from './order-detail/OrderReturnsCollapse.jsx';
import {
  toDateStr,
  getReturnedQty,
  hasAnyReturnedItems,
  getTabsForEventType,
  itemMatchesTab,
  isFullyReturned,
  normalizeReturnedItems,
  buildWhatsAppApprovalUrl,
} from './order-detail/helpers.js';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [orderEditOpen, setOrderEditOpen] = useState(true);
  const [itemsEditOpen, setItemsEditOpen] = useState(true);
  const [returnsEditOpen, setReturnsEditOpen] = useState(true);
  const [didAutoEnterEdit, setDidAutoEnterEdit] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [whatsAppUrlAfterSave, setWhatsAppUrlAfterSave] = useState('');
  const [customerEditLink, setCustomerEditLink] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [o, itemsList] = await Promise.all([getOrderById(orderId), getItems()]);
        if (cancelled) return;
        setOrder(o);
        setItems(itemsList);
        if (o?.eventDate) {
          const dateStr = toDateStr(o.eventDate);
          const res = await getReservationsForDate(dateStr);
          setReservations(res);
        }
      } catch (e) {
        toast.error(getHebrewError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [orderId]);

  const availability = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    const max = item ? Number(item.maxQuantity) || 0 : 0;
    const reserved = Number(reservations[itemId]) || 0;
    const currentOrderQty = (order?.items || []).find((i) => i.itemId === itemId)?.quantity || 0;
    return { max, reserved, available: Math.max(0, max - reserved + currentOrderQty) };
  };
  const tabsForEventType = useMemo(
    () => getTabsForEventType(order?.eventType),
    [order?.eventType]
  );
  const currentTab = tabsForEventType[activeTabIndex];
  const itemsForEventType = useMemo(() => {
    if (!order?.eventType) return [];
    return items.filter((item) => item.category === order.eventType || item.category === 'ניטרלי');
  }, [items, order?.eventType]);
  const itemsInCurrentTab = useMemo(() => {
    if (!currentTab) return [];
    return itemsForEventType.filter((item) => itemMatchesTab(item, currentTab.id));
  }, [itemsForEventType, currentTab]);

  const startEdit = () => {
    setForm({
      status: order.status,
      depositPaid: order.depositPaid,
      donationAmount: order.donationAmount || 0,
      notes: order.notes || '',
      brokenItems: order.brokenItems ? [...order.brokenItems] : [],
      items: (order.items || []).map((i) => ({ ...i })),
      returnedItems: (order.returnedItems || []).map((i) => ({ ...i })),
      addItemQuantities: {},
    });
    setOrderEditOpen(false);
    setItemsEditOpen(false);
    setReturnsEditOpen(false);
    setActiveTabIndex(0);
    setEditMode(true);
  };

  useEffect(() => {
    if (!tabsForEventType.length) return;
    if (activeTabIndex > tabsForEventType.length - 1) setActiveTabIndex(0);
  }, [tabsForEventType, activeTabIndex]);

  useEffect(() => {
    if (!order || didAutoEnterEdit) return;
    startEdit();
    setDidAutoEnterEdit(true);
  }, [order, didAutoEnterEdit]);

  const orderHasReturns = hasAnyReturnedItems(order?.returnedItems);
  const formHasReturns = hasAnyReturnedItems(form?.returnedItems);
  const orderFullyReturned = isFullyReturned(order?.items, order?.returnedItems);
  const lockOrderEditing = orderHasReturns || formHasReturns;

  const openWhatsAppAfterSave = () => {
    if (!whatsAppUrlAfterSave) {
      toast.error('אין קישור וואטסאפ זמין להזמנה זו');
      return;
    }
    window.open(whatsAppUrlAfterSave, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!lockOrderEditing) return;
    if (orderEditOpen) setOrderEditOpen(false);
  }, [lockOrderEditing, orderEditOpen]);

  const addOrUpdateItemInForm = (itemId, itemName, quantity) => {
    if (lockOrderEditing) {
      toast.error('לא ניתן לערוך את פרטי ההזמנה אחרי שהחלה החזרה');
      return;
    }
    const { available } = availability(itemId);
    if (quantity <= 0 || quantity > available) {
      toast.error('הפריט לא פנוי בתאריך זה או כמות לא חוקית');
      return;
    }
    const existing = form.items.find((i) => i.itemId === itemId);
    if (existing) {
      setForm((f) => ({
        ...f,
        items: f.items.map((i) => (i.itemId === itemId ? { ...i, quantity } : i)),
        returnedItems: normalizeReturnedItems(
          f.items.map((i) => (i.itemId === itemId ? { ...i, quantity } : i)),
          f.returnedItems
        ),
      }));
    } else {
      setForm((f) => ({ ...f, items: [...f.items, { itemId, itemName, quantity }] }));
    }
  };

  const removeItemFromForm = (index) => {
    if (lockOrderEditing) {
      toast.error('לא ניתן לערוך את פרטי ההזמנה אחרי שהחלה החזרה');
      return;
    }
    setForm((f) => {
      const nextItems = f.items.filter((_, i) => i !== index);
      return {
        ...f,
        items: nextItems,
        returnedItems: normalizeReturnedItems(nextItems, f.returnedItems),
      };
    });
  };

  const setReturnedQtyInForm = (itemId, itemName, orderedQty, value) => {
    const qty = Math.max(0, Math.min(orderedQty, parseInt(value, 10) || 0));
    setForm((f) => {
      const existing = (f.returnedItems || []).find((r) => r.itemId === itemId);
      let nextReturned = f.returnedItems || [];
      if (qty <= 0) {
        nextReturned = nextReturned.filter((r) => r.itemId !== itemId);
      } else if (existing) {
        nextReturned = nextReturned.map((r) => (r.itemId === itemId ? { ...r, quantity: qty } : r));
      } else {
        nextReturned = [...nextReturned, { itemId, itemName, quantity: qty }];
      }
      return { ...f, returnedItems: nextReturned };
    });
  };

  const markAllReturned = () => {
    setForm((f) => ({
      ...f,
      status: 'הוחזר',
      returnedItems: (f.items || [])
        .filter((i) => (Number(i.quantity) || 0) > 0)
        .map((i) => ({ itemId: i.itemId, itemName: i.itemName, quantity: Number(i.quantity) || 0 })),
    }));
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const nextItems = lockOrderEditing
        ? form.items
        : form.items.filter((i) => i.quantity > 0);
      const normalizedReturnedItems = normalizeReturnedItems(nextItems, form.returnedItems);
      const fullyReturnedNow = isFullyReturned(nextItems, normalizedReturnedItems);
      const nextStatus = fullyReturnedNow
        ? 'הוחזר'
        : form.status === 'הוחזר'
          ? 'נאסף'
          : form.status;

      const updates = lockOrderEditing
        ? {
            status: nextStatus,
            returnedItems: normalizedReturnedItems,
          }
        : {
            status: nextStatus,
            depositPaid: form.depositPaid,
            donationAmount: Number(form.donationAmount) || 0,
            notes: form.notes,
            brokenItems: form.brokenItems,
            items: nextItems,
            returnedItems: normalizedReturnedItems,
          };
      const updated = await updateOrder(orderId, updates, order);
      setOrder(updated);
      setEditMode(false);
      setWhatsAppUrlAfterSave(buildWhatsAppApprovalUrl(updated));
      toast.success('ההזמנה עודכנה');
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const eventDateStr = toDateStr(order.eventDate);
  const customerEditEnabled = !!order?.customerEdit?.enabled;
  const customerEditExpiresAt = order?.customerEdit?.expiresAt
    ? format(
        order.customerEdit.expiresAt instanceof Date
          ? order.customerEdit.expiresAt
          : new Date(order.customerEdit.expiresAt),
        'dd/MM/yyyy HH:mm',
      )
    : '';

  const handleGenerateCustomerEditLink = async () => {
    setSaving(true);
    try {
      const { token } = await generateCustomerEditLink(orderId, {
        hoursValid: 24,
        createdBy: user?.email || 'admin',
      });
      const link = `${window.location.origin}/order-edit/${orderId}?token=${encodeURIComponent(token)}`;
      setCustomerEditLink(link);
      const refreshed = await getOrderById(orderId);
      setOrder(refreshed);
      toast.success('קישור עריכה פרטי נוצר ל-24 שעות');
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeCustomerEditLink = async () => {
    setSaving(true);
    try {
      await revokeCustomerEditLink(orderId);
      setCustomerEditLink('');
      const refreshed = await getOrderById(orderId);
      setOrder(refreshed);
      toast.success('קישור העריכה בוטל');
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCustomerEditLink = async () => {
    const link = customerEditLink;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('הקישור הועתק');
    } catch {
      toast.error('לא ניתן להעתיק את הקישור');
    }
  };

  const handleDownloadPdf = async () => {
    if (!order) return;
    setExportingPdf(true);
    try {
      await downloadOrderPdf(order);
      toast.success('הורדת PDF החלה');
    } catch {
      toast.error('שגיאה ביצירת PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="secondary" onClick={() => navigate('/admin/orders')} ariaLabel="חזרה להזמנות">
          חזרה להזמנות
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleDownloadPdf}
          disabled={exportingPdf}
          className="w-full sm:w-auto"
          ariaLabel="הורדת PDF"
        >
          {exportingPdf ? 'מייצא...' : 'הורדת PDF'}
        </Button>
      </div>
      {order.archived && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-center font-medium text-amber-900">
          הזמנה בארכיון – לא מופיעה ברשימה הרגילה. אפשר לשחזר עם הכפתור למטה.
        </div>
      )}
      <Card>
        <h1 className="mb-4 text-xl font-bold">פרטי הזמנה</h1>
        <div className="mb-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
          <p className="font-semibold text-indigo-900">קישור סודי לעריכת הזמנה על ידי לקוח</p>
          <p className="mt-1 text-sm text-indigo-800">
            יוצרים קישור רק אחרי אישור טלפוני מהצוות. תוקף הקישור הוא 24 שעות.
          </p>
          {customerEditEnabled && (
            <p className="mt-1 text-xs text-indigo-700">פעיל עד: {customerEditExpiresAt}</p>
          )}
          {customerEditLink && (
            <div className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700">
              {customerEditLink}
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={handleGenerateCustomerEditLink}
              disabled={saving}
              className="w-full sm:w-auto"
              ariaLabel="יצירת קישור עריכה ללקוח"
            >
              יצירת קישור עריכה ללקוח
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopyCustomerEditLink}
              disabled={!customerEditLink}
              className="w-full sm:w-auto"
              ariaLabel="העתקת קישור עריכה"
            >
              העתקת קישור
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleRevokeCustomerEditLink}
              disabled={!customerEditEnabled || saving}
              className="w-full sm:w-auto"
              ariaLabel="ביטול קישור עריכה"
            >
              ביטול קישור
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <p><strong>שם:</strong> {order.customerName}</p>
          <p><strong>טלפון:</strong> {order.phone}</p>
          <p><strong>עיר:</strong> {order.city}</p>
          <p><strong>תאריך אירוע:</strong> {order.eventDate ? format(order.eventDate instanceof Date ? order.eventDate : new Date(order.eventDate), 'dd/MM/yyyy') : '-'}</p>
          <p><strong>סוג אירוע:</strong> <Chip variant="eventType" value={order.eventType}>{order.eventType}</Chip></p>
        </div>
        <WhatsAppPrompt visible={!editMode && !!whatsAppUrlAfterSave} onOpen={openWhatsAppAfterSave} />
        {!editMode ? (
          <>
            <div className="mt-4">
              <p><strong>סטטוס:</strong> <Chip variant="status" value={order.status}>{order.status}</Chip></p>
              <p><strong>פיקדון שולם:</strong> {order.depositPaid ? 'כן' : 'לא'}</p>
              <p><strong>סכום תרומה:</strong> {order.donationAmount ?? 0} ₪</p>
            </div>
            <div className="mt-4">
              <h2 className="font-semibold">פריטים</h2>
              <ul className="list-disc list-inside">
                {(order.items || []).map((i, idx) => (
                  <li key={idx}>{i.itemName} – {i.quantity}</li>
                ))}
              </ul>
            </div>
            <div className="mt-4 rounded-xl border-2 border-teal-300 bg-white p-4">
              <h2 className="font-semibold text-teal-900">מעקב החזרות</h2>
              <ul className="mt-2 space-y-1">
                {(order.items || []).map((i) => {
                  const returned = getReturnedQty(order.returnedItems, i.itemId);
                  const remaining = Math.max(0, (Number(i.quantity) || 0) - returned);
                  return (
                    <li key={i.itemId} className="text-sm">
                      {i.itemName}: הוחזרו {returned} / {i.quantity}
                      {remaining > 0 ? (
                        <span className="mr-2 font-medium text-amber-700">(נותרו {remaining})</span>
                      ) : (
                        <span className="mr-2 font-medium text-emerald-700">(הוחזר הכל)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            {(order.brokenItems || []).length > 0 && (
              <div className="mt-4">
                <h2 className="font-semibold">כלים שבורים</h2>
                <ul className="list-disc list-inside">
                  {order.brokenItems.map((b, idx) => (
                    <li key={idx}>{b.itemName} – {b.quantity}, עלות: {b.cost ?? ''} ₪</li>
                  ))}
                </ul>
              </div>
            )}
            {order.notes && <p className="mt-4 text-gray-800"><strong>הערות:</strong> {order.notes}</p>}
            <div className="mt-6 flex flex-wrap gap-2">
              {!orderHasReturns && (
                <Button onClick={startEdit} ariaLabel="עריכת הזמנה">עריכת הזמנה</Button>
              )}
              {!orderFullyReturned && (
                <Button variant="secondary" onClick={startEdit} ariaLabel="החזר פריטים">החזר פריטים</Button>
              )}
              {order.archived ? (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await updateOrder(orderId, { archived: false }, order);
                      setOrder((prev) => (prev ? { ...prev, archived: false } : prev));
                      toast.success('ההזמנה שוחזרה מהארכיון');
                    } catch (e) {
                      toast.error(getHebrewError(e));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  ariaLabel={LABELS.restoreFromArchive}
                >
                  {LABELS.restoreFromArchive}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await updateOrder(orderId, { archived: true }, order);
                      setOrder((prev) => (prev ? { ...prev, archived: true } : prev));
                      toast.success('ההזמנה הועברה לארכיון');
                    } catch (e) {
                      toast.error(getHebrewError(e));
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  ariaLabel={LABELS.moveToArchive}
                >
                  {LABELS.moveToArchive}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {lockOrderEditing && (
              <div className="mt-4 rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                כבר סומנו פריטים כהוחזרו, לכן לא ניתן לערוך את פרטי ההזמנה או כמויות הפריטים.
              </div>
            )}
            {!lockOrderEditing && (
              <OrderMetaEditCollapse
                open={orderEditOpen}
                onToggle={() => setOrderEditOpen((v) => !v)}
                form={form}
                setForm={setForm}
              />
            )}
            {!lockOrderEditing && (
              <OrderItemsEditCollapse
                open={itemsEditOpen}
                onToggle={() => setItemsEditOpen((v) => !v)}
                form={form}
                items={items}
                availability={availability}
                removeItemFromForm={removeItemFromForm}
                tabsForEventType={tabsForEventType}
                activeTabIndex={activeTabIndex}
                setActiveTabIndex={setActiveTabIndex}
                itemsInCurrentTab={itemsInCurrentTab}
                addOrUpdateItemInForm={addOrUpdateItemInForm}
                setForm={setForm}
              />
            )}
            <OrderReturnsCollapse
              visible={!orderFullyReturned}
              open={returnsEditOpen}
              onToggle={() => setReturnsEditOpen((v) => !v)}
              form={form}
              markAllReturned={markAllReturned}
              setReturnedQtyInForm={setReturnedQtyInForm}
            />
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button onClick={saveOrder} disabled={saving} className="w-full sm:w-auto">{saving ? 'שומר...' : 'שמירה'}</Button>
              <Button variant="secondary" onClick={() => setEditMode(false)} className="w-full sm:w-auto">ביטול</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default OrderDetail;
