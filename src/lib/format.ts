export function duration(sec: number | null | undefined): string {
  if (!sec) return '';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  // Due dates are plain YYYY-MM-DD; parse as local so they never shift a day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isOverdue(dueDate: string | null, completedAt: string | null): boolean {
  if (!dueDate || completedAt) return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

export const roleLabel: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager', member: 'Member' };
