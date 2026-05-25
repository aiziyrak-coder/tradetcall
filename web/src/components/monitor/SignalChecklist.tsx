import type { SignalCheckItem } from "../../../../shared/signal-detail";

interface Props {
  items: SignalCheckItem[];
}

export function SignalChecklist({ items }: Props) {
  const passed = items.filter((i) => i.ok).length;
  return (
    <div className="rounded border border-[var(--term-border)] bg-[var(--term-bg)] p-1.5">
      <p className="mb-1 flex justify-between text-[8px] font-bold uppercase text-[var(--term-gold)]">
        <span>Kirish tekshiruvi</span>
        <span className="text-[var(--term-cyan)]">
          {passed}/{items.length}
        </span>
      </p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-1 text-[8px] leading-snug">
            <span
              className={`mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded text-[7px] font-bold ${
                item.ok ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {item.ok ? "✓" : "·"}
            </span>
            <span className={item.ok ? "text-[var(--term-text)]" : "text-[var(--term-muted)]"}>
              {item.textUz}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
