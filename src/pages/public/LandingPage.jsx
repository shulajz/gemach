import { useState, useMemo, useDeferredValue, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IMPORTANT_INFO,
  EVENT_TYPES,
  ORDER_CATEGORIES,
  LABELS,
  getEventTypeLabel,
  EVENT_TYPE_NO_UTENSILS,
} from "../../constants/he.js";
import {
  getItemsForEventType,
  filterQuantitiesForEventType,
  isNoUtensilsEventType,
} from "../admin/order-detail/helpers.js";
import { useAvailability } from "../../hooks/useAvailability.js";
import { useImportantInfo } from "../../hooks/useImportantInfo.js";
import { createOrder } from "../../firebase/orders.js";
import { validateOrderForm } from "../../utils/validation.js";
import { getHebrewError } from "../../utils/errorsHe.js";
import { formatIsraeliPhone } from "../../utils/validation.js";
import {
  formatAvailabilityText,
  isItemUnavailable,
} from "../../utils/formatAvailability.js";
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

const toDateStr = (d) =>
  d instanceof Date
    ? d.toISOString().slice(0, 10)
    : (d || "").toString().slice(0, 10);

/** Tabs to show for the selected event type (one plate category + all neutral). */
const getTabsForEventType = (eventType) =>
  ORDER_CATEGORIES.filter(
    (c) => c.eventType === eventType || c.eventType === null,
  );

/** Whether an item belongs to a given tab (by orderCategoryId or category fallback for plates). */
const itemMatchesTab = (item, tabId, eventType) => {
  if (tabId === "plates-dairy") {
    return (
      item.category === "חלבי" &&
      (!item.orderCategoryId || item.orderCategoryId === "plates-dairy")
    );
  }
  if (tabId === "plates-meat") {
    return (
      item.category === "בשרי" &&
      (!item.orderCategoryId || item.orderCategoryId === "plates-meat")
    );
  }
  if (item.orderCategoryId) return item.orderCategoryId === tabId;
  return item.category === "ניטרלי" && tabId === "tablecloths";
};

const matchesItemSearch = (item, query) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = (item.name || "").toLowerCase();
  const notes = (item.notes || "").toLowerCase();
  return name.includes(q) || notes.includes(q);
};

