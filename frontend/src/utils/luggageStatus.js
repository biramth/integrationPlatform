export function getLuggageStatus(record) {
  const items = record.luggage_items_count || 0;
  const count = record.luggage_count;

  if (count !== null && count !== undefined && items >= count && count > 0) {
    return { label: `${items}/${count}`, variant: 'success' };
  }
  if (items > 0) {
    return { label: count ? `${items}/${count}` : `${items}`, variant: 'warning' };
  }
  return { label: 'Non', variant: 'neutral' };
}
