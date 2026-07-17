/**
 * Items that often hit 0 availability (reserved >= maxQuantity on a day).
 * Higher soldOutDays = more frequently fully booked / in demand.
 */
export const computeHighDemandItems = (items, reservationDocs) => {
  const itemById = Object.fromEntries((items || []).map((item) => [item.id, item]));
  const soldOutDaysByItem = {};

  (reservationDocs || []).forEach((doc) => {
    const reservations = doc.itemReservations || {};
    Object.entries(reservations).forEach(([itemId, reservedRaw]) => {
      const item = itemById[itemId];
      if (!item) return;
      const maxQuantity = Number(item.maxQuantity) || 0;
      if (maxQuantity <= 0) return;
      const reserved = Number(reservedRaw) || 0;
      if (reserved < maxQuantity) return;
      soldOutDaysByItem[itemId] = (soldOutDaysByItem[itemId] || 0) + 1;
    });
  });

  return Object.entries(soldOutDaysByItem)
    .map(([itemId, soldOutDays]) => {
      const item = itemById[itemId];
      return {
        itemId,
        name: item?.name || itemId,
        soldOutDays,
        maxQuantity: Number(item?.maxQuantity) || 0,
      };
    })
    .sort((a, b) => {
      if (b.soldOutDays !== a.soldOutDays) return b.soldOutDays - a.soldOutDays;
      return String(a.name).localeCompare(String(b.name), 'he');
    });
};
