export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatWeight(weight, unit) {
  if (weight == null) return '—';
  return `${parseFloat(weight).toFixed(1)} ${unit}`;
}

export function weightDiff(current, start) {
  if (current == null || start == null) return null;
  return parseFloat(current) - parseFloat(start);
}

export function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonth(monthStr) {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1);
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}
