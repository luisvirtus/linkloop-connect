import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/admin.functions";
import { dateTimeBR } from "@/lib/format";
import { useMemo, useState } from "react";
import { Search, ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  head: () => ({ meta: [
    { title: "Auditoria — Plaquinhas QR" },
    { name: "description", content: "Histórico de ações administrativas e alterações." },
    { property: "og:title", content: "Auditoria — Plaquinhas QR" },
    { property: "og:description", content: "Histórico de segurança e operação." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Audit,
});

function Audit() {
  const fetchAudit = useServerFn(listAudit);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => fetchAudit({ data: {} } as any),
  });
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const actions = useMemo(() => Array.from(new Set((data ?? []).map((item: any) => item.action))).sort(), [data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return (data ?? []).filter((item: any) => {
      const matchesAction = action === "all" || item.action === action;
      const haystack = `${item.user_label} ${item.action} ${item.entity} ${item.entity_id ?? ""}`.toLocaleLowerCase("pt-BR");
      return matchesAction && (!term || haystack.includes(term));
    });
  }, [action, data, search]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary"><ScrollText className="h-5 w-5" /><span className="text-sm font-semibold">Rastreabilidade</span></div>
        <h1 className="mt-2 font-display text-2xl font-bold">Auditoria</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe as ações administrativas e alterações importantes do sistema.</p>
      </header>

      <div className="surface-card p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
          <label className="relative">
            <span className="sr-only">Buscar no histórico</span>
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar responsável, ação ou item" />
          </label>
          <select className="input" value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filtrar por ação">
            <option value="all">Todas as ações</option>
            {actions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}
          </select>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando histórico...</p> : null}
        {error ? <p className="p-6 text-sm text-destructive">Não foi possível carregar o histórico.</p> : null}
        {!isLoading && !error && filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">Nenhum registro encontrado.</p> : null}
        {filtered.length > 0 ? <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="bg-muted/40">
              <th className="px-5 py-3">Data</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>ID</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="whitespace-nowrap px-5 py-3">{dateTimeBR(l.created_at)}</td>
                <td>{l.user_label}</td>
                <td><span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold">{actionLabel(l.action)}</span></td>
                <td>{entityLabel(l.entity)}</td>
                <td className="max-w-36 truncate text-xs text-muted-foreground" title={l.entity_id ?? ""}>{l.entity_id ?? "—"}</td>
                <td className="pr-5 text-xs">
                  {l.details ? <details><summary className="cursor-pointer font-semibold text-primary">Visualizar</summary><pre className="mt-2 max-w-xs whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{JSON.stringify(l.details, null, 2)}</pre></details> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div> : null}
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  "admin.impersonate": "Acesso como cliente",
  "batch.create": "Lote criado",
  "plate.update": "Plaquinha alterada",
  "plate.unlink": "Plaquinha desvinculada",
  "plate.link": "Plaquinha vinculada",
  "payment.confirm": "Pagamento confirmado",
  "commission.pay": "Comissão paga",
  "settings.update": "Configurações alteradas",
  "seller.create": "Vendedor criado",
  "seller.update": "Vendedor alterado",
};

const ENTITY_LABELS: Record<string, string> = {
  batches: "Lote",
  plates: "Plaquinha",
  companies: "Empresa",
  payments: "Pagamento",
  commissions: "Comissão",
  settings: "Configurações",
  sellers: "Vendedor",
};

function actionLabel(value: string) {
  return ACTION_LABELS[value] ?? value;
}

function entityLabel(value: string) {
  return ENTITY_LABELS[value] ?? value;
}
