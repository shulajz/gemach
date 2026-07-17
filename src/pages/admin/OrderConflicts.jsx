import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getOrdersWithEventDateInRange } from "../../firebase/orders.js";
import { getItems } from "../../firebase/items.js";
import Card from "../../components/Card.jsx";
import Spinner from "../../components/Spinner.jsx";

const toDateInput = (d) => format(d, "yyyy-MM-dd");

const OrderConflicts = () => {
  const [fromDate, setFromDate] = useState(toDateInput(startOfMonth(new Date())));
  const [toDate, setToDate] = useState(toDateInput(endOfMonth(new Date())));
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      }))
      .sort((a, b) => a.itemName.localeCompare(b.itemName, "he"));
  }, [orders, itemById]);

  const ordersRows = useMemo(
    () =>
      orders.map((order) => {
        const eventDate = order.eventDate
          ? format(
              order.eventDate instanceof Date
                ? order.eventDate
                : new Date(order.eventDate),
              "dd/MM/yyyy",
            )
          : "";
        const quantitiesByItemId = Object.fromEntries(
          (order.items || []).map((line) => [line.itemId, Number(line.quantity) || 0]),
        );
        return {
          id: order.id,
          customerName: order.customerName || "ללא שם",
          eventDate,
          quantitiesByItemId,
        };
      }),
    [orders],
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">בקרת עומסים בין תאריכים</h1>
      <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-teal-50/40">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="from-date" className="text-sm font-semibold text-slate-700">
              החל מתאריך
            </label>
            <input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="to-date" className="text-sm font-semibold text-slate-700">
              עד תאריך
            </label>
            <input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm focus:border-indigo-400 focus:bg-indigo-50/30 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
            </div>
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-300 shadow-sm">
              <table className="min-w-full border-collapse text-right text-sm">
                <thead>
                  <tr className="bg-slate-200 text-slate-800">
                    <th className="sticky right-0 z-10 border-b-2 border-l border-slate-300 bg-slate-200 px-4 py-3 font-semibold">
                      מזמין / תאריך
                    </th>
                    {relevantColumns.map((column) => {
                      const hasConflict =
                        column.maxQuantity > 0 && column.total > column.maxQuantity;
                      return (
                        <th
                          key={column.itemId}
                          className={`min-w-[130px] border-b-2 border-l border-slate-300 px-3 py-3 font-semibold ${
                            hasConflict ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-800"
                          }`}
                        >
                          <div>{column.itemName}</div>
                          <div className="mt-1 text-xs font-medium">
                            מקסימום: {column.maxQuantity || "-"}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ordersRows.map((row) => (
                    <tr key={row.id} className="odd:bg-white even:bg-slate-100/70">
                      <td className="sticky right-0 z-10 border-b border-l border-slate-300 bg-inherit px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.customerName}</div>
                        <div className="text-xs text-slate-700">{row.eventDate}</div>
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
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-cyan-50">
                    <td className="sticky right-0 z-10 border-l border-cyan-200 bg-cyan-50 px-4 py-3 font-bold text-cyan-900">
                      סה״כ בטווח
                    </td>
                    {relevantColumns.map((column) => {
                      const hasConflict =
                        column.maxQuantity > 0 && column.total > column.maxQuantity;
                      return (
                        <td
                          key={`total-${column.itemId}`}
                          className={`border-l border-cyan-200 px-3 py-3 text-center font-bold ${
                            hasConflict ? "text-rose-700" : "text-cyan-900"
                          }`}
                        >
                          {column.total}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              התנגשות מסומנת באדום כאשר סך ההזמנות בעמודה גדול מהמקסימום במלאי.
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OrderConflicts;
