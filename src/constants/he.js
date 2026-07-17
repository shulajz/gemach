export const EVENT_TYPE_NO_UTENSILS = 'לא רלוונטי';
export const EVENT_TYPES = ['בשרי', 'חלבי', EVENT_TYPE_NO_UTENSILS];

export const getEventTypeLabel = (type) => {
  if (type === EVENT_TYPE_NO_UTENSILS) return 'לא רלוונטי – לא לוקח כלים';
  return type || '';
};
export const CATEGORIES = ['בשרי', 'חלבי', 'ניטרלי'];
export const ORDER_STATUSES = ['ממתין', 'אושר', 'נאסף', 'הוחזר', 'בוטל'];

/** קטגוריות להזמנה – לשוניות בדף בחירת הפריטים. */
export const ORDER_CATEGORIES = [
  { id: 'plates-dairy', label: 'צלחות, סכו"ם וכוסות - חלבי', eventType: 'חלבי' },
  { id: 'plates-meat', label: 'צלחות, סכו"ם וכוסות - בשרי', eventType: 'בשרי' },
  { id: 'tablecloths', label: 'מפות', eventType: null },
  { id: 'underplates', label: 'תחתיות לאוכל / לקישוט', eventType: null },
  { id: 'table-design', label: 'עיצוב שולחנות', eventType: null },
  { id: 'baskets', label: 'סלסלאות', eventType: null },
  { id: 'bowls-trays', label: 'קערות / תבניות להגשה', eventType: null },
  { id: 'electrical', label: 'מוצרי חשמל', eventType: null },
];

export const IMPORTANT_INFO = {
  title: 'הנחיות חשובות',
  sections: [
    {
      paragraphs: [
        'שימו ♥ 1: הגמ"ח מופעל ע"י מתנדבים לכן הקפידו להגיע בזמן שנקבע. הגמ"ח נפתח במיוחד בשבילכם בשעה שנקבעה.',
        'שימו ♥ 2: את הכלים שלקחתם תצטרכו להחזיר ביום למחרת או בהזדמנות הראשונה שהגמ"ח יפתח. תצטרכו לדאוג שיהיה מי שיחזיר את הכלים. לרוב כשאתם מחזירים כלים משפחה אחרת באה לשאול. אם לא החזרתם זה יחסר לשמחה של משפחה אחרת.',
        'שימו ♥ 3: בטופס תוכלו לראות את כל מה שניתן להשאיל מהגמ"ח, אבל לא בהכרח כל הדברים פנויים בתאריך של האירוע שלכם. לאחר ביצוע ההזמנה, צוות הגמ"ח ייצור איתכם קשר כדי לאשר איזה מוצרים מההזמנה שלכם פנויים ;)',
      ],
    },
    {
      title: '🔸 איך מגיעים? 🚗',
      paragraphs: [
        'הגמ"ח נמצא ברחוב דרך למרחב 36 (בליבא בעי בקומה התחתונה).',
      ],
    },
    {
      title: '🔸 כמה זה עולה?💵',
      paragraphs: [
        'ההשאלה בחינם. כאשר משאילים משאירים פיקדון של 200₪. לאחר שתחזירו את הכלים תוכלו להשאיר תרומה לגמ"ח אם תרצו.',
      ],
    },
    {
      title: 'מה יש בגמ"ח?',
      paragraphs: [
        '🔸 בשרי: צלחות גדולות וקטנות🍽️, כוסות🍷, סכו"ם🍴, מגוון כלי הגשה🥄🧂, קנקנים🍶.',
        '🔸 חלבי: צלחות גדולות וקטנות🍽️, מרקיות🍨🍜, כוסות🍹',
        '🔸 מגוון רחב למרכזי שולחן, אגרטלים🏺, פרחים, בולי עץ ועוד.',
        '🔸 מפות- השאלת מפות מותנת בכביסה במכבסה בלבד (18₪ + מע"מ למפה, כ-21₪). את המפות שמים במכבסה בבוקר שלמחרת הארוע ולא מאוחר מזה. מפות קטיפה אפורות שניתן לכבס בבית בעלות 5₪ למפה. לא לשים במייבש. אין לשים נרות ישירות על המפה',
        '🔸 סכו"ם- חלבי מגיע בסטים ארוזים ל6 אנשים. בשרי- מגיע ארוז בעשריות לפי דגם הסכום. וכך יש להחזירו- ארוז בעשריות עם גומיות נקי ויבש לפי דגם הסכום.',
        '🔸 פלטות ועוד...',
      ],
    },
    {
      title: 'מה קורה אם נשבר לי כלי באירוע?',
      paragraphs: [
        'לא נורא, המחיר הוא 150% מעלות הכלי. לדוגמה: אם נשברה כוס שעולה 4₪ תצטרכו לשלם 6₪ או לקנות את הכלי שנשבר.',
      ],
    },
    {
      title: 'מתי מחזירים את הכלים?',
      paragraphs: [
        'את הכלים מחזירים נקיים בהזדמנות הראשונה שהגמ"ח יפתח לאחר הארוע שלכם. לכן השארו בקבוצה ושימו לב לעדכונים. קחו בחשבון שאת הכלים והאביזרים שאתם מחזירים הזמינו אנשים אחרים לקחת עוד באותו היום. הגיעו או דאגו שמשהו אחר יחזיר. הגמ"ח נפתח בדר"כ פעם בשבוע, הכלים יישארו אצלכם עד הפתיחה הקרובה מיד לאחר האירוע שלכם.',
      ],
    },
    {
      paragraphs: ['🎊 שמחים בשמחתכם🎊'],
    },
    {
      paragraphs: ['*הכלים מושאלים לשומרי כשרות בלבד.'],
    },
  ],
};

