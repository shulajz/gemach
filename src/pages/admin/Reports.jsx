import { useState, useEffect, useMemo } from 'react';
import { getOrders } from '../../firebase/orders.js';
import { getItems } from '../../firebase/items.js';
import { getAllReservationDocs } from '../../firebase/reservations.js';
import { computeHighDemandItems } from '../../utils/highDemandItems.js';
import Card from '../../components/Card.jsx';
import Spinner from '../../components/Spinner.jsx';

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [reservationDocs, setReservationDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getOrders({}), getItems(), getAllReservationDocs()])
      .then(([ordersList, itemsList, reservationsList]) => {
        if (cancelled) return;
        setOrders(ordersList || []);
        setItems(itemsList || []);
        setReservationDocs(reservationsList || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const brokenItemsReport = orders
    .filter((o) => (o.brokenItems || []).length > 0)
    .flatMap((o) =>
      (o.brokenItems || []).map((b) => ({
        orderId: o.id,
        customerName: o.customerName,
        ...b,
      })),
    );
  const totalDonations = orders.reduce(
    (sum, o) => sum + (Number(o.donationAmount) || 0),
    0,
  );

  const highDemandItems = useMemo(
    () => computeHighDemandItems(items, reservationDocs),
    [items, reservationDocs],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">דוחות</h1>

      <Card>
        <h2 className="mb-4 text-xl font-bold text-gray-900">כלים שבורים (150% ממחיר)</h2>
        {brokenItemsReport.length === 0 ? (
          <p className="text-gray-600">אין רישום כלים שבורים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b text-sm text-gray-600">
                  <th className="p-2">לקוח</th>
                  <th className="p-2">פריט</th>
                  <th className="p-2">כמות</th>
                  <th className="p-2">עלות</th>
                </tr>
              </thead>
              <tbody>
                {brokenItemsReport.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{r.customerName}</td>
                    <td className="p-2">{r.itemName}</td>
                    <td className="p-2">{r.quantity}</td>
                    <td className="p-2">{r.cost ?? '-'} ₪</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border-r-4 border-r-emerald-500">
        <h2 className="mb-4 text-xl font-bold text-gray-900">סיכום תרומות</h2>
        <p className="text-3xl font-bold text-emerald-600">{totalDonations} ₪</p>
      </Card>

      <Card>
        <h2 className="mb-1 text-xl font-bold text-gray-900">פריטים פופולריים / מבוקשים</h2>
        <p className="mb-4 text-sm text-gray-600">
          כמה פעמים כל פריט הגיע ל־0 זמינות (כל המלאי שמור לתאריך מסוים). ככל שהמספר גבוה יותר —
          הפריט מבוקש יותר יחסית למלאי.
        </p>

        {highDemandItems.length === 0 ? (
          <p className="text-gray-600">אין עדיין ימים שבהם פריטים הגיעו ל־0 זמינות</p>
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {highDemandItems.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">מלאי מקסימלי: {item.maxQuantity}</p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-lg font-bold text-teal-700">{item.soldOutDays}</p>
                    <p className="text-xs text-gray-500">ימים ב־0</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                    <th className="p-3">פריט</th>
                    <th className="p-3">מלאי מקסימלי</th>
                    <th className="p-3">ימים שהגיע ל־0</th>
                  </tr>
                </thead>
                <tbody>
                  {highDemandItems.map((item) => (
                    <tr key={item.itemId} className="border-b border-gray-100 hover:bg-teal-50/50">
                      <td className="p-3 font-medium text-gray-900">{item.name}</td>
                      <td className="p-3">{item.maxQuantity}</td>
                      <td className="p-3 font-semibold text-teal-700">{item.soldOutDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Reports;
