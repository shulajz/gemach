import Button from '../../../components/Button.jsx';
import { getReturnedQty } from './helpers.js';

const OrderReturnsCollapse = ({
  visible,
  open,
  onToggle,
  form,
  markAllReturned,
  setReturnedQtyInForm,
}) => {
  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 flex w-full items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-right font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
        aria-expanded={open}
        aria-label="פתיחה וסגירה של החזר פריטים"
      >
        <span>החזר פריטים</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700 shadow-sm">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="mt-3 rounded-xl border-2 border-slate-300 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-teal-900">ניהול החזרות</h3>
            <Button type="button" variant="secondary" onClick={markAllReturned} ariaLabel="סמן הכל הוחזר">
              סמן הכל הוחזר
            </Button>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            אפשר לעדכן כמה הוחזר מכל פריט, כדי לעקוב מה עדיין לא חזר.
          </p>
          <div className="space-y-2">
            {(form.items || []).map((line) => {
              const returnedQty = getReturnedQty(form.returnedItems, line.itemId);
              const orderedQty = Number(line.quantity) || 0;
              const remainingQty = Math.max(0, orderedQty - returnedQty);
              return (
                <div key={`returned-${line.itemId}`} className="flex flex-col gap-2 rounded-lg border border-teal-100 bg-white p-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{line.itemName}</p>
                    <p className="text-sm text-gray-700">הוזמן: {orderedQty} · נותר להחזיר: {remainingQty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">הוחזר</label>
                    <input
                      type="number"
                      min={0}
                      max={orderedQty}
                      value={returnedQty}
                      onChange={(e) => setReturnedQtyInForm(line.itemId, line.itemName, orderedQty, e.target.value)}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-center"
                      aria-label={`כמות שהוחזרה ${line.itemName}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default OrderReturnsCollapse;
