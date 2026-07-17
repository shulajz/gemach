import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getItems } from "../../firebase/items.js";
import { getReservationsForDate } from "../../firebase/reservations.js";
import {
  updateOrderByCustomerLink,
  validateCustomerEditAccess,
} from "../../firebase/orders.js";
import { validateOrderForm, formatIsraeliPhone } from "../../utils/validation.js";
import { getHebrewError } from "../../utils/errorsHe.js";
import { formatAvailabilityText, isItemUnavailable } from "../../utils/formatAvailability.js";
import {
  getQuantityDraft,
  isValidQuantityDraft,
  normalizeQuantityDraft,
  parseQuantityInput,
} from "../../utils/quantityInput.js";
import Card from "../../components/Card.jsx";
import Input from "../../components/Input.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import ItemImage from "../../components/ItemImage.jsx";
import {
  getTabsForEventType,
  itemMatchesTab,
} from "../admin/order-detail/helpers.js";

const toDateStr = (d) =>
  d instanceof Date ? d.toISOString().slice(0, 10) : (d || "").toString().slice(0, 10);

const OrderEdit = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [reservations, setReservations] = useState({});
  const [activeTabIndex, setActiveTabIndex] = useState(null);
  const [expandedTabIndices, setExpandedTabIndices] = useState([]);
  const desktopItemsScrollRef = useRef(null);
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    eventDate: "",
    city: "",
    eventType: "",
    notes: "",
  });
  const [quantities, setQuantities] = useState({});
  const [pendingQuantities, setPendingQuantities] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const validatedOrder = await validateCustomerEditAccess(orderId, token);
        if (cancelled) return;
        setOrder(validatedOrder);
        const dateStr = toDateStr(validatedOrder.eventDate);
        const [itemsList, reserved] = await Promise.all([
          getItems(),
          getReservationsForDate(dateStr),
        ]);
        if (cancelled) return;
        setItems(itemsList);
        setReservations(reserved);
        setForm({
          customerName: validatedOrder.customerName || "",
          phone: validatedOrder.phone || "",
          eventDate: dateStr,
          city: validatedOrder.city || "",
          eventType: validatedOrder.eventType || "",
          notes: validatedOrder.notes || "",
        });
        const existingQuantities = Object.fromEntries(
          (validatedOrder.items || []).map((line) => [
            line.itemId,
            Number(line.quantity) || 0,
          ]),
        );
        setQuantities(existingQuantities);
        setPendingQuantities(existingQuantities);
      } catch (e) {
        if (!cancelled) setError(getHebrewError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, token]);

  const tabsForEventType = useMemo(
    () => getTabsForEventType(form.eventType),
    [form.eventType],
  );
  const currentTab = activeTabIndex != null ? tabsForEventType[activeTabIndex] : null;

  useEffect(() => {
    if (!tabsForEventType.length) return;
    if (activeTabIndex != null && activeTabIndex > tabsForEventType.length - 1) {
      setActiveTabIndex(null);
    }
  }, [tabsForEventType, activeTabIndex]);

  const itemsForEventType = useMemo(() => {
    if (!form.eventType) return [];
    return items.filter(
      (item) => item.category === form.eventType || item.category === "ניטרלי",
    );
  }, [items, form.eventType]);

  const getItemsForTab = (tab) => {
    if (!tab || !form.eventType) return [];
    return itemsForEventType.filter((item) =>
      itemMatchesTab(item, tab.id, form.eventType),
    );
  };

  const itemsInCurrentTab = useMemo(() => {
    if (!currentTab || !form.eventType) return [];
    return getItemsForTab(currentTab);
  }, [itemsForEventType, currentTab, form.eventType]);

  const resetItemsListScroll = () => {
    window.requestAnimationFrame(() => {
      desktopItemsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleTabClick = (idx) => {
    setActiveTabIndex(idx);
    resetItemsListScroll();
  };

  const handleMobileTabToggle = (idx) => {
    setActiveTabIndex(idx);
    setExpandedTabIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx].sort((a, b) => a - b),
    );
  };

  const renderItemCard = (item) => {
    const av = availability(item.id);
    const maxQty = av.available;
    const inCart = quantities[item.id] || 0;
    const inputValue = getQuantityDraft(pendingQuantities, item.id, inCart);
    const editValue = parseQuantityInput(inputValue, maxQty);
    return (
      <div
        key={item.id}
        className="flex flex-col gap-4 rounded-2xl border-2 border-teal-200 bg-white p-4 sm:flex-row sm:items-center"
      >
        <ItemImage
          src={item.imageUrl}
          alt={item.name}
          className="h-24 w-24 self-center rounded-xl border-2 border-teal-100 object-cover sm:self-auto"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-gray-900">{item.name}</p>
          {item.notes?.trim() && (
            <p className="mt-1 text-sm font-medium text-gray-600">{item.notes.trim()}</p>
          )}
          <p className={`mt-1 text-sm font-bold ${isItemUnavailable(av.available) ? "text-gray-600" : "text-teal-700"}`}>
            {formatAvailabilityText(av.available, av.max)}
          </p>
          {inCart > 0 && (
            <p className="mt-0.5 text-sm font-semibold text-teal-800">בסל: {inCart}</p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <div className="mx-auto inline-flex w-auto items-center overflow-hidden rounded-xl border-2 border-teal-300 bg-teal-50/50">
            <button
              type="button"
              onClick={() => setEditQty(item.id, -1, maxQty)}
              disabled={editValue <= 0}
              className="flex h-11 w-11 items-center justify-center bg-teal-200 text-teal-800 disabled:opacity-50"
              aria-label={`הפחת כמות ${item.name}`}
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
              onBlur={() => handleQuantityInputBlur(item.id, maxQty)}
              placeholder="0"
              className="min-h-11 w-16 border-0 bg-transparent py-2 text-center text-base font-semibold tabular-nums text-gray-900 focus:outline-none"
              aria-label={`כמות ${item.name}`}
            />
            <button
              type="button"
              onClick={() => setEditQty(item.id, 1, maxQty)}
              disabled={editValue >= maxQty}
              className="flex h-11 w-11 items-center justify-center bg-teal-200 text-teal-800 disabled:opacity-50"
              aria-label={`הוסף כמות ${item.name}`}
            >
              +
            </button>
          </div>
          <Button
            type="button"
            onClick={() => handleApplyQty(item.id, maxQty)}
            disabled={maxQty <= 0 || editValue <= 0}
            className="w-full"
          >
            {inCart > 0 ? "עדכן" : "הוסף לסל"}
          </Button>
        </div>
      </div>
    );
  };

  const availability = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    const max = item ? Number(item.maxQuantity) || 0 : 0;
    const reserved = Number(reservations[itemId]) || 0;
    const currentOrderQty =
      (order?.items || []).find((line) => line.itemId === itemId)?.quantity || 0;
    return { max, available: Math.max(0, max - reserved + currentOrderQty) };
  };

  const cartSummary = useMemo(
    () =>
      itemsForEventType
        .filter((item) => (quantities[item.id] || 0) > 0)
        .map((item) => ({ item, qty: quantities[item.id] || 0 })),
    [itemsForEventType, quantities],
  );

  const setPendingQuantity = (itemId, qty) => {
    setPendingQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleQuantityInputChange = (itemId, value) => {
    if (!isValidQuantityDraft(value)) return;
    setPendingQuantity(itemId, value);
  };

  const handleQuantityInputBlur = (itemId, maxQty) => {
    setPendingQuantities((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, itemId)) return prev;
      return { ...prev, [itemId]: normalizeQuantityDraft(prev[itemId], maxQty) };
    });
  };

  const setEditQty = (itemId, delta, maxQty) => {
    const inCart = quantities[itemId] || 0;
    const current = parseQuantityInput(getQuantityDraft(pendingQuantities, itemId, inCart), maxQty);
    const next = Math.max(0, Math.min(maxQty, current + delta));
    setPendingQuantity(itemId, next === 0 ? '' : String(next));
  };

  const handleApplyQty = (itemId, maxQty) => {
    const inCart = quantities[itemId] || 0;
    const qty = parseQuantityInput(getQuantityDraft(pendingQuantities, itemId, inCart), maxQty);
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
    setPendingQuantities((prev) => ({ ...prev, [itemId]: qty === 0 ? '' : String(qty) }));
  };

  const handleChange = (field, value) => {
    const nextValue = field === "phone" ? formatIsraeliPhone(value) : value;
    setForm((prev) => ({ ...prev, [field]: nextValue }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formErrors = validateOrderForm(form);
    const orderItems = itemsForEventType
      .map((item) => ({
        itemId: item.id,
        itemName: item.name,
        quantity: Math.min(quantities[item.id] || 0, availability(item.id).available),
      }))
      .filter((line) => line.quantity > 0);
    if (!orderItems.length) formErrors.items = "נא לבחור לפחות פריט אחד";
    setErrors(formErrors);
    if (Object.keys(formErrors).length) return;
    setSaving(true);
    try {
      await updateOrderByCustomerLink(orderId, token, {
        ...form,
        items: orderItems,
      });
      toast.success(
        'השינויים נשמרו בהצלחה. צוות הגמ"ח ייצור איתך קשר לאחר בדיקת ההזמנה.',
      );
      navigate(`/order-confirmation/${orderId}`);
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <p className="rounded-xl border-2 border-red-200 bg-red-50 p-4 font-medium text-red-700">
          {error || "קישור העריכה לא תקין"}
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <Card className="bg-white shadow-lg">
        <h1 className="mb-2 text-2xl font-bold text-teal-900">עריכת הזמנה</h1>
        <p className="text-sm text-slate-700">
          עדכנו את הפרטים והפריטים ולחצו על שמירת שינויים.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Input
            label="שם מלא"
            id="customerName"
            value={form.customerName}
            onChange={(e) => handleChange("customerName", e.target.value)}
            error={errors.customerName}
            required
          />
          <Input
            label="מספר טלפון"
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            error={errors.phone}
            required
          />
          <Input
            label="תאריך אירוע"
            id="eventDate"
            type="date"
            value={form.eventDate}
            onChange={(e) => handleChange("eventDate", e.target.value)}
            error={errors.eventDate}
            required
          />
          <Input
            label="עיר מגורים"
            id="city"
            value={form.city}
            onChange={(e) => handleChange("city", e.target.value)}
            error={errors.city}
            required
          />
          <div className="md:col-span-2">
            <label className="mb-3 block text-sm font-semibold text-gray-800">
              האירוע בשרי או חלבי?
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              {["בשרי", "חלבי"].map((type) => (
                <label
                  key={type}
                  className={`flex w-full cursor-pointer items-center justify-center rounded-xl border-2 px-6 py-3 font-bold sm:w-auto ${
                    form.eventType === type
                      ? "border-teal-500 bg-teal-500 text-white"
                      : "border-teal-200 bg-teal-50 text-teal-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="eventType"
                    value={type}
                    checked={form.eventType === type}
                    onChange={() => handleChange("eventType", type)}
                    className="sr-only"
                  />
                  {type}
                </label>
              ))}
            </div>
            {errors.eventType && (
              <p className="mt-1.5 text-sm font-medium text-red-600">{errors.eventType}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="bg-white shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-teal-900">בחירת פריטים</h2>

        {/* Mobile — vertical accordion categories */}
        <div className="mb-6 space-y-2 md:hidden">
          {tabsForEventType.map((tab, idx) => {
            const isExpanded = expandedTabIndices.includes(idx);
            const tabItems = getItemsForTab(tab);
            return (
              <div
                key={tab.id}
                className="overflow-hidden rounded-2xl border-2 border-teal-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => handleMobileTabToggle(idx)}
                  className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-right text-sm font-semibold transition-all ${
                    isExpanded
                      ? "border-b border-teal-400 bg-teal-500 text-white"
                      : "bg-teal-50 text-teal-900 hover:bg-teal-100"
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={`edit-mobile-tabpanel-${tab.id}`}
                  aria-label={tab.label}
                >
                  <span className="flex-1 leading-snug">{tab.label}</span>
                  <svg
                    className={`h-5 w-5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div
                    id={`edit-mobile-tabpanel-${tab.id}`}
                    role="region"
                    aria-label={tab.label}
                    className="space-y-4 bg-teal-50/30 p-3"
                  >
                    {tabItems.length === 0 ? (
                      <p className="text-sm text-gray-600">אין פריטים בקטגוריה זו</p>
                    ) : (
                      tabItems.map((item) => renderItemCard(item))
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {errors.items && <p className="text-sm font-medium text-red-600">{errors.items}</p>}
        </div>

        {/* Desktop — category tabs */}
        <div
          className="-mx-4 mb-6 hidden gap-2 border-b border-teal-200 px-4 pb-4 md:flex md:flex-wrap"
          role="tablist"
          aria-label="קטגוריות פריטים"
        >
          {tabsForEventType.map((tab, idx) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(idx)}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                activeTabIndex === idx
                  ? "border-teal-500 bg-teal-500 text-white shadow-md"
                  : "border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-300 hover:bg-teal-100"
              }`}
              aria-label={tab.label}
              aria-selected={activeTabIndex === idx}
              role="tab"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Desktop — items (only after category selected) */}
        {activeTabIndex != null && (
          <div className="hidden md:block" role="tabpanel" aria-label={currentTab?.label}>
            <div
              ref={desktopItemsScrollRef}
              className="max-h-[60vh] min-h-[20rem] space-y-4 overflow-y-auto overscroll-contain pr-1"
            >
              {itemsInCurrentTab.length === 0 ? (
                <p className="text-gray-600">אין פריטים בקטגוריה זו</p>
              ) : (
                itemsInCurrentTab.map((item) => renderItemCard(item))
              )}
              {errors.items && <p className="text-sm font-medium text-red-600">{errors.items}</p>}
            </div>
          </div>
        )}
      </Card>

      <Card className="bg-white shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-teal-900">סיכום פריטים</h2>
        <ul className="space-y-2">
          {cartSummary.map(({ item, qty }) => (
            <li key={item.id} className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
              {item.name} - {qty}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate("/")}>
            ביטול
          </Button>
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "שומר..." : "שמירת שינויים"}
          </Button>
        </div>
      </Card>
    </form>
  );
};

export default OrderEdit;
