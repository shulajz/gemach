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
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <h3 className="font-semibold text-teal-900">ניהול החזרות</h3>
            <Button
              type="button"
              variant="secondary"
              onClick={markAllReturned}
              className="w-full sm:w-auto"
              ariaLabel="סמן הכל הוחזר"
            >
              סמן הכל הוחזר
            </Button>
          </div>
          <p className="mb-4 text-sm text-gray-700">
            אפשר לסמן הכול כהוחזר ואז לתקן כמות ספציפית לפריט. פריט שהוחזר לגמרי מסומן בירוק.
          </p>
          <div className="space-y-2">
            {(form.items || []).map((line) => {
              const returnedQty = getReturnedQty(form.returnedItems, line.itemId);
              const orderedQty = Number(line.quantity) || 0;
              const remainingQty = Math.max(0, orderedQty - returnedQty);
              const fullyReturned = orderedQty > 0 && remainingQty === 0;
              return (
                <div
                  key={`returned-${line.itemId}`}
                  className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3 ${
                    fullyReturned
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-teal-100 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${
                        fullyReturned ? 'text-emerald-900' : 'text-gray-900'
                      }`}
                    >
                      {line.itemName}
                      {fullyReturned && (
                        <span className="mr-2 text-sm font-semibold text-emerald-700">
                          · הוחזר הכל
                        </span>
                      )}
                    </p>
                    <p
                      className={`text-sm ${
                        fullyReturned ? 'text-emerald-800' : 'text-gray-700'
                      }`}
                    >
                      הוזמן: {orderedQty} · נותר להחזיר: {remainingQty}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      className={`text-sm font-medium ${
                        fullyReturned ? 'text-emerald-800' : 'text-gray-700'
                      }`}
                      htmlFor={`returned-qty-${line.itemId}`}
                    >
                      הוחזר
                    </label>
                    <input
                      id={`returned-qty-${line.itemId}`}
                      type="number"
                      min={0}
                      max={orderedQty}
                      value={returnedQty}
                      onChange={(e) =>
                        setReturnedQtyInForm(
                          line.itemId,
                          line.itemName,
                          orderedQty,
                          e.target.value,
                        )
                      }
                      className={`w-20 rounded-lg border px-2 py-1.5 text-center ${
                        fullyReturned
                          ? 'border-emerald-300 bg-white text-emerald-900'
                          : 'border-gray-300 bg-white'
                      }`}
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
