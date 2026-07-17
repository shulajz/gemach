import Button from '../../../components/Button.jsx';
import ItemImage from '../../../components/ItemImage.jsx';
import { formatAvailabilityText } from '../../../utils/formatAvailability.js';
import {
  getQuantityDraft,
  isValidQuantityDraft,
  normalizeQuantityDraft,
  parseQuantityInput,
} from '../../../utils/quantityInput.js';

const OrderItemsEditCollapse = ({
  open,
  onToggle,
  form,
  items,
  availability,
  removeItemFromForm,
  tabsForEventType,
  activeTabIndex,
  setActiveTabIndex,
  itemsInCurrentTab,
  addOrUpdateItemInForm,
  setForm,
}) => {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 flex w-full items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-right font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
        aria-expanded={open}
        aria-label="פתיחה וסגירה של ניהול פריטים בהזמנה"
      >
        <span>ניהול פריטים בהזמנה</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700 shadow-sm">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="mt-3 rounded-xl border-2 border-slate-300 bg-slate-50 p-3 sm:p-4">
          <h2 className="mb-3 font-semibold text-slate-900">פריטים בהזמנה</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-700">
            אפשר לעדכן כמות ישירות כאן, להסיר פריט, או להוסיף פריטים חדשים מהרשימה למטה.
          </p>
          <ul className="space-y-3" role="list">
            {form.items.map((line, index) => {
              const it = items.find((i) => i.id === line.itemId);
              const av = availability(line.itemId);
              const qty = Number(line.quantity) || 0;
              const handleSetQty = (nextQty) => {
                const clamped = Math.max(1, Math.min(av.available, Number(nextQty) || 1));
                addOrUpdateItemInForm(line.itemId, line.itemName, clamped);
                setForm((f) => ({
                  ...f,
                  addItemQuantities: {
                    ...(f.addItemQuantities || {}),
                    [line.itemId]: String(clamped),
                  },
                }));
              };
              return (
                <li
                  key={`${line.itemId}-${index}`}
                  className="flex flex-col gap-3 rounded-xl border-2 border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:gap-4 sm:p-4"
                >
                  <ItemImage
                    src={it?.imageUrl}
                    alt={line.itemName}
                    className="mx-auto h-16 w-16 flex-shrink-0 rounded-lg border border-slate-200 object-cover sm:mx-0"
                  />
                  <div className="min-w-0 flex-1 text-center sm:text-right">
                    <p className="break-words font-semibold text-slate-900">{line.itemName}</p>
                    <p className="text-sm text-slate-700">
                      {av.available <= 0
                        ? formatAvailabilityText(0, av.max)
                        : `עד ${av.available} פנויים לתאריך זה`}
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <div className="mx-auto inline-flex w-auto items-center overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50 sm:mx-0">
                      <button
                        type="button"
                        onClick={() => handleSetQty(qty - 1)}
                        disabled={qty <= 1}
                        className="flex h-11 w-11 items-center justify-center bg-slate-200 text-slate-800 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`הפחת כמות ${line.itemName}`}
                      >
                        <span className="text-lg font-bold">−</span>
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(qty)}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!isValidQuantityDraft(val)) return;
                          if (val === '') return;
                          handleSetQty(val);
                        }}
                        className="min-h-11 w-16 border-0 bg-transparent py-1.5 text-center text-base font-semibold tabular-nums text-slate-900 focus:outline-none"
                        aria-label={`כמות ${line.itemName}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleSetQty(qty + 1)}
                        disabled={qty >= av.available}
                        className="flex h-11 w-11 items-center justify-center bg-slate-200 text-slate-800 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`הוסף כמות ${line.itemName}`}
                      >
                        <span className="text-lg font-bold">+</span>
                      </button>
                    </div>
                    <Button
                      variant="danger"
                      className="w-full text-sm sm:w-auto"
                      onClick={() => removeItemFromForm(index)}
                      ariaLabel={`הסר ${line.itemName}`}
                    >
                      הסר
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-6">
            <h3 className="mb-3 font-semibold text-slate-900">בחירת כמות ופריטים</h3>
            <p className="mb-4 text-sm text-slate-700">קבעו כמות לכל פריט ולחצו הוסף (פריט חדש) או עדכן (פריט שכבר בהזמנה). הכמויות מחושבות לפי תאריך האירוע.</p>
            <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:mx-0 sm:flex-wrap sm:overflow-visible sm:snap-none sm:pb-0" role="tablist" aria-label="קטגוריות פריטים">
              {tabsForEventType.map((tab, idx) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabIndex(idx)}
                  className={`shrink-0 snap-start whitespace-nowrap rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-colors sm:w-auto ${
                    activeTabIndex === idx
                      ? 'border-teal-600 bg-teal-600 text-white shadow'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                  role="tab"
                  aria-selected={activeTabIndex === idx}
                  aria-label={tab.label}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="tabpanel" aria-label={tabsForEventType[activeTabIndex]?.label}>
              {itemsInCurrentTab.map((it) => {
                const av = availability(it.id);
                const line = form.items.find((i) => i.itemId === it.id);
                const isInOrder = !!line;
                const fallbackQty = isInOrder ? line.quantity : 0;
                const drafts = form.addItemQuantities || {};
                const inputValue = getQuantityDraft(drafts, it.id, fallbackQty);
                const editValue = parseQuantityInput(inputValue, av.available);
                const applyQty = Math.max(1, editValue);
                return (
                  <div
                    key={it.id}
                    className={`flex flex-col gap-3 rounded-2xl border-2 p-4 shadow-md transition-shadow hover:shadow-lg ${
                      isInOrder ? 'border-teal-500 bg-teal-50/20' : 'border-slate-300 bg-white hover:border-slate-400'
                    }`}
                  >
                    <ItemImage
                      src={it.imageUrl}
                      alt={it.name}
                      className="mx-auto h-20 w-20 flex-shrink-0 rounded-xl border-2 border-slate-200 object-cover shadow sm:mx-0"
                    />
                    <div className="min-w-0 flex-1 text-center sm:text-right">
                      <p className="break-words font-bold text-slate-900">{it.name}</p>
                      {it.notes?.trim() && (
                        <p className="mt-0.5 text-sm font-medium text-slate-600">{it.notes.trim()}</p>
                      )}
                      <p className="text-sm font-medium text-slate-700">
                        {formatAvailabilityText(av.available, av.max)}
                        {isInOrder && <span className="mr-1 font-semibold text-teal-700"> · בהזמנה: {line.quantity}</span>}
                      </p>
                    </div>
                    <div className="mt-1 flex w-full flex-col gap-2">
                      <div className="mx-auto inline-flex w-auto items-center overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-50">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => {
                              const current = parseQuantityInput(
                                getQuantityDraft(f.addItemQuantities || {}, it.id, fallbackQty),
                                av.available,
                              );
                              const next = Math.max(1, Math.min(av.available, current - 1));
                              return {
                                ...f,
                                addItemQuantities: {
                                  ...(f.addItemQuantities || {}),
                                  [it.id]: String(next),
                                },
                              };
                            })
                          }
                          disabled={editValue <= 1}
                          className="flex h-11 w-11 items-center justify-center bg-slate-200 text-slate-800 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`הפחת כמות ${it.name}`}
                        >
                          <span className="text-lg font-bold">−</span>
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={inputValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!isValidQuantityDraft(val)) return;
                            setForm((f) => ({
                              ...f,
                              addItemQuantities: { ...(f.addItemQuantities || {}), [it.id]: val },
                            }));
                          }}
                          onBlur={() =>
                            setForm((f) => {
                              if (!Object.prototype.hasOwnProperty.call(f.addItemQuantities || {}, it.id)) return f;
                              return {
                                ...f,
                                addItemQuantities: {
                                  ...(f.addItemQuantities || {}),
                                  [it.id]: normalizeQuantityDraft(f.addItemQuantities[it.id], av.available),
                                },
                              };
                            })
                          }
                          placeholder="1"
                          className="min-h-11 w-16 border-0 bg-transparent py-1.5 text-center text-base font-semibold tabular-nums text-slate-900 focus:outline-none"
                          aria-label={`כמות ${it.name}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => {
                              const current = parseQuantityInput(
                                getQuantityDraft(f.addItemQuantities || {}, it.id, fallbackQty),
                                av.available,
                              );
                              const next = Math.min(av.available, current + 1);
                              return {
                                ...f,
                                addItemQuantities: {
                                  ...(f.addItemQuantities || {}),
                                  [it.id]: String(next),
                                },
                              };
                            })
                          }
                          disabled={editValue >= av.available}
                          className="flex h-11 w-11 items-center justify-center bg-slate-200 text-slate-800 transition-colors hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`הוסף כמות ${it.name}`}
                        >
                          <span className="text-lg font-bold">+</span>
                        </button>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          addOrUpdateItemInForm(it.id, it.name, applyQty);
                          setForm((f) => ({
                            ...f,
                            addItemQuantities: { ...(f.addItemQuantities || {}), [it.id]: String(applyQty) },
                          }));
                        }}
                        disabled={av.available < 1 || editValue < 1}
                        className="w-full"
                        ariaLabel={isInOrder ? `עדכן כמות ${it.name}` : `הוסף ${it.name} להזמנה`}
                      >
                        {isInOrder ? 'עדכן' : 'הוסף'}
                      </Button>
                    </div>
                  </div>
                );
              })}
              {itemsInCurrentTab.length === 0 && (
                <p className="text-sm text-slate-700">אין פריטים בקטגוריה זו</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderItemsEditCollapse;
