import type { CalendarStatus } from "../../../../shared/calendar-types";

interface Props {
  calendar: CalendarStatus | null | undefined;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CalendarEventsStrip({ calendar }: Props) {
  if (!calendar) return null;
  const upcoming = calendar.upcoming?.slice(0, 5) ?? [];
  if (!upcoming.length && !calendar.inHighImpactWindow) return null;

  return (
    <div className="shrink-0 border-t border-[var(--term-border)] bg-black/20 px-2 py-1">
      <div className="flex flex-wrap items-center gap-2 text-[8px]">
        <span className="font-bold uppercase text-[var(--term-muted)]">
          Taqvim ({calendar.source})
        </span>
        {calendar.inHighImpactWindow && (
          <span className="font-bold text-red-400">⛔ {calendar.eventNameUz}</span>
        )}
        {upcoming.map((ev) => (
          <span
            key={ev.id}
            className={`rounded px-1 py-0 ${
              ev.impact === "high"
                ? "bg-red-950/60 text-red-300"
                : ev.impact === "medium"
                  ? "bg-amber-950/50 text-amber-200"
                  : "bg-zinc-800 text-zinc-400"
            }`}
            title={ev.name}
          >
            {formatTime(ev.datetime)} {ev.nameUz ?? ev.name}
          </span>
        ))}
      </div>
      <p className="mt-0.5 text-[7px] text-[var(--term-muted)]">{calendar.hintUz}</p>
    </div>
  );
}
