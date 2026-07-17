const Spinner = ({ className = '' }) => (
  <div
    className={`inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 ${className}`}
    role="status"
    aria-label="טוען"
  />
);

export default Spinner;
