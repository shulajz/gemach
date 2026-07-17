const SLOT_MINUTES = 10;

const GUIDELINES = [
  '1. לקיחה והחזרה בזמנים שנקבעים. ⏰',
  '2. לקיחה תנתן בפקדון של 200 שקלים *במזומן או בצ\'ק בלבד*. 💵',
  '3. למי שיש הרבה ציוד לקחת מומלץ להביא עזרה. 👬',
  '4. יש להחזיר ציוד נקי ויבש, סכום יש להחזיר מחולק לעשיריות. 🍴',
  '5. מפות סאטן/פשתן יש לנקות במכבסה, מפות קטיפה מנקים בבית, מייבשים בתלייה ומשלמים 5 שקלים לשימוש בכל מפה עבור בלאי. 🧼',
  '6.  השאלה לוקחת לעיתים זמן, יש להגיע עם סבלנות ואורך רוח. 💞',
];

/** Parse "HH:mm" into minutes from midnight. */
export const parseTimeToMinutes = (timeStr) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(timeStr || '').trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

/** Format minutes-from-midnight as HH:mm */
export const formatMinutesAsTime = (totalMinutes) => {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/**
 * Assign 10-minute slots starting at startTime.
 * Expects rows already sorted: מחזיר first, then לוקח.
 */
export const assignScheduleSlots = (rows, startTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  if (startMinutes == null) return [];
  return (rows || []).map((row, index) => ({
    ...row,
    slotTime: formatMinutesAsTime(startMinutes + index * SLOT_MINUTES),
  }));
};

/** WhatsApp-ready schedule message (copy-paste). */
export const buildWhatsAppScheduleMessage = (rows, startTime) => {
  const slotted = assignScheduleSlots(rows, startTime);
  if (!slotted.length) return '';

  const returners = slotted.filter((row) => row.role === 'מחזיר');
  const pickers = slotted.filter((row) => row.role === 'לוקח');

  const lines = [
    'היי,',
    'מקוה שכולכם שריינתם את היום להגיע לגמ"ח.',
    'אז זה הלוז:',
  ];

  if (returners.length) {
    lines.push('*מגיעים להחזיר*:');
    returners.forEach((row) => {
      lines.push(`${row.slotTime} @${row.customerName}`);
    });
  }

  if (pickers.length) {
    lines.push('*מגיעים לקחת:*');
    pickers.forEach((row) => {
      lines.push(`${row.slotTime} @${row.customerName}`);
    });
  }

  lines.push('');
  lines.push('בבקשה אשרו ב👍🏻 שראיתם, ושאתם מודעים להנחיות:');
  lines.push(...GUIDELINES);
  lines.push('');
  lines.push('נתראה👋🏻');

  return lines.join('\n');
};
