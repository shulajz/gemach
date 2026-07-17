import { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  getOrderById,
  updateOrder,
  generateCustomerEditLink,
  revokeCustomerEditLink,
  permanentlyDeleteArchivedOrder,
} from '../../firebase/orders.js';
import { getItems } from '../../firebase/items.js';
import { getReservationsForDate } from '../../firebase/reservations.js';
import { getHebrewError } from '../../utils/errorsHe.js';
import { downloadOrderPdf } from '../../utils/pdfExport.js';
import { ORDER_STATUSES, LABELS, getEventTypeLabel } from '../../constants/he.js';
import { canPermanentlyDeleteFromArchive } from '../../constants/adminPrivileges.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';
import Chip from '../../components/Chip.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { AuthContext } from '../../context/AuthContext.jsx';
import WhatsAppPrompt from './order-detail/WhatsAppPrompt.jsx';
import OrderMetaEditCollapse from './order-detail/OrderMetaEditCollapse.jsx';
import OrderItemsEditCollapse from './order-detail/OrderItemsEditCollapse.jsx';
import OrderReturnsCollapse from './order-detail/OrderReturnsCollapse.jsx';
import CustomerEditLinkCollapse from './order-detail/CustomerEditLinkCollapse.jsx';
import {
  toDateStr,
  hasAnyReturnedItems,
  getTabsForEventType,
  itemMatchesTab,
  getItemsForEventType,
  isFullyReturned,
  normalizeReturnedItems,
  buildWhatsAppApprovalUrl,
  buildWhatsAppCustomerEditLinkUrl,
  isOrderFormDirty,
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
  const [orderEditOpen, setOrderEditOpen] = useState(false);
  const [itemsEditOpen, setItemsEditOpen] = useState(false);
  const [returnsEditOpen, setReturnsEditOpen] = useState(false);
  const [customerLinkOpen, setCustomerLinkOpen] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [whatsAppUrlAfterSave, setWhatsAppUrlAfterSave] = useState('');
  const [customerEditLink, setCustomerEditLink] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmDeleteArchiveOpen, setConfirmDeleteArchiveOpen] = useState(false);
  const [leaveIntent, setLeaveIntent] = useState(null); // null | 'exitEdit'
  const [didInitEdit, setDidInitEdit] = useState(false);
  const formRef = useRef(null);
  const { user } = useContext(AuthContext);
  const canDeleteFromArchive = canPermanentlyDeleteFromArchive(user);
  const isDirty = useMemo(() => isOrderFormDirty(form, order), [form, order]);
  const shouldBlockNavigation = Boolean(editMode && isDirty);

  useEffect(() => {
    formRef.current = form;
  }, [form]);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlockNavigation && currentLocation.pathname !== nextLocation.pathname,
  );
  const unsavedDialogOpen = leaveIntent != null || blocker.state === 'blocked';

  const handlePermanentlyDeleteFromArchive = async () => {
    setConfirmDeleteArchiveOpen(false);
    setSaving(true);
    try {
      await permanentlyDeleteArchivedOrder(orderId);
      toast.success(LABELS.deleteFromArchiveSuccess);
      navigate('/admin/orders');
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
    }
  };

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
    // Use saved order qty so reserved stock for this order is available while editing
    const currentOrderQty = (order?.items || []).find((i) => i.itemId === itemId)?.quantity || 0;
    return { max, reserved, available: Math.max(0, max - reserved + currentOrderQty) };
  };
  const tabsForEventType = useMemo(
    () => getTabsForEventType(order?.eventType),
    [order?.eventType]
  );
  const currentTab = tabsForEventType[activeTabIndex];
  const itemsForEventType = useMemo(
    () => getItemsForEventType(items, order?.eventType),
    [items, order?.eventType],
  );
  const itemsInCurrentTab = useMemo(() => {
    if (!currentTab) return [];
    return itemsForEventType.filter((item) => itemMatchesTab(item, currentTab.id));
  }, [itemsForEventType, currentTab]);

  const startEditFromOrder = (sourceOrder, { focusReturns = false } = {}) => {
    if (!sourceOrder) return;
    setForm({
      status: sourceOrder.status,
      depositPaid: sourceOrder.depositPaid,
      donationAmount: sourceOrder.donationAmount || 0,
      notes: sourceOrder.notes || '',
      brokenItems: sourceOrder.brokenItems ? [...sourceOrder.brokenItems] : [],
      items: (sourceOrder.items || []).map((i) => ({ ...i })),
      returnedItems: (sourceOrder.returnedItems || []).map((i) => ({ ...i })),
      addItemQuantities: {},
    });
    setOrderEditOpen(false);
    setItemsEditOpen(false);
    setReturnsEditOpen(Boolean(focusReturns));
    setActiveTabIndex(0);
    setEditMode(true);
  };

  useEffect(() => {
    setDidInitEdit(false);
    setEditMode(false);
    setForm(null);
  }, [orderId]);

  useEffect(() => {
    if (!order || didInitEdit) return;
    startEditFromOrder(order);
    setDidInitEdit(true);
  }, [order, didInitEdit]);

  useEffect(() => {
    if (!tabsForEventType.length) return;
    if (activeTabIndex > tabsForEventType.length - 1) setActiveTabIndex(0);
  }, [tabsForEventType, activeTabIndex]);

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

  const requestLeave = (intent) => {
    if (intent === 'back') {
      navigate('/admin/orders');
      return;
    }
    // Discard local edits and keep the edit panels open
    if (editMode && isDirty) {
      setLeaveIntent('exitEdit');
      return;
    }
    startEditFromOrder(order);
  };

  const handleDiscardAndLeave = () => {
    if (blocker.state === 'blocked') {
      setLeaveIntent(null);
      setEditMode(false);
      setForm(null);
      blocker.proceed();
      return;
    }
    setLeaveIntent(null);
    startEditFromOrder(order);
  };

  const handleStayEditing = () => {
    setLeaveIntent(null);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const readFieldValue = (fieldId, fallback = '') => {
    const el = document.getElementById(fieldId);
    if (el && typeof el.value === 'string') return el.value;
    return fallback;
  };

  const saveOrder = async () => {
    // Commit any focused input (mobile often delays the last keystroke until blur)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await new Promise((resolve) => setTimeout(resolve, 0));

    const currentForm = formRef.current;
    if (!currentForm) return false;

    setSaving(true);
    try {
      // Always persist the full form snapshot so multiple edits (meta + items + returns)
      // are saved together. Prefer live DOM values for text/number fields still focused.
      const donationRaw = readFieldValue(
        'order-donation-amount',
        currentForm.donationAmount,
      );
      const notesRaw = readFieldValue('order-notes', currentForm.notes || '');
      const statusRaw = readFieldValue('order-status', currentForm.status);
      const depositEl = document.getElementById('order-deposit-paid');
      const depositPaid =
        depositEl && 'checked' in depositEl
          ? Boolean(depositEl.checked)
          : Boolean(currentForm.depositPaid);

      const nextItems = lockOrderEditing
        ? (currentForm.items || []).map((i) => ({ ...i }))
        : (currentForm.items || []).filter((i) => (Number(i.quantity) || 0) > 0);
      const normalizedReturnedItems = normalizeReturnedItems(
        nextItems,
        currentForm.returnedItems,
      );
      const fullyReturnedNow = isFullyReturned(nextItems, normalizedReturnedItems);
      const nextStatus = fullyReturnedNow
        ? 'הוחזר'
        : statusRaw === 'הוחזר'
          ? 'נאסף'
          : statusRaw || currentForm.status;

      const updates = {
        status: nextStatus,
        depositPaid,
        donationAmount: Number(donationRaw) || 0,
        notes: notesRaw || '',
        brokenItems: currentForm.brokenItems || [],
        items: nextItems,
        returnedItems: normalizedReturnedItems,
      };
      // Fully returned orders leave the main list but stay in archive history
      if (fullyReturnedNow) {
        updates.archived = true;
      }
      const updated = await updateOrder(orderId, updates, order);
      setOrder(updated);
      setLeaveIntent(null);
      startEditFromOrder(updated);
      setWhatsAppUrlAfterSave(buildWhatsAppApprovalUrl(updated));
      toast.success(
        fullyReturnedNow
          ? 'ההזמנה נסגרה והועברה לארכיון'
          : 'ההזמנה עודכנה',
      );
      return true;
    } catch (e) {
      toast.error(getHebrewError(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFromUnsavedDialog = async () => {
    const wasBlocked = blocker.state === 'blocked';
    const ok = await saveOrder();
    if (!ok) return;
    if (wasBlocked && blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  useEffect(() => {
    if (!editMode || !isDirty) return undefined;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editMode, isDirty]);

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

  const handleSendCustomerEditLinkWhatsApp = () => {
    const url = buildWhatsAppCustomerEditLinkUrl(order, customerEditLink);
    if (!url) {
      toast.error('אין טלפון לקוח או קישור עריכה לשליחה');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
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

  const eventDateLabel = order.eventDate
    ? format(
        order.eventDate instanceof Date ? order.eventDate : new Date(order.eventDate),
        'dd/MM/yyyy',
      )
    : '-';

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="secondary"
          onClick={() => requestLeave('back')}
          ariaLabel="חזרה להזמנות"
        >
          חזרה להזמנות
        </Button>
      </div>
      {order.archived && (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-2 text-center font-medium text-amber-900">
          הזמנה בארכיון – לא מופיעה ברשימה הרגילה. אפשר לשחזר עם הכפתור למטה.
        </div>
      )}
      <Card>
        <h1 className="mb-3 text-xl font-bold">פרטי הזמנה</h1>
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm sm:px-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-5 sm:gap-y-1">
            <p className="break-words font-semibold text-gray-900">
              {order.customerName || 'ללא שם'}
            </p>
            <p className="break-words text-gray-700" dir="ltr">
              {order.phone || '—'}
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">תאריך אירוע:</span> {eventDateLabel}
            </p>
          </div>
          {(order.city || order.eventType) && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {order.city && <span>{order.city}</span>}
              {order.city && order.eventType && <span aria-hidden="true">·</span>}
              {order.eventType && (
                <Chip variant="eventType" value={order.eventType}>
                  {getEventTypeLabel(order.eventType)}
                </Chip>
              )}
            </p>
          )}
        </div>

        <WhatsAppPrompt
          visible={!!whatsAppUrlAfterSave && !isDirty}
          onOpen={openWhatsAppAfterSave}
        />

        {editMode && form ? (
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
            <CustomerEditLinkCollapse
              open={customerLinkOpen}
              onToggle={() => setCustomerLinkOpen((v) => !v)}
              customerEditEnabled={customerEditEnabled}
              customerEditExpiresAt={customerEditExpiresAt}
              customerEditLink={customerEditLink}
              saving={saving}
              hasPhone={!!order.phone}
              onGenerate={handleGenerateCustomerEditLink}
              onCopy={handleCopyCustomerEditLink}
              onSendWhatsApp={handleSendCustomerEditLinkWhatsApp}
              onRevoke={handleRevokeCustomerEditLink}
            />

            <div className="mt-6 space-y-3 border-t border-gray-100 pt-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  onClick={() => saveOrder()}
                  disabled={saving || !isDirty}
                  className="w-full sm:w-auto"
                  ariaLabel={LABELS.saveOrder}
                >
                  {saving ? LABELS.savingOrder : LABELS.saveOrder}
                </Button>
                {order.archived ? (
                  <>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        setSaving(true);
                        try {
                          await updateOrder(orderId, { archived: false }, order);
                          const next = { ...order, archived: false };
                          setOrder(next);
                          toast.success('ההזמנה שוחזרה מהארכיון');
                        } catch (e) {
                          toast.error(getHebrewError(e));
                        } finally {
                          setSaving(false);
                        }
                      }}
                      disabled={saving || isDirty}
                      ariaLabel={LABELS.restoreFromArchive}
                    >
                      {LABELS.restoreFromArchive}
                    </Button>
                    {canDeleteFromArchive && (
                      <Button
                        variant="danger"
                        className="w-full sm:w-auto"
                        onClick={() => setConfirmDeleteArchiveOpen(true)}
                        disabled={saving || isDirty}
                        ariaLabel={LABELS.deleteFromArchive}
                      >
                        {LABELS.deleteFromArchive}
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        await updateOrder(orderId, { archived: true }, order);
                        const next = { ...order, archived: true };
                        setOrder(next);
                        toast.success('ההזמנה הועברה לארכיון');
                      } catch (e) {
                        toast.error(getHebrewError(e));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || isDirty}
                    ariaLabel={LABELS.moveToArchive}
                  >
                    {LABELS.moveToArchive}
                  </Button>
                )}
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
            </div>
          </>
        ) : (
          <div className="mt-6 flex justify-center py-8">
            <Spinner />
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={unsavedDialogOpen}
        title={LABELS.unsavedChangesTitle}
        message={LABELS.unsavedChangesMessage}
        confirmLabel={saving ? LABELS.savingOrder : LABELS.unsavedSave}
        cancelLabel={LABELS.unsavedStay}
        discardLabel={
          leaveIntent === 'exitEdit' ? LABELS.unsavedDiscardChanges : LABELS.unsavedDiscard
        }
        confirmDisabled={saving}
        onConfirm={handleSaveFromUnsavedDialog}
        onCancel={handleStayEditing}
        onDiscard={handleDiscardAndLeave}
      />
      <ConfirmDialog
        isOpen={confirmDeleteArchiveOpen}
        title={LABELS.deleteFromArchiveConfirmTitle}
        message={LABELS.deleteFromArchiveConfirmMessage}
        confirmLabel={LABELS.deleteFromArchive}
        cancelLabel="ביטול"
        variant="danger"
        onConfirm={handlePermanentlyDeleteFromArchive}
        onCancel={() => setConfirmDeleteArchiveOpen(false)}
      />

    </div>
  );
};

export default OrderDetail;
