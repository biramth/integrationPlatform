export function staggerStyle(index, step = 40, max = 400) {
  return { animationDelay: `${Math.min(index * step, max)}ms` };
}
