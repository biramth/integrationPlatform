export function getMattressStatus(room) {
  const { mattress_count: count, occupied = 0, capacity } = room;

  if (count === null || count === undefined) {
    return { label: 'Non compté', variant: 'neutral' };
  }
  if (count < occupied) {
    return { label: `${count}/${capacity}`, variant: 'danger' };
  }
  if (count < capacity) {
    return { label: `${count}/${capacity}`, variant: 'warning' };
  }
  return { label: `${count}/${capacity}`, variant: 'success' };
}
