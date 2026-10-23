const formatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Addis_Ababa",
});

/** For example "23 Oct 2026, 14:30" in Addis Ababa time. */
export function formatDateTime(value: string | null): string {
  return value ? formatter.format(new Date(value)) : "";
}
