import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { getOrdersWithEventDateInRange } from '../../firebase/orders.js';
import Card from '../../components/Card.jsx';
import Spinner from '../../components/Spinner.jsx';
import Chip from '../../components/Chip.jsx';

const Calendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [orders, setOrders] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(monthEnd);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOrdersWithEventDateInRange(rangeStart, rangeEnd)
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentMonth.getTime()]);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const hebrewWeekStartsSunday = 0;
  const padding = (firstDayOfWeek - hebrewWeekStartsSunday + 7) % 7;

  const getOrdersForDate = (date) =>
    orders.filter((o) => {
      const d = o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate);
      return isSameDay(d, date);
    });

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
          <h2 className="truncate text-base font-bold text-gray-900 sm:text-xl">{format(currentMonth, 'MMMM yyyy')}</h2>
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
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-0.5 text-center text-sm sm:gap-1">
              {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day) => (
                <div key={day} className="py-1 text-xs font-medium text-gray-600 sm:text-sm">{day}</div>
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
                    <li key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <span className="font-medium">{o.customerName}</span>
                      <Chip variant="eventType" value={o.eventType}>{o.eventType}</Chip>
                      <Chip variant="status" value={o.status}>{o.status}</Chip>
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
    </div>
  );
};

export default Calendar;
