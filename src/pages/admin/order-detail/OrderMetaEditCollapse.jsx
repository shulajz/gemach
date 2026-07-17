import { ORDER_STATUSES, LABELS } from '../../../constants/he.js';

const OrderMetaEditCollapse = ({ open, onToggle, form, setForm }) => {
  const editableStatuses = ORDER_STATUSES.filter((status) => status !== 'הוחזר');

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 flex w-full items-center justify-between rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-right font-semibold text-slate-800 transition-colors hover:border-slate-400 hover:bg-slate-50"
        aria-expanded={open}
        aria-label="פתיחה וסגירה של עריכת הזמנה"
      >
        <span>עריכת הזמנה</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-700 shadow-sm">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="mt-3 rounded-xl border-2 border-slate-300 bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">סטטוס</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {editableStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-600">
              סטטוס "הוחזר" נקבע אוטומטית לפי מעקב ההחזרות.
            </p>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.depositPaid}
              onChange={(e) => setForm((f) => ({ ...f, depositPaid: e.target.checked }))}
              className="rounded text-primary-600"
            />
            {LABELS.depositPaid}
          </label>
          <div>
            <label className="block text-sm font-medium">{LABELS.donationAmount}</label>
            <input
              type="number"
              min={0}
              value={form.donationAmount}
              onChange={(e) => setForm((f) => ({ ...f, donationAmount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">הערות</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              rows={2}
            />
          </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrderMetaEditCollapse;
