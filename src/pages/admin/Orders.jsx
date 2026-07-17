import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrders } from "../../firebase/orders.js";
import { getItems } from "../../firebase/items.js";
import { ORDER_STATUSES, LABELS } from "../../constants/he.js";
import { exportOrdersMatrixExcel } from "../../utils/exportOrdersMatrixExcel.js";
import { format } from "date-fns";
import Card from "../../components/Card.jsx";
import Spinner from "../../components/Spinner.jsx";
import Chip from "../../components/Chip.jsx";

const Orders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterEventType, setFilterEventType] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [sortKey, setSortKey] = useState("eventDate");
  const [sortDir, setSortDir] = useState("desc");
  const [exportingExcel, setExportingExcel] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getOrders({
      searchDate: searchDate || undefined,
      status: filterStatus || undefined,
      eventType: filterEventType || undefined,
      includeArchived: showArchived,
    })
      .then((list) => {
        if (!cancelled) setOrders(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchDate, filterStatus, filterEventType, showArchived]);

  const uniqueNames = useMemo(() => {
    const names = [...new Set(orders.map((o) => o.customerName).filter(Boolean))];
    return names.sort((a, b) => (a || "").localeCompare(b || ""));
  }, [orders]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir(key === "eventDate" ? "desc" : "asc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let list = orders;
    if (searchName) {
      list = list.filter((o) => (o.customerName || "").trim() === searchName.trim());
    }
    if (searchPhone) {
      const digits = (searchPhone || "").replace(/\D/g, "");
      list = list.filter((o) => (o.phone || "").replace(/\D/g, "").includes(digits));
    }
    list = [...list].sort((a, b) => {
      let va = a[sortKey];
      let vb = b[sortKey];
      if (sortKey === "eventDate") {
        va = va ? new Date(va).getTime() : 0;
        vb = vb ? new Date(vb).getTime() : 0;
        return sortDir === "desc" ? vb - va : va - vb;
      }
      va = String(va ?? "");
      vb = String(vb ?? "");
      const cmp = va.localeCompare(vb, "he");
      return sortDir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [orders, searchName, searchPhone, sortKey, sortDir]);

  const handleRowClick = (orderId) => {
    navigate(`/admin/orders/${orderId}`);
  };

  const exportOrdersToExcel = async () => {
    setExportingExcel(true);
    try {
      const catalogItems = await getItems();
      await exportOrdersMatrixExcel(filteredAndSorted, catalogItems);
      toast.success("קובץ האקסל הורד");
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בייצוא אקסל");
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">ניהול הזמנות</h1>
        <button
          type="button"
          onClick={exportOrdersToExcel}
          disabled={exportingExcel}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-3 text-base font-semibold text-white shadow transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          aria-label="ייצוא הזמנות לאקסל"
        >
          {exportingExcel ? "מייצא..." : "ייצוא לאקסל"}
        </button>
      </div>
      <Card>
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="flex flex-col gap-1">
            <label htmlFor="search-name" className="text-sm font-medium text-gray-700">
              חיפוש לפי שם
            </label>
            <select
              id="search-name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="חיפוש לפי שם לקוח"
            >
              <option value="">כל השמות</option>
              {uniqueNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="search-phone" className="text-sm font-medium text-gray-700">
              חיפוש לפי טלפון
            </label>
            <input
              id="search-phone"
              type="text"
              placeholder="052-1234567"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="חיפוש לפי טלפון"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="search-date" className="text-sm font-medium text-gray-700">
              תאריך
            </label>
            <input
              id="search-date"
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="חיפוש לפי תאריך"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
              סטטוס
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="סינון סטטוס"
            >
              <option value="">כל הסטטוסים</option>
              {ORDER_STATUSES.filter((s) => s !== "בוטל").map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-event-type" className="text-sm font-medium text-gray-700">
              סוג אירוע
            </label>
            <select
              id="filter-event-type"
              value={filterEventType}
              onChange={(e) => setFilterEventType(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-base focus:border-teal-500 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              aria-label="סינון סוג אירוע"
            >
              <option value="">כל הסוגים</option>
              <option value="בשרי">בשרי</option>
              <option value="חלבי">חלבי</option>
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3" title="הצג הזמנות בארכיון">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded text-teal-600"
                aria-label="הצג ארכיון"
              />
              <span className="text-sm font-medium text-gray-700">{LABELS.showArchived}</span>
            </label>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filteredAndSorted.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleRowClick(o.id)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-right shadow-sm transition-colors hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <p className="font-semibold text-gray-900">{o.customerName}</p>
                  <p className="mt-1 text-sm text-gray-600">{o.phone}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-700">
                      {o.eventDate
                        ? format(
                            o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate),
                            "dd/MM/yyyy"
                          )
                        : "-"}
                    </span>
                    <Chip variant="eventType" value={o.eventType}>{o.eventType}</Chip>
                    <Chip variant="status" value={o.status}>{o.status}</Chip>
                  </div>
                </button>
              ))}
              {filteredAndSorted.length === 0 && (
                <p className="py-4 text-center text-gray-600">לא נמצאו הזמנות</p>
              )}
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700">
                  <th className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleSort("customerName")}
                      className="rounded px-1 py-0.5 text-right font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-label={sortKey === "customerName" ? `מיון לפי שם ${sortDir === "desc" ? "יורד" : "עולה"}` : "מיון לפי שם"}
                    >
                      שם {sortKey === "customerName" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleSort("phone")}
                      className="rounded px-1 py-0.5 text-right font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-label={sortKey === "phone" ? `מיון לפי טלפון ${sortDir === "desc" ? "יורד" : "עולה"}` : "מיון לפי טלפון"}
                    >
                      טלפון {sortKey === "phone" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleSort("eventDate")}
                      className="rounded px-1 py-0.5 text-right font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-label={sortKey === "eventDate" ? `מיון לפי תאריך אירוע ${sortDir === "desc" ? "חדש לישן" : "ישן לחדש"}` : "מיון לפי תאריך אירוע"}
                    >
                      תאריך אירוע {sortKey === "eventDate" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleSort("eventType")}
                      className="rounded px-1 py-0.5 text-right font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-label={sortKey === "eventType" ? `מיון לפי סוג ${sortDir === "desc" ? "יורד" : "עולה"}` : "מיון לפי סוג"}
                    >
                      סוג {sortKey === "eventType" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                    </button>
                  </th>
                  <th className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleSort("status")}
                      className="rounded px-1 py-0.5 text-right font-semibold hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      aria-label={sortKey === "status" ? `מיון לפי סטטוס ${sortDir === "desc" ? "יורד" : "עולה"}` : "מיון לפי סטטוס"}
                    >
                      סטטוס {sortKey === "status" ? (sortDir === "desc" ? "▼" : "▲") : ""}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((o) => (
                  <tr
                    key={o.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleRowClick(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(o.id);
                      }
                    }}
                    className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-teal-100 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-inset"
                    aria-label={`פרטי הזמנה ${o.customerName} ${o.eventDate ? format(o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate), "dd/MM/yyyy") : ""}`}
                  >
                    <td className="p-2">{o.customerName}</td>
                    <td className="p-2">{o.phone}</td>
                    <td className="p-2">
                      {o.eventDate
                        ? format(
                            o.eventDate instanceof Date ? o.eventDate : new Date(o.eventDate),
                            "dd/MM/yyyy"
                          )
                        : "-"}
                    </td>
                    <td className="p-2">
                      <Chip variant="eventType" value={o.eventType}>
                        {o.eventType}
                      </Chip>
                    </td>
                    <td className="p-2">
                      <Chip variant="status" value={o.status}>
                        {o.status}
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredAndSorted.length === 0 && (
              <p className="py-4 text-center text-gray-600">לא נמצאו הזמנות</p>
            )}
          </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default Orders;
