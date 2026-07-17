import { createPortal } from 'react-dom';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'אישור',
  cancelLabel = 'ביטול',
  discardLabel,
  onConfirm,
  onCancel,
  onDiscard,
  variant = 'primary',
  confirmDisabled = false,
}) => {
  if (!isOpen) return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 focus-visible:ring-red-400'
      : 'bg-teal-600 hover:bg-teal-700 focus-visible:ring-teal-500';

  const dialog = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="max-h-[min(90vh,40rem)] w-full max-w-sm overflow-y-auto rounded-2xl border border-gray-100 bg-white p-5 shadow-cardHover sm:p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-gray-600">
          {message}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 sm:w-auto"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          {discardLabel && onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              className="min-h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-2 font-medium text-amber-900 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:w-auto"
              aria-label={discardLabel}
            >
              {discardLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`min-h-11 w-full rounded-xl px-4 py-2 font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${confirmClass}`}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default ConfirmDialog;
