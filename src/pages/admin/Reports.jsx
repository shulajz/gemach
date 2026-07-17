import { useState, useEffect } from 'react';
import { getOrders } from '../../firebase/orders.js';
import Card from '../../components/Card.jsx';
import Spinner from '../../components/Spinner.jsx';

const Reports = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders({})
      .then(setOrders)
      .finally(() => setLoading(false));
  }, []);

  const brokenItemsReport = orders.filter((o) => (o.brokenItems || []).length > 0).flatMap((o) =>
    (o.brokenItems || []).map((b) => ({ orderId: o.id, customerName: o.customerName, ...b }))
  );
  const totalDonations = orders.reduce((sum, o) => sum + (Number(o.donationAmount) || 0), 0);
  const itemCounts = {};
  orders.forEach((o) => {
    (o.items || []).forEach((line) => {
      const name = line.itemName || line.itemId;
      itemCounts[name] = (itemCounts[name] || 0) + (line.quantity || 0);
    });
  });
  const popularItems = Object.entries(itemCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">דוחות</h1>

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
        <h2 className="mb-4 text-xl font-bold text-gray-900">פריטים פופולריים</h2>
        <ul className="space-y-2">
          {popularItems.map((item) => (
            <li key={item.name} className="flex justify-between">
              <span>{item.name}</span>
              <span>{item.count} פעמים</span>
            </li>
          ))}
          {popularItems.length === 0 && <li className="text-gray-600">אין נתונים</li>}
        </ul>
      </Card>
    </div>
  );
};

export default Reports;
