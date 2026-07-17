import { LABELS } from '../constants/he.js';

export const formatAvailabilityText = (available, max) =>
  available <= 0
    ? LABELS.unavailableOnRequestedDate
    : `${available} מתוך ${max} פנויים`;

export const isItemUnavailable = (available) => available <= 0;
