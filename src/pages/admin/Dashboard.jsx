import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay, addDays } from "date-fns";
import { getOrders } from "../../firebase/orders.js";
import Card from "../../components/Card.jsx";
import Spinner from "../../components/Spinner.jsx";
import Chip from "../../components/Chip.jsx";

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await getOrders({});
        setOrders(list);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const today = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const next7End = endOfDay(addDays(new Date(), 7));

  const ordersToday = orders.filter((o) => {
    const d = o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate);
    return d >= today && d <= todayEnd;
  });
  const upcomingEvents = orders.filter((o) => {
    const d = o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate);
    return d > todayEnd && d <= next7End;
  });
  const onLoan = orders.filter((o) => o.status === "נאסף");
  const overdue = orders.filter((o) => {
    if (o.status !== "נאסף") return false;
    const eventDate =
      o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate);
    const returnBy = addDays(eventDate, 1);
    return new Date() > returnBy;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  const cards = [
    {
      title: "הזמנות היום",
      value: ordersToday.length,
      sub: "איסופים/החזרות היום",
      colorClass: "text-primary-600",
    },
    {
      title: "אירועים קרובים",
      value: upcomingEvents.length,
      sub: "7 הימים הבאים",
      colorClass: "text-success",
    },
    {
      title: "פריטים בהשאלה",
      value: onLoan.length,
      sub: "הזמנות בסטטוס נאסף",
      colorClass: "text-warning",
    },
    {
      title: "התראות",
      value: overdue.length,
      sub: overdue.length ? "החזרות באיחור" : "אין",
      colorClass: overdue.length ? "text-red-600" : "text-primary-600",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-900">לוח בקרה</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} hover className="border-r-4 border-r-primary-500">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {c.title}
            </p>
            <p className={`mt-2 text-3xl font-bold ${c.colorClass}`}>
              {c.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{c.sub}</p>
          </Card>
        ))}
      </div>
      <Card className="admin-content-layer">
        <h2 className="mb-4 text-xl font-bold text-gray-900">הזמנות היום</h2>
        {ordersToday.length === 0 ? (
          <p className="text-gray-600">אין הזמנות ליום זה</p>
        ) : (
          <ul className="space-y-2">
            {ordersToday.map((o) => (
              <li
                key={o.id}
                className="admin-content-layer flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3"
              >
                <span className="font-medium text-gray-900">
                  {o.customerName}
                </span>
                <div className="flex items-center gap-2">
                  <Chip variant="eventType" value={o.eventType}>
                    {o.eventType}
                  </Chip>
                  <span className="text-sm text-gray-600">
                    {format(
                      o.eventDate instanceof Date
                        ? o.eventDate
                        : new Date(o.eventDate),
                      "HH:mm",
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
