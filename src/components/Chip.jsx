/**
 * Chip/badge for event type (חלבי/בשרי/ניטרלי) and order status.
 * חלבי = blue, בשרי = red (readable shades). Statuses get distinct colors.
 */
const EVENT_TYPE_CLASS = {
  חלבי: 'bg-blue-100 text-blue-800',
  בשרי: 'bg-red-100 text-red-800',
  ניטרלי: 'bg-gray-100 text-gray-800',
};

const STATUS_CLASS = {
  ממתין: 'bg-amber-100 text-amber-800',
  אושר: 'bg-blue-100 text-blue-800',
  נאסף: 'bg-green-100 text-green-800',
  הוחזר: 'bg-gray-100 text-gray-700',
  בוטל: 'bg-gray-100 text-gray-500',
};

const getEventTypeClass = (value) => EVENT_TYPE_CLASS[value] || 'bg-gray-100 text-gray-700';
const getStatusClass = (value) => STATUS_CLASS[value] || 'bg-gray-100 text-gray-700';

const Chip = ({ children, variant = 'eventType', value }) => {
  const base = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold';
  const classMap = variant === 'status' ? getStatusClass(value ?? children) : getEventTypeClass(value ?? children);
  return <span className={`${base} ${classMap}`}>{children}</span>;
};

export default Chip;
export { getEventTypeClass, getStatusClass };
