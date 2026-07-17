import { useEffect, useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import toast from "react-hot-toast";
import Card from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import Spinner from "../../components/Spinner.jsx";
import {
  applyOpeningScheduleChanges,
  describeConflictsInHebrew,
  getOpeningScheduleConfig,
  isOpeningDay,
} from "../../firebase/openingSchedule.js";
import { getHebrewError } from "../../utils/errorsHe.js";
import { downloadConflictsPdf } from "../../utils/pdfExport.js";

const WEEKDAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" },
];

const toDateStr = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const OpeningSchedule = () => {
  const [month, setMonth] = useState(new Date());
  const [defaultWeekday, setDefaultWeekday] = useState(3);
  const [overrides, setOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ message: "", percent: 0 });
  const [conflictMessages, setConflictMessages] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [showConflictsModal, setShowConflictsModal] = useState(false);
  const [exportingConflictsPdf, setExportingConflictsPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const config = await getOpeningScheduleConfig();
        if (cancelled) return;
        setDefaultWeekday(config.defaultWeekday);
        setOverrides(config.overrides || {});
      } catch (e) {
        if (!cancelled) toast.error(getHebrewError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const config = useMemo(
    () => ({ defaultWeekday, overrides }),
    [defaultWeekday, overrides],
  );

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const last = endOfMonth(month);
    return eachDayOfInterval({ start: first, end: last });
  }, [month]);

  const firstDayPadding = useMemo(
    () => startOfMonth(month).getDay(),
    [month],
  );

  const toggleDay = (date) => {
    const dateStr = toDateStr(date);
    const currentlyOpen = isOpeningDay(date, config);
    const nextOpen = !currentlyOpen;
    setOverrides((prev) => {
      const next = { ...prev };
      next[dateStr] = nextOpen;
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveProgress({ message: "מתחיל...", percent: 0 });
    try {
      const result = await applyOpeningScheduleChanges({
        defaultWeekday,
        overrides,
        onProgress: ({ message, percent }) => setSaveProgress({ message, percent }),
      });
      const messages = describeConflictsInHebrew(result.conflicts);
      setConflictMessages(messages);
      setPendingCount(result.movedToPendingCount);
      setShowConflictsModal(messages.length > 0 || result.movedToPendingCount > 0);
      toast.success("לו״ז פתיחה נשמר בהצלחה");
      if (!messages.length) {
        toast.success("לא זוהו התנגשויות בהזמנות");
      }
    } catch (e) {
      toast.error(getHebrewError(e));
    } finally {
      setSaving(false);
      setSaveProgress({ message: "", percent: 0 });
    }
  };

  const handleExportConflictsPdf = async () => {
    setExportingConflictsPdf(true);
    try {
      await downloadConflictsPdf({ conflictMessages, pendingCount });
      toast.success("דוח ההתנגשויות הורד כ-PDF");
    } catch (e) {
      toast.error(getHebrewError(e) || "שגיאה ביצירת PDF");
    } finally {
      setExportingConflictsPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">לו״ז פתיחת גמ״ח</h1>

      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-teal-50/40">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              יום פתיחה קבוע (ברירת מחדל)
            </label>
            <select
              value={defaultWeekday}
              onChange={(e) => setDefaultWeekday(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="בחירת יום פתיחה קבוע"
            >
              {WEEKDAYS.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-600">
              ניתן לשנות ידנית פתיחות ספציפיות בלוח למטה.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => setMonth(subMonths(month, 1))}>
              חודש קודם
            </Button>
            <Button type="button" variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>
              חודש הבא
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-slate-200 bg-white">
        <div className="mb-4 text-center text-xl font-bold text-slate-900">
          {format(month, "MMMM yyyy")}
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-600">
          {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map((w) => (
            <div key={w} className="rounded-lg bg-slate-100 px-2 py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayPadding }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const open = isOpeningDay(day, config);
            return (
              <button
                key={toDateStr(day)}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold transition-colors ${
                  open
                    ? "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                aria-label={`תאריך ${format(day, "dd/MM/yyyy")} ${open ? "פתוח" : "סגור"}`}
              >
                <div>{format(day, "d")}</div>
                <div className="mt-1 text-[11px]">{open ? "פתוח" : "סגור"}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving} ariaLabel="שמירת לוח פתיחה">
            {saving ? "שומר..." : "שמירת לו״ז פתיחה"}
          </Button>
        </div>
      </Card>

      {saving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-label="שומר לוח פתיחה"
        >
          <div className="w-full max-w-md rounded-2xl border border-indigo-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <Spinner className="h-6 w-6 flex-shrink-0 text-teal-600" />
              <h2 className="text-lg font-bold text-slate-900">שומר לו״ז פתיחה</h2>
            </div>
            <p className="mt-3 min-h-[1.25rem] text-sm font-medium text-slate-700" aria-live="polite">
              {saveProgress.message || "מעבד..."}
            </p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-teal-600 transition-[width] duration-300 ease-out"
                style={{ width: `${saveProgress.percent}%` }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={saveProgress.percent}
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">{saveProgress.percent}%</p>
            <p className="mt-3 text-center text-xs text-slate-500">
              זה עלול לקחת כמה רגעים — אל תסגרי את הדף
            </p>
          </div>
        </div>
      )}

      {showConflictsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="דוח התנגשויות לאחר שמירת לוז פתיחה"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-2 border-b border-rose-100 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-rose-900">התנגשויות שנמצאו לאחר השינוי</h2>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={exportingConflictsPdf}
                  onClick={handleExportConflictsPdf}
                  ariaLabel="ייצוא התנגשויות ל-PDF"
                >
                  {exportingConflictsPdf ? "מייצא..." : "ייצוא ל-PDF"}
                </Button>
                <button
                  type="button"
                  onClick={() => setShowConflictsModal(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  aria-label="סגירת חלון התנגשויות"
                >
                  סגירה
                </button>
              </div>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
              {pendingCount > 0 && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                  {pendingCount} הזמנות שהיו בסטטוס "אושר" הוחזרו אוטומטית ל-"ממתין".
                </p>
              )}
              {conflictMessages.length === 0 ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  לא זוהו התנגשויות.
                </p>
              ) : (
                conflictMessages.map((message, index) => (
                  <pre
                    key={`conflict-${index}`}
                    className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-base font-medium leading-8 text-slate-800 shadow-sm whitespace-pre-wrap font-sans"
                  >
                    {message}
                  </pre>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningSchedule;
