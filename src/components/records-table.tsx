import { Children, cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Element = ReactElement<{ children?: ReactNode; value?: unknown; className?: string }>;
function elements(node: ReactNode): Element[] { return Children.toArray(node).filter(isValidElement) as Element[]; }
function text(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (!isValidElement(child)) return String(child);
    const props = (child as Element).props;
    return props.children ? text(props.children) : typeof props.value === "string" || typeof props.value === "number" ? String(props.value) : "";
  }).join(" ");
}

/** Local presentation controls only; rows retain their original actions and permissions. */
export function RecordsTable({ children, labels, name = "registros" }: { children: Element; labels?: string[]; name?: string }) {
  const [search, setSearch] = useState("");
  const [hidden, setHidden] = useState<number[]>([]);
  const [sort, setSort] = useState<{ column: number; asc: boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const sections = elements(children.props.children);
  const body = sections.find(section => section.type === "tbody");
  const head = sections.find(section => section.type === "thead");
  const headings = labels ?? elements(elements(head?.props.children)[0]?.props.children).map(cell => text(cell.props.children));
  const rows = elements(body?.props.children);
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = rows.filter(row => text(row.props.children).toLocaleLowerCase("pt-BR").includes(term));
  if (sort) filtered.sort((a, b) => {
    const first = text(elements(a.props.children)[sort.column]?.props.children);
    const second = text(elements(b.props.children)[sort.column]?.props.children);
    const date = (v: string) => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim()) ? v.trim().split("/").reverse().join("") : v;
    return (sort.asc ? 1 : -1) * date(first).localeCompare(date(second), "pt-BR", { numeric: true });
  });
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  return <div className="records-view min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><input className="input pl-9 pr-10" aria-label={`Buscar ${name}`} placeholder={`Buscar ${name}...`} value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />{search ? <Button variant="ghost" size="icon" className="absolute right-1 top-1" aria-label={`Limpar busca de ${name}`} onClick={() => { setSearch(""); setPage(0); }}><X /></Button> : null}</div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label={`Colunas de ${name}`}><Columns3 /><span className="hidden sm:inline">Colunas</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{headings.map((label, i) => <DropdownMenuCheckboxItem key={i} checked={!hidden.includes(i)} disabled={i === 0 || label === "Ações"} onCheckedChange={checked => setHidden(checked ? hidden.filter(x => x !== i) : [...hidden, i])}>{label || "Ações"}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
    </div>
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="max-w-full overflow-x-auto"><table className={children.props.className}>
        <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground"><tr>{headings.map((label, i) => hidden.includes(i) ? null : <th key={i} className="whitespace-nowrap px-4 py-2 font-medium">{label === "Ações" || label === "Operação" ? label : <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => { setSort({ column: i, asc: sort?.column === i ? !sort.asc : true }); setPage(0); }}>{label}{sort?.column === i ? sort.asc ? <ArrowUp /> : <ArrowDown /> : <ArrowUpDown />}</Button>}</th>)}</tr></thead>
        <tbody>{filtered.slice(current * size, (current + 1) * size).map(row => <tr key={row.key} className="border-b border-border last:border-b-0 hover:bg-muted/30">{elements(row.props.children).map((cell, i) => hidden.includes(i) ? null : cell.type === "td" ? cloneElement(cell, { key: i, className: `${cell.props.className ?? ""} px-4 py-3 align-middle` }) : cloneElement(cell, { key: i }))}</tr>)}</tbody>
      </table></div>
      {!filtered.length ? <p className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum registro encontrado.</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground" aria-live="polite">{filtered.length ? `${current * size + 1}–${Math.min((current + 1) * size, filtered.length)} de ${filtered.length} ${name}` : `0 ${name}`}</p><div className="flex items-center gap-2"><select className="rounded-md border border-input bg-background px-2 py-1.5 text-xs" aria-label={`${name} por página`} value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>{[10, 25, 50].map(n => <option key={n} value={n}>{n} por página</option>)}</select><span className="text-xs text-muted-foreground">{current + 1} / {pages}</span><Button size="icon" variant="outline" aria-label={`Página anterior de ${name}`} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label={`Próxima página de ${name}`} disabled={current === pages - 1} onClick={() => setPage(current + 1)}><ChevronRight /></Button></div></div>
    </div>
  </div>;
}