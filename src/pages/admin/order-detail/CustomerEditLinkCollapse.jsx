import Button from '../../../components/Button.jsx';

const CustomerEditLinkCollapse = ({
  open,
  onToggle,
  customerEditEnabled,
  customerEditExpiresAt,
  customerEditLink,
  saving,
  hasPhone,
  onGenerate,
  onCopy,
  onSendWhatsApp,
  onRevoke,
}) => {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="mt-4 flex w-full items-center justify-between rounded-xl border-2 border-indigo-300 bg-white px-4 py-3 text-right font-semibold text-indigo-900 transition-colors hover:border-indigo-400 hover:bg-indigo-50"
        aria-expanded={open}
        aria-label="פתיחה וסגירה של יצירת קישור עריכת הזמנה ללקוח"
      >
        <span>יצירת קישור עריכת הזמנה ללקוח</span>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm text-indigo-800 shadow-sm">
          {open ? '▴' : '▾'}
        </span>
      </button>
      <div
        className={`mt-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 p-3 sm:p-4 ${open ? '' : 'hidden'}`}
        hidden={!open}
      >
        <p className="text-sm leading-relaxed text-indigo-800">
          יוצרים קישור רק אחרי אישור טלפוני מהצוות. תוקף הקישור הוא 24 שעות.
        </p>
        {customerEditEnabled && (
          <p className="mt-1 text-xs text-indigo-700">פעיל עד: {customerEditExpiresAt}</p>
        )}
        {customerEditLink && (
          <div className="mt-3 break-all rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700">
            {customerEditLink}
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            onClick={onGenerate}
            disabled={saving}
            className="w-full sm:w-auto"
            ariaLabel="יצירת קישור עריכה ללקוח"
          >
            יצירת קישור
          </Button>
          <Button
            type="button"
            onClick={onSendWhatsApp}
            disabled={!customerEditLink || !hasPhone}
            className="w-full sm:w-auto"
            ariaLabel="שליחת קישור עריכה בוואטסאפ ללקוח"
          >
            שליחה בוואטסאפ ללקוח
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCopy}
            disabled={!customerEditLink}
            className="w-full sm:w-auto"
            ariaLabel="העתקת קישור עריכה"
          >
            העתקת קישור
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onRevoke}
            disabled={!customerEditEnabled || saving}
            className="w-full sm:w-auto"
            ariaLabel="ביטול קישור עריכה"
          >
            ביטול קישור
          </Button>
        </div>
      </div>
    </>
  );
};

export default CustomerEditLinkCollapse;
