export function isoDateFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIsoDate(): string {
  return isoDateFromDate(new Date());
}

export function addDaysIsoDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDateFromDate(date);
}

export function formatReservationDayLabel(
  iso: string,
  todayIso = todayIsoDate(),
): string {
  if (iso === todayIso) return "hôm nay";
  if (iso === addDaysIsoDate(todayIso, 1)) return "ngày mai";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

/** Hiển thị ngày theo kiểu Việt Nam: dd/mm/yyyy */
export function formatIsoDateVi(iso: string): string {
  const date = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
