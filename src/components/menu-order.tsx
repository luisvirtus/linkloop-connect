import { useMemo, useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { brl } from "@/lib/format";

type Item = { c: string; n: string; d?: string; p: number };

export function MenuOrder({ items, phone, plateLabel }: { items: Item[]; phone: string | null; plateLabel: string | null }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState<Record<number, number>>({});
  const groups = useMemo(() => {
    const map = new Map<string, { item: Item; i: number }[]>();
    items.forEach((item, i) => {
      const key = item.c || "Cardápio";
      map.set(key, [...(map.get(key) ?? []), { item, i }]);
    });
    return [...map.entries()];
  }, [items]);
  const chosen = items.map((item, i) => ({ item, q: qty[i] ?? 0 })).filter((x) => x.q > 0);
  const total = chosen.reduce((sum, x) => sum + x.q * x.item.p, 0);
  const change = (i: number, d: number) => setQty((s) => ({ ...s, [i]: Math.max(0, Math.min(99, (s[i] ?? 0) + d)) }));
  const message = [`Novo pedido${plateLabel ? ` — ${plateLabel}` : ""}:`, ...chosen.map((x) => `• ${x.q}x ${x.item.n} (${brl(x.q * x.item.p)})`), `Total: ${brl(total)}`].join("\n");

  return (
    <section className="mt-8 border-t border-border pt-6 text-left" aria-labelledby="menu-title">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-border bg-card px-4 font-semibold shadow-sm">
        <UtensilsCrossed className="h-5 w-5 text-google-red" aria-hidden="true" />
        <span id="menu-title" className="flex-1">{open ? "Fechar cardápio" : "Ver cardápio"}</span>
      </button>
      {open ? (
        <div className="mt-4 space-y-5">
          {groups.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="mb-2 text-sm font-bold">{cat}</h3>
              <ul className="space-y-2">
                {list.map(({ item, i }) => (
                  <li key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.n}</p>
                      {item.d ? <p className="text-xs text-muted-foreground">{item.d}</p> : null}
                      <p className="text-sm">{brl(item.p)}</p>
                    </div>
                    <button type="button" aria-label={`Remover ${item.n}`} className="rounded-full border border-border p-2" onClick={() => change(i, -1)}><Minus className="h-4 w-4" /></button>
                    <span className="w-6 text-center font-semibold" aria-live="polite">{qty[i] ?? 0}</span>
                    <button type="button" aria-label={`Adicionar ${item.n}`} className="rounded-full border border-border p-2" onClick={() => change(i, 1)}><Plus className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {phone ? (
            <a
              aria-disabled={chosen.length === 0}
              href={chosen.length ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-14 items-center justify-center rounded-lg bg-primary px-4 font-semibold text-primary-foreground ${chosen.length ? "" : "pointer-events-none opacity-50"}`}
            >
              Enviar pedido pelo WhatsApp · {brl(total)}
            </a>
          ) : <p className="text-xs text-muted-foreground">Pedidos pelo WhatsApp ainda não configurados.</p>}
        </div>
      ) : null}
    </section>
  );
}
