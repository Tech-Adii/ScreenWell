import { EventRecord } from '../shared/types';
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replaceAll('"', '""')}"`;
}
export function csvReport(events: EventRecord[], demo = false): string {
  return (
    '\ufeff' +
    [
      ['dataset', 'date_local', 'time_iso', 'type', 'value', 'detail'],
      ...events.map((e) => [
        demo ? 'DEMO_SYNTHETIC' : 'PERSONAL_LOCAL',
        e.day,
        new Date(e.at).toISOString(),
        e.type,
        e.value,
        e.detail,
      ]),
    ]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}
