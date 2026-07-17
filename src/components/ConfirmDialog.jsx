const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  onConfirm,
  onCancel,
  variant = 'primary',
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-cardHover">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-gray-600">
          {message}
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border-2 border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'
            }`}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
