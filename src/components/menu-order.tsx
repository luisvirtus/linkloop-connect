import { useMemo, useState } from "react";
import { Minus, Plus, UtensilsCrossed } from "lucide-react";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Item = { c: string; n: string; d?: string; p: number };

export function MenuOrder({ items, disabled, onSubmit }: { items: Item[]; disabled: boolean; onSubmit: (items: { index: number; quantity: number }[]) => Promise<boolean> }) {
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

  return (
    <section className="mt-8 border-t border-border pt-6 text-left" aria-labelledby="menu-title">
      <Button variant="outline" onClick={() => setOpen((o) => !o)} className="flex min-h-14 w-full items-center gap-3 px-4 font-semibold shadow-sm">
        <UtensilsCrossed className="h-5 w-5 text-google-red" aria-hidden="true" />
        <span id="menu-title" className="flex-1">{open ? "Fechar cardápio" : "Ver cardápio"}</span>
      </Button>
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
                    <Button variant="outline" size="icon" disabled={disabled} aria-label={`Remover ${item.n}`} onClick={() => change(i, -1)}><Minus className="h-4 w-4" /></Button>
                    <span className="w-6 text-center font-semibold" aria-live="polite">{qty[i] ?? 0}</span>
                    <Button variant="outline" size="icon" disabled={disabled} aria-label={`Adicionar ${item.n}`} onClick={() => change(i, 1)}><Plus className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <Button className="min-h-14 w-full whitespace-normal" disabled={disabled || chosen.length === 0} onClick={async () => {
            const selection = items.flatMap((_, index) => qty[index] ? [{ index, quantity: qty[index] ?? 0 }] : []);
            if (await onSubmit(selection)) setQty({});
          }}>Confirmar e enviar pedido · {brl(total)}</Button>
        </div>
      ) : null}
    </section>
  );
}
