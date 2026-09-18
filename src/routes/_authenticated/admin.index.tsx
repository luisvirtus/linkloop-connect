import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminDashboard } from "@/lib/admin.functions";
import { brl, PLATE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const fetchDashboard = useServerFn(getAdminDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetchDashboard({ data: {} } as never),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Plaquinhas" value={String(data.plates.total)} />
        <Stat label="Disponíveis" value={String(data.plates.byStatus["available"] ?? 0)} />
        <Stat label="Vinculadas" value={String(data.plates.byStatus["linked"] ?? 0)} />
        <Stat label="Bloqueadas" value={String(data.plates.blocked)} />
        <Stat label="Clientes" value={String(data.companies)} />
        <Stat label="Assinaturas ativas" value={String(data.subscriptions.active)} />
        <Stat label="Assinaturas vencidas" value={String(data.subscriptions.expired)} />
        <Stat label="Comissões a pagar" value={brl(data.finance.commissionsPending)} />
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Financeiro</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Line label="Receita total" value={brl(data.finance.revenue)} />
          <Line label="Receita plaquinhas" value={brl(data.finance.revenuePlates)} />
          <Line label="Receita assinaturas/renovações" value={brl(data.finance.revenueSubscriptions)} />
          <Line label="Custos" value={brl(data.finance.cost)} />
          <Line label="Comissões" value={brl(data.finance.commissions)} />
          <Line label="Recebido" value={brl(data.finance.received)} />
          <Line label="Pendente" value={brl(data.finance.pending)} />
          <Line label="Resultado líquido" value={brl(data.finance.result)} strong />
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Estoque por status</h2>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {Object.entries(data.plates.byStatus).map(([status, count]) => (
            <span key={status} className="rounded-full border border-border px-4 py-1.5">
              {PLATE_STATUS_LABEL[status] ?? status}: <strong>{count as number}</strong>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 ${strong ? "font-display text-xl font-bold text-primary" : "text-lg font-semibold"}`}>{value}</p>
    </div>
  );
}
