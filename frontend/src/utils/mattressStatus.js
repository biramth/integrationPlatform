export function getMattressStatus(room) {
  const { mattress_count: count, occupied = 0 } = room;

  if (count === null || count === undefined) {
    return { label: 'Non compté', variant: 'neutral' };
  }
  return { label: `${count} matelas`, variant: count < occupied ? 'danger' : 'success' };
}
