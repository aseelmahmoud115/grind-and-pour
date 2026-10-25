/** Adds business days (Sun–Thu working week, as in Egypt) to a date. */
export function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay(); // 5 = Fri, 6 = Sat
    if (day !== 5 && day !== 6) added++;
  }
  return d;
}

const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
export const formatDay = (iso: string) => fmt.format(new Date(iso));

const fmtLong = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });
export const formatDateTime = (iso: string) => fmtLong.format(new Date(iso));
