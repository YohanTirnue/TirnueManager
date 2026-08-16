import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

export function parseTimestamp(st: number | string | Date = 0) {
  if (!st) return "";
  const d = dayjs(st);
  if (!d.isValid()) return "";
  return d.format("MMM DD YYYY").toUpperCase();
}

export function dayjsToTimestamp(dayjs?: Dayjs) {
  if (!dayjs) return 0;
  return dayjs.valueOf();
}

export function timestampToDayjs(st = 0) {
  if (!st) return;
  return dayjs(st);
}
