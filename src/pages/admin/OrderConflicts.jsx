import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getOrdersWithEventDateInRange } from "../../firebase/orders.js";
import { getItems } from "../../firebase/items.js";
import Card from "../../components/Card.jsx";
import Spinner from "../../components/Spinner.jsx";

const toDateInput = (d) => format(d, "yyyy-MM-dd");

const formatDisplayDate = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "dd/MM/yyyy");
};

const dateInputClassName =
  "min-h-11 w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-base text-slate-800 shadow-sm focus:border-indigo-400 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-300 sm:text-sm";

const OrderDateLine = ({ eventDate, orderedAt }) => (
  <p className="text-xs leading-snug text-slate-600">
    {eventDate ? `אירוע: ${eventDate}` : "אירוע: —"}
    {orderedAt ? ` (הוזמן: ${orderedAt})` : ""}
  </p>
);

const OrderConflicts = () => {
  const [fromDate, setFromDate] = useState(toDateInput(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(toDateInput(endOfMonth(new Date())));
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileView, setMobileView] = useState("item");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!fromDate || !toDate) return;
      if (fromDate > toDate) {
        setError("תאריך התחלה חייב להיות קטן או שווה לתאריך סיום");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [ordersInRange, inventoryItems] = await Promise.all([
          getOrdersWithEventDateInRange(fromDate, toDate),
          getItems(),
        ]);
        if (cancelled) return;
        const filteredOrders = (ordersInRange || []).filter(
          (order) => !order.archived && order.status !== "בוטל",
        );
        setOrders(filteredOrders);
        setItems(inventoryItems || []);
      } catch (e) {
        if (!cancelled) {
          setError("שגיאה בטעינת נתונים");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fromDate, toDate]);

  const itemById = useMemo(
    () => Object.fromEntries(items.map((item) => [item.id, item])),
    [items],
  );

  const relevantColumns = useMemo(() => {
    const totals = {};
    orders.forEach((order) => {
      (order.items || []).forEach((line) => {
        const qty = Number(line.quantity) || 0;
        if (qty <= 0) return;
        totals[line.itemId] = (totals[line.itemId] || 0) + qty;
      });
    });
    return Object.entries(totals)
      .filter(([, total]) => total > 0)
      .map(([itemId, total]) => ({
        itemId,
        total,
        itemName: itemById[itemId]?.name || itemId,
        maxQuantity: Number(itemById[itemId]?.maxQuantity) || 0,
        hasConflict:
          Number(itemById[itemId]?.maxQuantity) > 0 &&
          total > Number(itemById[itemId]?.maxQuantity),
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName, "he"));
  }, [orders, itemById]);

  const ordersRows = useMemo(
    () =>
      orders.map((order) => {
        const eventDate = formatDisplayDate(order.eventDate);
        const orderedAt = formatDisplayDate(order.createdAt);
        const quantitiesByItemId = Object.fromEntries(
          (order.items || []).map((line) => [line.itemId, Number(line.quantity) || 0]),
        );
        return {
          id: order.id,
          customerName: order.customerName || "ללא שם",
          eventDate,
          orderedAt,
          quantitiesByItemId,
        };
      }),
    [orders],
  );

  const conflictColumns = useMemo(
    () => relevantColumns.filter((column) => column.hasConflict),
    [relevantColumns],
  );

  const itemCards = useMemo(
    () =>
      relevantColumns.map((column) => ({
        ...column,
        orderLines: ordersRows
          .map((row) => ({
            id: row.id,
            customerName: row.customerName,
            eventDate: row.eventDate,
            orderedAt: row.orderedAt,
            quantity: row.quantitiesByItemId[column.itemId] || 0,
          }))
          .filter((line) => line.quantity > 0),
      })),
    [relevantColumns, ordersRows],
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">בקרת עומסים בין תאריכים</h1>
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-teal-50/40">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="from-date" className="text-sm font-semibold text-slate-700">
              החל מתאריך
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={dateInputClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="to-date" className="text-sm font-semibold text-slate-700">
              עד תאריך
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={dateInputClassName}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </Card>

      <Card className="border-slate-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : relevantColumns.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
            אין פריטים רלוונטיים בטווח התאריכים שנבחר.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-slate-700">
              נמצאו <strong>{ordersRows.length}</strong> הזמנות עם{" "}
              <strong>{relevantColumns.length}</strong> פריטים רלוונטיים.
              {conflictColumns.length > 0 && (
                <>
                  {" "}
                  · <strong className="text-rose-700">{conflictColumns.length} התנגשויות</strong>
                </>
              )}
            </div>

            {/* Mobile: vertical cards with full data */}
            <div className="space-y-3 md:hidden">
              <div
                className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
                role="tablist"
                aria-label="תצוגת מובייל"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileView === "item"}
                  onClick={() => setMobileView("item")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    mobileView === "item"
                      ? "bg-white text-indigo-800 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  לפי פריט
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileView === "order"}
                  onClick={() => setMobileView("order")}
                  className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                    mobileView === "order"
                      ? "bg-white text-indigo-800 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  לפי הזמנה
                </button>
              </div>

              {mobileView === "item" ? (
                <ul className="space-y-3" aria-label="פירוט לפי פריט">
                  {itemCards.map((column) => (
                    <li
                      key={column.itemId}
                      className={`overflow-hidden rounded-2xl border-2 ${
                        column.hasConflict
                          ? "border-rose-300 bg-rose-50/40"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div
                        className={`flex items-start justify-between gap-3 px-3 py-3 ${
                          column.hasConflict ? "bg-rose-100/80" : "bg-slate-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p
                            className={`font-bold ${
                              column.hasConflict ? "text-rose-900" : "text-slate-900"
                            }`}
                          >
                            {column.itemName}
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            מקסימום: {column.maxQuantity || "—"}
                            {column.hasConflict ? " · חריגה מהמלאי" : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-left">
                          <p
                            className={`text-xl font-bold ${
                              column.hasConflict ? "text-rose-700" : "text-cyan-800"
                            }`}
                          >
                            {column.total}
                          </p>
                          <p className="text-xs text-slate-500">סה״כ</p>
                        </div>
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {column.orderLines.map((line) => (
                          <li
                            key={`${column.itemId}-${line.id}`}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900">
                                {line.customerName}
                              </p>
                              <OrderDateLine
                                eventDate={line.eventDate}
                                orderedAt={line.orderedAt}
                              />
                            </div>
                            <span className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-800">
                              {line.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-3" aria-label="פירוט לפי הזמנה">
                  {ordersRows.map((row) => {
                    const orderedLines = relevantColumns
                      .map((column) => ({
                        ...column,
                        quantity: row.quantitiesByItemId[column.itemId] || 0,
                      }))
                      .filter((line) => line.quantity > 0);

                    return (
                      <li
                        key={row.id}
                        className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white"
                      >
                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-3">
                          <p className="font-bold text-slate-900">{row.customerName}</p>
                          <div className="mt-1">
                            <OrderDateLine
                              eventDate={row.eventDate}
                              orderedAt={row.orderedAt}
                            />
                          </div>
                        </div>
                        {orderedLines.length === 0 ? (
                          <p className="px-3 py-3 text-sm text-slate-500">אין פריטים בהזמנה</p>
                        ) : (
                          <ul className="divide-y divide-slate-100">
                            {orderedLines.map((line) => (
                              <li
                                key={`${row.id}-${line.itemId}`}
                                className={`flex items-center justify-between gap-3 px-3 py-2.5 ${
                                  line.hasConflict ? "bg-rose-50/50" : ""
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900">
                                    {line.itemName}
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    סה״כ בטווח {line.total}
                                    {line.maxQuantity ? ` / מקס׳ ${line.maxQuantity}` : ""}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-800">
                                  {line.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Desktop: full matrix table */}
            <div className="hidden overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm md:block">
              <table className="min-w-full border-collapse text-right text-sm">
                <thead>
                  <tr className="bg-slate-200 text-slate-800">
                    <th className="sticky right-0 z-10 border-b-2 border-l border-slate-300 bg-slate-200 px-4 py-3 font-semibold">
                      מזמין / תאריך אירוע (הוזמן)
                    </th>
                    {relevantColumns.map((column) => (
                      <th
                        key={column.itemId}
                        className={`min-w-[130px] border-b-2 border-l border-slate-300 px-3 py-3 font-semibold ${
                          column.hasConflict
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-800"
                        }`}
                      >
                        <div>{column.itemName}</div>
                        <div className="mt-1 text-xs font-medium">
                          מקסימום: {column.maxQuantity || "-"}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordersRows.map((row, rowIndex) => {
                    const rowBg = rowIndex % 2 === 0 ? "bg-white" : "bg-slate-100";
                    return (
                      <tr key={row.id} className={rowBg}>
                        <td
                          className={`sticky right-0 z-10 border-b border-l border-slate-300 px-4 py-3 ${rowBg}`}
                        >
                          <div className="font-semibold text-slate-900">{row.customerName}</div>
                          <div className="mt-0.5 text-xs text-slate-700">
                            {row.eventDate ? `אירוע: ${row.eventDate}` : "אירוע: —"}
                            {row.orderedAt ? ` (הוזמן: ${row.orderedAt})` : ""}
                          </div>
                        </td>
                        {relevantColumns.map((column) => {
                          const qty = row.quantitiesByItemId[column.itemId] || 0;
                          return (
                            <td
                              key={`${row.id}-${column.itemId}`}
                              className="border-b border-l border-slate-300 px-3 py-3 text-center font-medium text-slate-900"
                            >
                              {qty > 0 ? qty : ""}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-cyan-50">
                    <td className="sticky right-0 z-10 border-l border-cyan-200 bg-cyan-50 px-4 py-3 font-bold text-cyan-900">
                      סה״כ בטווח
                    </td>
                    {relevantColumns.map((column) => (
                      <td
                        key={`total-${column.itemId}`}
                        className={`border-l border-cyan-200 px-3 py-3 text-center font-bold ${
                          column.hasConflict ? "text-rose-700" : "text-cyan-900"
                        }`}
                      >
                        {column.total}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              התנגשות מסומנת באדום כאשר סך ההזמנות לפריט גדול מהמקסימום במלאי.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrderConflicts;
