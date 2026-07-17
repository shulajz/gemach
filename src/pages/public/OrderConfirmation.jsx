import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getOrderById } from '../../firebase/orders.js';
import { PICKUP_LOCATION, WHATSAPP_GROUP_URL, getEventTypeLabel } from '../../constants/he.js';
import { downloadOrderPdf } from '../../utils/pdfExport.js';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Spinner from '../../components/Spinner.jsx';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await getOrderById(orderId);
        if (!cancelled) setOrder(data);
        if (!cancelled && !data) setError('ההזמנה לא נמצאה');
      } catch (e) {
        if (!cancelled) setError(e?.message || 'שגיאה');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const handleDownloadPdf = async () => {
    if (!order) return;
    try {
      await downloadOrderPdf(order);
      toast.success('הורדת PDF החלה');
    } catch {
      toast.error('שגיאה ביצירת PDF');
    }
  };

  const eventDateStr = order?.eventDate
    ? (order.eventDate instanceof Date
        ? order.eventDate
        : new Date(order.eventDate)
      ).toLocaleDateString('he-IL')
    : '';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <p className="rounded-xl bg-red-50 p-4 font-medium text-red-600">
          {error || 'ההזמנה לא נמצאה'}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <Card className="border-r-4 border-r-teal-600 bg-white shadow-lg">
        <h1 className="mb-2 text-xl font-bold text-teal-900 sm:text-2xl">אישור הזמנה</h1>
        <p className="mb-6 rounded-xl border-2 border-emerald-300 bg-emerald-100 px-3 py-3 text-sm font-bold leading-relaxed text-emerald-800 sm:px-4 sm:text-base">
          הזמנתך נשמרה במערכת. צוות הגמ&quot;ח ייצור איתך קשר לאחר בדיקת ההזמנה.
        </p>
        <div className="grid gap-3 text-sm md:grid-cols-2">
          <p className="break-words">
            <strong className="text-gray-700">שם:</strong> {order.customerName}
          </p>
          <p className="break-words">
            <strong className="text-gray-700">טלפון:</strong> {order.phone}
          </p>
          <p className="break-words">
            <strong className="text-gray-700">עיר:</strong> {order.city}
          </p>
          <p>
            <strong className="text-gray-700">תאריך אירוע:</strong> {eventDateStr}
          </p>
          <p className="break-words md:col-span-2">
            <strong className="text-gray-700">סוג אירוע:</strong>{' '}
            {getEventTypeLabel(order.eventType)}
          </p>
        </div>
        <div className="mt-6">
          <h2 className="font-bold text-gray-900">פריטים</h2>
          <ul className="mt-2 space-y-2 text-gray-700">
            {(order.items || []).map((line, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words">{line.itemName}</span>
                <span className="flex-shrink-0 font-semibold text-teal-800">{line.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-6 break-words rounded-xl border-2 border-teal-200 bg-teal-50 p-3 text-sm font-medium leading-relaxed text-teal-900 sm:p-4 sm:text-base">
          <strong>מיקום איסוף:</strong> {PICKUP_LOCATION}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={handleDownloadPdf} className="w-full" ariaLabel="הורדת PDF">
            הורדת PDF
          </Button>
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border-2 border-emerald-600 bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold text-emerald-800 transition-colors hover:bg-emerald-100"
            aria-label="הצטרפות לקבוצת הוואטסאפ של הגמ״ח"
          >
            קבוצת וואטסאפ של הגמ&quot;ח
          </a>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => window.print()}
            ariaLabel="הדפסה"
          >
            הדפסה
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default OrderConfirmation;
