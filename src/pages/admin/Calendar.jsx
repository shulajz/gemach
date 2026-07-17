import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfDay,
} from 'date-fns';
import { getOrdersWithEventDateInRange } from '../../firebase/orders.js';
import {
  assignScheduleSlots,
  buildWhatsAppScheduleMessage,
} from '../../utils/whatsappScheduleMessage.js';
import Card from '../../components/Card.jsx';
import Spinner from '../../components/Spinner.jsx';
import Chip from '../../components/Chip.jsx';
import Button from '../../components/Button.jsx';

const toRangeStart = (dateStr) => new Date(`${dateStr}T00:00:00`);
const toRangeEnd = (dateStr) => new Date(`${dateStr}T23:59:59.999`);

const getOrderEventDate = (order) => {
  if (!order?.eventDate) return null;
  return order.eventDate instanceof Date ? order.eventDate : new Date(order.eventDate);
};

/** מחזיר = event already passed; לוקח = event today or still ahead */
const getPickupReturnRole = (order, todayStart = startOfDay(new Date())) => {
  const eventDate = getOrderEventDate(order);
  if (!eventDate) return 'לוקח';
  return startOfDay(eventDate) < todayStart ? 'מחזיר' : 'לוקח';
};

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [rangeOrders, setRangeOrders] = useState([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState('');
  const [openingTime, setOpeningTime] = useState('17:00');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const rangeReady = Boolean(rangeFrom && rangeTo);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calRangeStart = new Date(monthStart);
  calRangeStart.setDate(calRangeStart.getDate() - 7);
  const calRangeEnd = new Date(monthEnd);
  calRangeEnd.setDate(calRangeEnd.getDate() + 7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOrdersWithEventDateInRange(calRangeStart, calRangeEnd)
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentMonth.getTime()]);

  useEffect(() => {
    let cancelled = false;
    const loadRange = async () => {
      if (!rangeFrom || !rangeTo) {
        setRangeOrders([]);
        setRangeError('');
        setRangeLoading(false);
        return;
      }
      if (rangeFrom > rangeTo) {
        setRangeError('תאריך התחלה חייב להיות קטן או שווה לתאריך סיום');
        setRangeOrders([]);
        setRangeLoading(false);
        return;
      }
      setRangeLoading(true);
      setRangeError('');
      try {
        const list = await getOrdersWithEventDateInRange(
          toRangeStart(rangeFrom),
          toRangeEnd(rangeTo),
        );
        if (cancelled) return;
        const filtered = (list || []).filter(
          (order) => !order.archived && order.status !== 'בוטל',
        );
        setRangeOrders(filtered);
      } catch {
        if (!cancelled) {
          setRangeError('שגיאה בטעינת הזמנות לטווח התאריכים');
          setRangeOrders([]);
        }
      } finally {
        if (!cancelled) setRangeLoading(false);
      }
    };
    loadRange();
    return () => {
      cancelled = true;
    };
  }, [rangeFrom, rangeTo]);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const hebrewWeekStartsSunday = 0;
  const padding = (firstDayOfWeek - hebrewWeekStartsSunday + 7) % 7;

  const getOrdersForDate = (date) =>
    orders.filter((o) => {
      const d = getOrderEventDate(o);
      return d && isSameDay(d, date);
    });

  const rangeContactRows = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return [...rangeOrders]
      .map((order) => {
        const eventDate = getOrderEventDate(order);
        const role = getPickupReturnRole(order, todayStart);
        return {
          id: order.id,
          customerName: order.customerName || '—',
          phone: order.phone || '—',
          role,
          eventDate,
          eventDateLabel: eventDate ? format(eventDate, 'dd/MM/yyyy') : '—',
        };
      })
      .sort((a, b) => {
        // מחזירים first, then לוקחים
        if (a.role !== b.role) {
          return a.role === 'מחזיר' ? -1 : 1;
        }
        const aTime = a.eventDate ? a.eventDate.getTime() : 0;
        const bTime = b.eventDate ? b.eventDate.getTime() : 0;
        if (a.role === 'מחזיר') return aTime - bTime; // older returns first
        return aTime - bTime; // sooner pickups first
      });
  }, [rangeOrders]);

  const returnersCount = rangeContactRows.filter((r) => r.role === 'מחזיר').length;
  const pickersCount = rangeContactRows.filter((r) => r.role === 'לוקח').length;

  const slottedRows = useMemo(
    () => assignScheduleSlots(rangeContactRows, openingTime),
    [rangeContactRows, openingTime],
  );

  useEffect(() => {
    if (!rangeReady || !rangeContactRows.length) {
      setWhatsappMessage('');
      return;
    }
    setWhatsappMessage(buildWhatsAppScheduleMessage(rangeContactRows, openingTime));
  }, [rangeReady, rangeContactRows, openingTime]);

  const handleCopyWhatsAppMessage = async () => {
    const text = whatsappMessage.trim();
    if (!text) {
      toast.error('אין הודעה להעתקה');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('ההודעה הועתקה — אפשר להדביק בוואטסאפ');
    } catch {
      toast.error('לא הצלחנו להעתיק. העתיקי ידנית מהתיבה');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">לוח אירועים</h1>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-2 sm:mb-6">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="min-h-11 shrink-0 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 sm:px-4"
            aria-label="חודש קודם"
          >
            ←
          </button>
          <h2 className="truncate text-base font-bold text-gray-900 sm:text-xl">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="min-h-11 shrink-0 rounded-xl border-2 border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 sm:px-4"
            aria-label="חודש הבא"
          >
            →
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-0.5 text-center text-sm sm:gap-1">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                <div key={day} className="py-1 text-xs font-medium text-gray-600 sm:text-sm">
                  {day}
                </div>
              ))}
              {Array.from({ length: padding }).map((_, i) => (
                <div key={`pad-${i}`} className="p-1 sm:p-2" />
              ))}
              {days.map((day) => {
                const dayOrders = getOrdersForDate(day);
                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex min-h-[3.25rem] min-w-0 flex-col items-center justify-start overflow-hidden rounded-lg border-2 border-gray-100 p-1 transition hover:border-primary-200 hover:bg-primary-50/50 sm:min-h-[5rem] sm:items-stretch sm:rounded-xl sm:p-2 sm:text-right ${
                      selectedDate && isSameDay(day, selectedDate) ? 'ring-2 ring-primary-500' : ''
                    } ${!isSameMonth(day, currentMonth) ? 'text-gray-300' : ''}`}
                    aria-label={`${format(day, 'd')} - ${dayOrders.length} הזמנות`}
                  >
                    <span className="text-xs font-semibold sm:text-sm">{format(day, 'd')}</span>
                    {dayOrders.length > 0 && (
                      <>
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold leading-none text-white sm:hidden">
                          {dayOrders.length}
                        </span>
                        <span className="mt-1 hidden truncate text-xs font-medium text-primary-600 sm:block">
                          {dayOrders.length} הזמנות
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDate && (
              <div className="mt-6 border-t pt-4">
                <h3 className="font-semibold">הזמנות ליום {format(selectedDate, 'dd/MM/yyyy')}</h3>
                <ul className="mt-2 space-y-2">
                  {getOrdersForDate(selectedDate).map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
                    >
                      <span className="font-medium">{o.customerName}</span>
                      <Chip variant="eventType" value={o.eventType}>
                        {o.eventType}
                      </Chip>
                      <Chip variant="status" value={o.status}>
                        {o.status}
                      </Chip>
                    </li>
                  ))}
                  {getOrdersForDate(selectedDate).length === 0 && (
                    <li className="text-gray-600">אין הזמנות ביום זה</li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">רשימת לקוחות לפי טווח תאריכים</h2>
        <p className="mt-1 text-sm text-gray-600">
          בחרו מתאריך ועד תאריך כדי להציג את הרשימה. מחזיר = האירוע כבר עבר, לוקח = האירוע עוד לא
          עבר (או היום).
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="calendar-range-from" className="text-sm font-medium text-gray-700">
              מתאריך
            </label>
            <input
              id="calendar-range-from"
              type="date"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="מתאריך"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="calendar-range-to" className="text-sm font-medium text-gray-700">
              עד תאריך
            </label>
            <input
              id="calendar-range-to"
              type="date"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="עד תאריך"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <label htmlFor="calendar-opening-time" className="text-sm font-medium text-gray-700">
              שעת פתיחת הגמ״ח (ראשון בתור)
            </label>
            <input
              id="calendar-opening-time"
              type="time"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="שעת פתיחת הגמ״ח"
            />
            <p className="text-xs text-gray-500">כל לקוח אחריו במרווח של 10 דקות — קודם מחזירים, אחר כך לוקחים</p>
          </div>
        </div>

        {rangeError && (
          <p className="mt-3 text-sm font-medium text-red-600" role="alert">
            {rangeError}
          </p>
        )}

        {!rangeReady && (
          <p className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-600">
            בחרו מתאריך ועד תאריך כדי להציג את הטבלה
          </p>
        )}

        {rangeReady && rangeLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}

        {rangeReady && !rangeLoading && (
          <>
            <p className="mt-4 text-sm text-gray-700">
              נמצאו <strong>{rangeContactRows.length}</strong> הזמנות
              {rangeContactRows.length > 0 && (
                <>
                  {' '}
                  · <strong>{returnersCount}</strong> מחזירים · <strong>{pickersCount}</strong> לוקחים
                </>
              )}
            </p>

            <div className="mt-4 space-y-3 md:hidden">
              {slottedRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-right shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to={`/admin/orders/${row.id}`}
                      className="font-semibold text-teal-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      {row.customerName}
                    </Link>
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-gray-800">
                      {row.slotTime}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700" dir="ltr">
                    {row.phone}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">{row.eventDateLabel}</span>
                    <span
                      className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                        row.role === 'מחזיר'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-teal-100 text-teal-900'
                      }`}
                    >
                      {row.role}
                    </span>
                  </div>
                </div>
              ))}
              {slottedRows.length === 0 && !rangeError && (
                <p className="py-4 text-center text-gray-600">אין הזמנות בטווח שנבחר</p>
              )}
            </div>

            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                    <th className="p-3">שעה</th>
                    <th className="p-3">שם</th>
                    <th className="p-3">טלפון</th>
                    <th className="p-3">תאריך אירוע</th>
                    <th className="p-3">מחזיר / לוקח</th>
                  </tr>
                </thead>
                <tbody>
                  {slottedRows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-teal-50/60">
                      <td className="p-3 font-semibold tabular-nums">{row.slotTime}</td>
                      <td className="p-3">
                        <Link
                          to={`/admin/orders/${row.id}`}
                          className="font-medium text-teal-800 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                        >
                          {row.customerName}
                        </Link>
                      </td>
                      <td className="p-3" dir="ltr">
                        {row.phone}
                      </td>
                      <td className="p-3">{row.eventDateLabel}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            row.role === 'מחזיר'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-teal-100 text-teal-900'
                          }`}
                        >
                          {row.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {slottedRows.length === 0 && !rangeError && (
                <p className="py-4 text-center text-gray-600">אין הזמנות בטווח שנבחר</p>
              )}
            </div>

            {slottedRows.length > 0 && (
              <div className="mt-6 rounded-2xl border-2 border-teal-200 bg-teal-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">הודעת וואטסאפ להעתקה</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      אפשר לערוך את הטקסט לפני ההעתקה. אחרי הדבקה בקבוצה אפשר לתייג ידנית בוואטסאפ.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyWhatsAppMessage}
                    className="w-full shrink-0 sm:w-auto"
                    ariaLabel="העתקת הודעת וואטסאפ"
                  >
                    העתקה לוואטסאפ
                  </Button>
                </div>
                <textarea
                  id="whatsapp-schedule-message"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  rows={16}
                  className="mt-4 w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-sm leading-relaxed focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  aria-label="הודעת וואטסאפ"
                  dir="rtl"
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default Calendar;