export const LABELS = {
  fullName: 'שם מלא',
  phone: 'מספר טלפון',
  eventDate: 'תאריך של האירוע',
  city: 'עיר מגורים',
  eventType: 'סוג האירוע',
  itemName: 'שם הפריט',
  category: 'קטגוריה',
  maxQuantity: 'כמות מקסימלית',
  priceIfBroken: 'מחיר במקרה של שבירה',
  imageUrl: 'קישור לתמונה',
  notes: 'הערות',
  email: 'אימייל',
  password: 'סיסמה',
  login: 'כניסה',
  rememberMe: 'זכור אותי',
  depositPaid: 'פיקדון שולם',
  donationAmount: 'סכום תרומה',
  status: 'סטטוס',
  brokenItems: 'כלים שבורים',
  pickupLocation: 'מיקום איסוף',
  orderCategory: 'קטגוריה בהזמנה',
  myCart: 'הסל שלי',
  addToCart: 'הוסף לסל',
  updateCart: 'עדכן',
  inCart: 'בסל',
  nextCategory: 'הבא',
  prevCategory: 'הקודם',
  backToDetails: 'חזרה לפרטים',
  sendOrder: 'שליחת הזמנה',
  orderSummary: 'סיכום הזמנה',
  toSummary: 'לסיכום הזמנה',
  backToCategories: 'חזרה לבחירת פריטים',
  showArchived: 'הצג ארכיון',
  moveToArchive: 'העבר לארכיון',
  restoreFromArchive: 'שחזר מארכיון',
  deleteFromArchive: 'מחק מהארכיון',
  deleteFromArchiveConfirmTitle: 'מחיקה לצמיתות מהארכיון?',
  deleteFromArchiveConfirmMessage:
    'ההזמנה תימחק לצמיתות ולא ניתן יהיה לשחזר אותה. פעולה זו מיועדת רק להזמנות בארכיון.',
  deleteFromArchiveSuccess: 'ההזמנה נמחקה מהארכיון',
  unsavedChangesTitle: 'יש שינויים שלא נשמרו',
  unsavedChangesMessage: 'לשמור את השינויים לפני היציאה?',
  unsavedSave: 'שמירה',
  unsavedStay: 'המשך עריכה',
  unsavedDiscard: 'לצאת בלי לשמור',
  unsavedDiscardChanges: 'ביטול שינויים',
  unsavedReminder: 'יש שינויים שלא נשמרו — לחצי שמירה כדי לעדכן',
  saveOrder: 'שמירה',
  savingOrder: 'שומר...',
  cancelEdit: 'ביטול שינויים',
  searchByName: 'חיפוש לפי שם',
  searchItems: 'חיפוש פריט',
  searchItemsPlaceholder: 'למשל: צלחות',
  unavailableOnRequestedDate: 'לא זמין בתאריך המבוקש',
};

export const PICKUP_LOCATION = 'רחוב דרך למרחב 36 (בליבא בעי בקומה התחתונה)';

/** קישור לקבוצת הוואטסאפ של הגמ״ח */
export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/EW7AX8CH64tKvWn9wEWT7X';