const getItemCategoryLabel = (item) => {
  if (item.orderCategoryId) {
    return (
      ORDER_CATEGORIES.find((c) => c.id === item.orderCategoryId)?.label || ""
    );
  }
  if (item.category === "חלבי") {
    return ORDER_CATEGORIES.find((c) => c.id === "plates-dairy")?.label || "";
  }
  if (item.category === "בשרי") {
    return ORDER_CATEGORIES.find((c) => c.id === "plates-meat")?.label || "";
  }
  return (
    ORDER_CATEGORIES.find((c) => c.id === "tablecloths")?.label ||
    item.category ||
    ""
  );
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("details");
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    eventDate: "",
    city: "",
    eventType: "",
  });
  const [quantities, setQuantities] = useState({});
  const [pendingQuantities, setPendingQuantities] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [expandedTabIndices, setExpandedTabIndices] = useState([]);
  const [itemSearch, setItemSearch] = useState("");
  const deferredItemSearch = useDeferredValue(itemSearch);
  const desktopItemsScrollRef = useRef(null);
  const { importantInfo } = useImportantInfo();

  const eventDateStr = form.eventDate ? toDateStr(form.eventDate) : null;
  const {
    availabilityMap,
    items,
    loading: availabilityLoading,
    error: availabilityError,
  } = useAvailability(eventDateStr);

  const tabsForEventType = useMemo(
    () => getTabsForEventType(form.eventType),
    [form.eventType],
  );

  const itemsForEventType = useMemo(
    () => getItemsForEventType(items, form.eventType),
    [items, form.eventType],
  );

  const currentTab =
    activeTabIndex != null ? tabsForEventType[activeTabIndex] : null;
  const itemsInCurrentTab = useMemo(() => {
    if (!currentTab || !form.eventType) return [];
    return itemsForEventType.filter((item) =>
      itemMatchesTab(item, currentTab.id, form.eventType),
    );
  }, [itemsForEventType, currentTab, form.eventType]);

  const isSearching = deferredItemSearch.trim().length > 0;

  const displayedItems = useMemo(() => {
    if (isSearching) {
      return itemsForEventType.filter((item) =>
        matchesItemSearch(item, deferredItemSearch),
      );
    }
    return itemsInCurrentTab;
  }, [isSearching, deferredItemSearch, itemsForEventType, itemsInCurrentTab]);

  const hasMeatOrDairyInCart = useMemo(
    () =>
      items.some(
        (item) =>
          (item.category === "בשרי" || item.category === "חלבי") &&
          (quantities[item.id] || 0) > 0,
      ),
    [items, quantities],
  );

  const cartSummary = useMemo(() => {
    const entries = itemsForEventType
      .filter((item) => (quantities[item.id] || 0) > 0)
      .map((item) => ({ item, qty: quantities[item.id] || 0 }));
    return entries;
  }, [itemsForEventType, quantities]);

  const cartCount = cartSummary.reduce((n, e) => n + e.qty, 0);
  const importantInfoTitle = importantInfo?.title || IMPORTANT_INFO.title;
  const importantInfoParagraphs = importantInfo?.paragraphs?.length
    ? importantInfo.paragraphs
    : IMPORTANT_INFO.sections.flatMap((section) => section.paragraphs || []);

  const handleChange = (field, value) => {
    if (field === "eventType" && value !== form.eventType) {
      const nextQuantities = filterQuantitiesForEventType(
        quantities,
        items,
        value,
      );
      const nextPending = filterQuantitiesForEventType(
        pendingQuantities,
        items,
        value,
      );
      setQuantities(nextQuantities);
      setPendingQuantities(
        Object.fromEntries(
          Object.entries(nextPending).map(([id, qty]) => [
            id,
            qty === 0 ? "" : String(qty),
          ]),
        ),
      );
    }

    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
    if (field === "phone")
      setForm((prev) => ({ ...prev, phone: formatIsraeliPhone(value) }));
  };

  const setPendingQuantity = (itemId, qty) => {
    setPendingQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  const handleQuantityInputChange = (itemId, value) => {
    if (!isValidQuantityDraft(value)) return;
    setPendingQuantity(itemId, value);
  };

  const commitQuantityToCart = (itemId, rawQty, maxQty) => {
    const normalized =
      rawQty === "" || rawQty === undefined || rawQty === null
        ? ""
        : normalizeQuantityDraft(String(rawQty), maxQty);
    const qty = parseQuantityInput(normalized, maxQty);

    setQuantities((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else next[itemId] = qty;
      return next;
    });
    setPendingQuantities((prev) => ({
      ...prev,
      [itemId]: qty === 0 ? "" : String(qty),
    }));
  };

  const mergePendingIntoQuantities = () => {
    const mergedQuantities = { ...quantities };
    const mergedPending = { ...pendingQuantities };

    itemsForEventType.forEach((item) => {
      const itemId = item.id;
      const maxQty = availabilityMap[itemId]?.available ?? 0;
      if (!Object.prototype.hasOwnProperty.call(pendingQuantities, itemId))
        return;

      const qty = parseQuantityInput(
        normalizeQuantityDraft(pendingQuantities[itemId], maxQty),
        maxQty,
      );
      if (qty > 0) mergedQuantities[itemId] = qty;
      else delete mergedQuantities[itemId];
      mergedPending[itemId] = qty === 0 ? "" : String(qty);
    });

    return { mergedQuantities, mergedPending };
  };

  const handleQuantityInputBlur = (itemId, maxQty) => {
    if (!Object.prototype.hasOwnProperty.call(pendingQuantities, itemId))
      return;
    commitQuantityToCart(itemId, pendingQuantities[itemId], maxQty);
  };

  const setEditQty = (itemId, delta, maxQty) => {
    const inCart = quantities[itemId] || 0;
    const current = parseQuantityInput(
      getQuantityDraft(pendingQuantities, itemId, inCart),
      maxQty,
    );
    const next = Math.max(0, Math.min(maxQty, current + delta));
    commitQuantityToCart(itemId, next === 0 ? "" : String(next), maxQty);
  };

  const getItemsForTab = (tab) => {
    if (!tab || !form.eventType) return [];
    return itemsForEventType.filter((item) =>
      itemMatchesTab(item, tab.id, form.eventType),
    );
  };

  const resetItemsListScroll = () => {
    window.requestAnimationFrame(() => {
      desktopItemsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const handleTabClick = (idx) => {
    setActiveTabIndex(idx);
    setItemSearch("");
    resetItemsListScroll();
  };

  const handleMobileTabToggle = (idx) => {
    setActiveTabIndex(idx);
    setItemSearch("");
    setExpandedTabIndices((prev) =>
      prev.includes(idx)
        ? prev.filter((i) => i !== idx)
        : [...prev, idx].sort((a, b) => a - b),
    );
  };

  const handleBackToDetails = () => {
    setStep("details");
    setItemSearch("");
    setActiveTabIndex(null);
    setExpandedTabIndices([]);
  };

  const handleGoToSummary = () => {
    const { mergedQuantities, mergedPending } = mergePendingIntoQuantities();
    const hasItems = itemsForEventType.some(
      (item) => (mergedQuantities[item.id] || 0) > 0,
    );

    if (!hasItems) {
      setErrors((prev) => ({ ...prev, items: "נא לבחור לפחות פריט אחד" }));
      return;
    }

    setQuantities(mergedQuantities);
    setPendingQuantities(mergedPending);
    setErrors((prev) => ({ ...prev, items: null }));
    setStep("summary");
  };

  const handleBackToCategories = () => setStep("categories");

  const handleNextFromDetails = () => {
    const formErrors = validateOrderForm(form);
    setErrors(formErrors);
    if (Object.keys(formErrors).length) return;
    setStep("categories");
    setActiveTabIndex(null);
    setExpandedTabIndices([]);
    setItemSearch("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { mergedQuantities, mergedPending } = mergePendingIntoQuantities();
    const formErrors = validateOrderForm(form);
    const orderItems = itemsForEventType
      .map((item) => ({
        itemId: item.id,
        itemName: item.name,
        quantity: Math.min(
          mergedQuantities[item.id] || 0,
          availabilityMap[item.id]?.available ?? 0,
        ),
      }))
      .filter((i) => i.quantity > 0);
    if (orderItems.length === 0) formErrors.items = "נא לבחור לפחות פריט אחד";
    setErrors(formErrors);
    if (Object.keys(formErrors).length) return;

    setQuantities(mergedQuantities);
    setPendingQuantities(mergedPending);
    setSubmitting(true);
    try {
      const order = await createOrder({
        ...form,
        eventDate: form.eventDate || new Date(),
        items: orderItems,
      });
      navigate(`/order-confirmation/${order.id}`);
    } catch (err) {
      toast.error(getHebrewError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderItemCard = (item, { showCategory = false } = {}) => {
    const av = availabilityMap[item.id] || { available: 0, maxQuantity: 0 };
    const maxQty = av.available;
    const inCart = quantities[item.id] || 0;
    const inputValue = getQuantityDraft(pendingQuantities, item.id, inCart);
    const editValue = parseQuantityInput(inputValue, maxQty);

    return (
      <div
        key={item.id}
        className={`flex flex-col gap-4 rounded-2xl border-2 bg-white p-4 shadow-md transition-shadow sm:flex-row sm:items-center sm:gap-5 sm:p-5 ${
          inCart > 0
            ? "border-teal-400 bg-teal-50/30"
            : "border-teal-200 hover:border-teal-300 hover:shadow-lg"
        }`}
      >
        <ItemImage
          src={item.imageUrl}
          alt={item.name}
          className="h-24 w-24 self-center rounded-xl border-2 border-teal-100 object-cover shadow sm:h-[9rem] sm:w-[9rem] sm:self-auto"
        />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-gray-900">{item.name}</p>
          {showCategory && (
            <p className="mt-0.5 text-xs font-semibold text-teal-600">
              {getItemCategoryLabel(item)}
            </p>
          )}
          {item.notes?.trim() && (
            <p className="mt-1 text-sm font-medium text-gray-600">
              {item.notes.trim()}
            </p>
          )}
          <p
            className={`mt-1 text-sm font-bold ${isItemUnavailable(av.available) ? "text-gray-600" : "text-teal-700"}`}
          >
            {formatAvailabilityText(av.available, av.maxQuantity)}
          </p>
          {inCart > 0 && (
            <p
              className="mt-0.5 text-sm font-semibold text-teal-800"
              role="status"
            >
              {LABELS.inCart}: {inCart} ✓
            </p>
          )}
        </div>
        <div className="flex w-full justify-center sm:w-auto sm:justify-end">
          <div className="inline-flex w-auto items-center gap-0 overflow-hidden rounded-xl border-2 border-teal-300 bg-teal-50/50">
            <button
              type="button"
              onClick={() => setEditQty(item.id, -1, maxQty)}
              disabled={editValue <= 0 && inCart <= 0}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-teal-200 text-teal-800 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`הפחת כמות ${item.name}`}
            >
              <span className="text-xl font-bold">−</span>
            </button>
            <input
              id={`qty-${item.id}`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={(e) =>
                handleQuantityInputChange(item.id, e.target.value)
              }
              onBlur={() => handleQuantityInputBlur(item.id, maxQty)}
              placeholder="0"
              disabled={maxQty <= 0}
              className="min-h-11 w-16 border-0 bg-transparent py-2 text-center text-base font-semibold tabular-nums text-gray-900 focus:outline-none disabled:opacity-50"
              aria-label={`כמות ${item.name}`}
            />
            <button
              type="button"
              onClick={() => setEditQty(item.id, 1, maxQty)}
              disabled={maxQty <= 0 || editValue >= maxQty}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center bg-teal-200 text-teal-800 transition-colors hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`הוסף כמות ${item.name}`}
            >
              <span className="text-xl font-bold">+</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-10">
      <Card className="border-r-4 border-r-teal-600 bg-white shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-teal-900">
          {importantInfoTitle}
        </h2>
        <div className="space-y-3 text-sm text-gray-800">
          {importantInfoParagraphs.map((paragraph, index) => (
            <p key={`${paragraph}-${index}`} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        {step === "details" && (
          <Card hover className="bg-white shadow-lg">
            <div className="relative h-44 overflow-hidden rounded-xl border border-teal-100 shadow-sm">
              <img
                src="/order-form-atmosphere.png"
                alt="עיצוב שולחן אירוע"
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                aria-hidden="true"
              />
            </div>
            <div className="relative">
              <h2 className="mb-6 text-2xl font-bold text-teal-900">
                טופס הזמנה
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                <Input
                  label={LABELS.fullName}
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  error={errors.customerName}
                  required
                />
                <Input
                  label={LABELS.phone}
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  error={errors.phone}
                  required
                  placeholder="052-1234567"
                />
                <Input
                  label={LABELS.eventDate}
                  id="eventDate"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                  value={form.eventDate}
                  onChange={(e) => handleChange("eventDate", e.target.value)}
                  error={errors.eventDate}
                  required
                />
                <Input
                  label={LABELS.city}
                  id="city"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  error={errors.city}
                  required
                />
                <div className="md:col-span-2">
                  <span className="mb-3 block text-sm font-semibold text-gray-800">
                    {LABELS.eventType}
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                    {EVENT_TYPES.map((type) => {
                      const isChalav = type === "חלבי";
                      const isNoUtensils = type === EVENT_TYPE_NO_UTENSILS;
                      const isSelected = form.eventType === type;
                      const isMeatOrDairyType =
                        type === "בשרי" || type === "חלבי";
                      const isCurrentMeatOrDairy =
                        form.eventType === "בשרי" || form.eventType === "חלבי";
                      const isDisabled =
                        hasMeatOrDairyInCart &&
                        isMeatOrDairyType &&
                        isCurrentMeatOrDairy &&
                        form.eventType !== type;
                      return (
                        <label
                          key={type}
                          className={`flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-center text-sm font-bold leading-snug transition-all sm:w-auto sm:px-6 sm:text-base ${
                            isDisabled
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                              : isSelected
                                ? isNoUtensils
                                  ? "cursor-pointer border-gray-500 bg-gray-500 text-white shadow-md"
                                  : isChalav
                                    ? "cursor-pointer border-blue-500 bg-blue-500 text-white shadow-md"
                                    : "cursor-pointer border-red-500 bg-red-500 text-white shadow-md"
                                : isNoUtensils
                                  ? "cursor-pointer border-gray-300 bg-gray-100 text-gray-800 hover:border-gray-400 hover:bg-gray-200"
                                  : isChalav
                                    ? "cursor-pointer border-blue-300 bg-blue-100 text-blue-800 hover:border-blue-400 hover:bg-blue-200"
                                    : "cursor-pointer border-red-300 bg-red-100 text-red-800 hover:border-red-400 hover:bg-red-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name="eventType"
                            value={type}
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() =>
                              !isDisabled && handleChange("eventType", type)
                            }
                            className="sr-only"
                            aria-label={getEventTypeLabel(type)}
                            aria-disabled={isDisabled}
                          />
                          <span className="break-words">{getEventTypeLabel(type)}</span>
                        </label>
                      );
                    })}
                  </div>
                  {hasMeatOrDairyInCart &&
                    (form.eventType === "בשרי" ||
                      form.eventType === "חלבי") && (
                      <p
                        className="mt-1.5 text-sm font-medium text-amber-700"
                        role="status"
                      >
                        לא ניתן להחליף בין בשרי לחלבי לאחר הוספת כלים
                      </p>
                    )}
                  {isNoUtensilsEventType(form.eventType) && (
                    <p
                      className="mt-1.5 text-sm font-medium text-gray-600"
                      role="status"
                    >
                      ניתן לבחור פריטי עיצוב ואביזרים בלבד — ללא צלחות, סכו&quot;ם
                      וכוסות
                    </p>
                  )}
                  {errors.eventType && (
                    <p className="mt-1.5 text-sm font-medium text-red-600">
                      {errors.eventType}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  onClick={handleNextFromDetails}
                  className="w-full sm:w-auto"
                  ariaLabel={LABELS.nextCategory}
                >
                  {LABELS.nextCategory} ←
                </Button>
              </div>
            </div>
          </Card>
        )}

        {step === "categories" && form.eventType && form.eventDate && (
          <>
            {/* Desktop sticky cart */}
            <div className="sticky top-4 z-30 hidden rounded-2xl border-2 border-teal-300 bg-white p-4 shadow-lg md:block">
              <button
                type="button"
                onClick={() => setCartOpen((o) => !o)}
                className="flex min-h-11 w-full items-center justify-between gap-2 text-right"
                aria-expanded={cartOpen}
                aria-label={LABELS.myCart}
              >
                <span className="font-bold text-teal-800">
                  {LABELS.myCart} {cartCount > 0 ? `(${cartCount} פריטים)` : ""}
                </span>
                <svg
                  className={`h-5 w-5 flex-shrink-0 transition-transform ${cartOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {cartCount > 0 && (
                <div className="mt-3 border-t border-teal-100 pt-3">
                  <Button
                    type="button"
                    className="w-full shadow-md"
                    ariaLabel={LABELS.toSummary}
                    onClick={handleGoToSummary}
                  >
                    {LABELS.toSummary}
                  </Button>
                  {errors.items && (
                    <p className="mt-2 text-center text-sm font-medium text-red-500">
                      {errors.items}
                    </p>
                  )}
                </div>
              )}
              {cartOpen && (
                <div
                  className={`${cartCount > 0 ? "mt-3" : "mt-3 border-t border-teal-100 pt-3"} max-h-72 overflow-y-auto overscroll-contain`}
                >
                  {cartSummary.length === 0 ? (
                    <div className="rounded-xl bg-gray-50 py-8 text-center">
                      <p className="text-sm text-gray-500">
                        עדיין לא נוספו פריטים
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        בחרו קטגוריה והזינו כמות לכל פריט
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2" role="list">
                      {cartSummary.map(({ item, qty }) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-teal-100 bg-white p-3 shadow-sm"
                        >
                          <ItemImage
                            src={item.imageUrl}
                            alt=""
                            className="h-14 w-14 flex-shrink-0 rounded-lg border border-teal-100 object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-teal-600">כמות: {qty}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Mobile bottom cart bar */}
            {cartOpen && cartSummary.length > 0 && (
              <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] z-40 max-h-[45vh] overflow-y-auto overscroll-contain border-t border-teal-200 bg-white p-3 shadow-lg md:hidden">
                <ul className="space-y-2" role="list">
                  {cartSummary.map(({ item, qty }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl border border-teal-100 bg-gray-50 p-3"
                    >
                      <ItemImage
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-teal-600">כמות: {qty}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="fixed inset-x-0 bottom-0 z-50 flex items-stretch gap-2 border-t-2 border-teal-300 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.12)] md:hidden">
              <button
                type="button"
                onClick={() => setCartOpen((o) => !o)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-900"
                aria-expanded={cartOpen}
                aria-label={LABELS.myCart}
              >
                {LABELS.myCart}
                {cartCount > 0 ? ` (${cartCount})` : ""}
              </button>
              {cartCount > 0 && (
                <Button
                  type="button"
                  className="min-h-11 flex-1 px-3 text-sm shadow-md"
                  ariaLabel={LABELS.toSummary}
                  onClick={handleGoToSummary}
                >
                  {LABELS.toSummary}
                </Button>
              )}
            </div>

            <Card hover className="bg-white pb-28 shadow-lg md:pb-8">
              <h2 className="mb-4 text-2xl font-bold text-teal-900">
                בחירת פריטים
              </h2>

              <div className="mb-4">
                <Input
                  label={LABELS.searchItems}
                  id="itemSearch"
                  value={itemSearch}
                  onChange={(e) => {
                    setItemSearch(e.target.value);
                    if (e.target.value.trim()) setExpandedTabIndices([]);
                  }}
                  placeholder={LABELS.searchItemsPlaceholder}
                  ariaLabel={LABELS.searchItems}
                />
              </div>

              {availabilityError && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 text-red-800">
                  <p className="font-medium">
                    שגיאה בטעינת מלאי. נא לרענן את הדף.
                  </p>
                  <p className="mt-2 text-sm">
                    {getHebrewError(availabilityError)}
                  </p>
                </div>
              )}
              {availabilityLoading && (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              )}
              {!availabilityLoading && !availabilityError && (
                <>
                  {/* Mobile — vertical accordion categories */}
                  <div className="mb-6 space-y-2 md:hidden">
                    {isSearching ? (
                      <div role="tabpanel" aria-label={LABELS.searchItems}>
                        <p className="mb-3 rounded-xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-sm font-medium text-teal-800">
                          חיפוש בכל הקטגוריות
                        </p>
                        <p
                          className="mb-3 min-h-5 break-words text-sm text-gray-600"
                          aria-live="polite"
                        >
                          {displayedItems.length > 0
                            ? `${displayedItems.length} תוצאות עבור "${deferredItemSearch.trim()}"`
                            : `לא נמצאו פריטים עבור "${deferredItemSearch.trim()}"`}
                        </p>
                        <div className="space-y-4">
                          {displayedItems.length === 0 ? (
                            <p className="text-gray-600">{`לא נמצאו פריטים עבור "${deferredItemSearch.trim()}"`}</p>
                          ) : (
                            displayedItems.map((item) =>
                              renderItemCard(item, { showCategory: true }),
                            )
                          )}
                          {errors.items && (
                            <p className="text-sm font-medium text-red-500">
                              {errors.items}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
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
                                aria-controls={`mobile-tabpanel-${tab.id}`}
                                aria-label={tab.label}
                              >
                                <span className="flex-1 leading-snug">
                                  {tab.label}
                                </span>
                                <svg
                                  className={`h-5 w-5 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden="true"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </button>
                              {isExpanded && (
                                <div
                                  id={`mobile-tabpanel-${tab.id}`}
                                  role="region"
                                  aria-label={tab.label}
                                  className="space-y-4 bg-teal-50/30 p-3"
                                >
                                  {tabItems.length === 0 ? (
                                    <p className="text-sm text-gray-600">
                                      אין פריטים בקטגוריה זו
                                    </p>
                                  ) : (
                                    tabItems.map((item) => renderItemCard(item))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {errors.items && (
                          <p className="text-sm font-medium text-red-500">
                            {errors.items}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Desktop — category tabs */}
                  <div
                    className={`-mx-4 mb-6 hidden gap-2 border-b border-teal-200 px-4 pb-4 md:flex md:flex-wrap ${isSearching ? "opacity-60" : ""}`}
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

                  {/* Desktop — items (only after category selected or search) */}
                  {(isSearching || activeTabIndex != null) && (
                    <div
                      className="hidden md:block"
                      role="tabpanel"
                      aria-label={
                        isSearching ? LABELS.searchItems : currentTab?.label
                      }
                    >
                      <p
                        className="mb-3 min-h-5 break-words text-sm text-gray-600"
                        aria-live="polite"
                      >
                        {isSearching &&
                          (displayedItems.length > 0
                            ? `${displayedItems.length} תוצאות עבור "${deferredItemSearch.trim()}"`
                            : `לא נמצאו פריטים עבור "${deferredItemSearch.trim()}"`)}
                      </p>
                      <div
                        ref={desktopItemsScrollRef}
                        className="max-h-[60vh] min-h-[20rem] space-y-4 overflow-y-auto overscroll-contain pr-1"
                      >
                        {displayedItems.length === 0 ? (
                          <p className="text-gray-600">
                            {isSearching
                              ? `לא נמצאו פריטים עבור "${deferredItemSearch.trim()}"`
                              : "אין פריטים בקטגוריה זו"}
                          </p>
                        ) : (
                          displayedItems.map((item) =>
                            renderItemCard(item, { showCategory: isSearching }),
                          )
                        )}
                        {errors.items && (
                          <p className="text-sm font-medium text-red-500">
                            {errors.items}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={handleBackToDetails}
                  ariaLabel={LABELS.backToDetails}
                >
                  → {LABELS.backToDetails}
                </Button>
                <Button
                  type="button"
                  disabled={submitting}
                  className="hidden w-full shadow-lg sm:flex sm:w-auto sm:min-w-[180px]"
                  ariaLabel={LABELS.toSummary}
                  onClick={handleGoToSummary}
                >
                  {LABELS.toSummary}
                </Button>
              </div>
            </Card>
          </>
        )}

        {step === "summary" && (
          <Card className="bg-white shadow-lg">
            <h2 className="mb-6 text-2xl font-bold text-teal-900">
              {LABELS.orderSummary}
            </h2>
            <div className="space-y-6">
              <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-4">
                <h3 className="mb-3 font-semibold text-teal-900">
                  פרטי מזמין ואירוע
                </h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-gray-600">
                      {LABELS.fullName}
                    </dt>
                    <dd className="text-gray-900">{form.customerName}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">
                      {LABELS.phone}
                    </dt>
                    <dd className="text-gray-900">{form.phone}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">
                      {LABELS.eventDate}
                    </dt>
                    <dd className="text-gray-900">
                      {form.eventDate
                        ? form.eventDate.split("-").reverse().join("/")
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">{LABELS.city}</dt>
                    <dd className="text-gray-900">{form.city}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600">
                      {LABELS.eventType}
                    </dt>
                    <dd className="text-gray-900">
                      {getEventTypeLabel(form.eventType)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-teal-200 bg-white p-4">
                <h3 className="mb-3 font-semibold text-teal-900">
                  פריטים בהזמנה
                </h3>
                <ul className="space-y-2" role="list">
                  {cartSummary.map(({ item, qty }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                    >
                      <ItemImage
                        src={item.imageUrl}
                        alt=""
                        className="h-12 w-12 flex-shrink-0 rounded-lg object-cover border border-teal-100"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-teal-600">כמות: {qty}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleBackToCategories}
                ariaLabel={LABELS.backToCategories}
              >
                → {LABELS.backToCategories}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full shadow-lg sm:w-auto sm:min-w-[180px]"
                ariaLabel={LABELS.sendOrder}
              >
                {submitting ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  LABELS.sendOrder
                )}
              </Button>
            </div>
          </Card>
        )}

        {step === "categories" && (!form.eventType || !form.eventDate) && (
          <p className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 font-medium text-amber-900">
            בחרו סוג אירוע ותאריך כדי לראות קטגוריות.
          </p>
        )}
      </form>
    </div>
  );
};

export default LandingPage;
