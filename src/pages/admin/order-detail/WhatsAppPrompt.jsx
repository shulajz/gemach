import Button from '../../../components/Button.jsx';

const WhatsAppPrompt = ({ visible, onOpen }) => {
  if (!visible) return null;

  return (
    <div className="mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4">
      <p className="text-sm font-medium text-emerald-900">
        ההזמנה נשמרה כמאושרת. אפשר לשלוח הודעת אישור בוואטסאפ.
      </p>
      <div className="mt-3">
        <Button type="button" variant="secondary" onClick={onOpen} ariaLabel="שליחת אישור בוואטסאפ">
          <span className="inline-flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M19.05 4.91A9.82 9.82 0 0 0 12.03 2C6.59 2 2.17 6.42 2.17 11.86c0 1.74.45 3.44 1.3 4.95L2 22l5.36-1.4a9.84 9.84 0 0 0 4.67 1.19h.01c5.44 0 9.86-4.42 9.86-9.86 0-2.63-1.03-5.1-2.85-6.92Zm-7.01 15.2h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.18.83.85-3.1-.2-.32a8.15 8.15 0 0 1-1.25-4.34c0-4.5 3.67-8.17 8.18-8.17 2.18 0 4.22.85 5.76 2.39a8.1 8.1 0 0 1 2.4 5.78c0 4.5-3.67 8.17-8.08 8.17Zm4.49-6.14c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.8.98-.15.17-.3.19-.56.06-.25-.13-1.08-.4-2.05-1.29-.76-.67-1.27-1.5-1.42-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.42 1.03 2.59.13.17 1.76 2.69 4.27 3.77.6.26 1.07.41 1.44.53.61.19 1.16.16 1.59.1.49-.07 1.47-.6 1.68-1.17.21-.58.21-1.08.15-1.17-.06-.09-.23-.15-.48-.27Z"
              />
            </svg>
            WhatsApp
          </span>
        </Button>
      </div>
    </div>
  );
};

export default WhatsAppPrompt;
