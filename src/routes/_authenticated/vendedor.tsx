import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign } from "lucide-react";
import { getSellerDashboard } from "@/lib/seller.functions";
import { brl, dateBR, PLATE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/vendedor")({
  head: () => ({ meta: [
    { title: "Painel do vendedor — Plaquinhas QR" },
    { name: "description", content: "Vendas, plaquinhas e comissões do vendedor." },
    { property: "og:title", content: "Painel do vendedor — Plaquinhas QR" },
    { property: "og:description", content: "Acompanhe vendas e comissões." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SellerPanel,
});

function SellerPanel() {
  const fetchDashboard = useServerFn(getSellerDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["seller"], queryFn: () => fetchDashboard({ data: {} } as never) });

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <BadgeDollarSign className="h-5 w-5 text-primary" /> Painel do vendedor
          </div>
          <Link to="/painel" className="text-sm font-semibold text-primary">Minha conta</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-5 px-5 py-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {data && !data.seller ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">
            Sua conta ainda não está cadastrada como vendedor. Fale com o administrador.
          </div>
        ) : null}

        {data?.seller ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Plaquinhas vendidas" value={String(data.sales?.length ?? 0)} />
              <Stat label="Comissões a receber" value={brl(data.totals?.pending ?? 0)} />
              <Stat label="Comissões pagas" value={brl(data.totals?.paid ?? 0)} />
            </div>

            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Minhas vendas</h2>
              <div className="mt-4 space-y-2 text-sm">
                {(data.sales ?? []).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <span>{dateBR(s.created_at ?? s.sold_at)}</span>
                    <span className="font-semibold">{brl(s.amount)}</span>
                  </div>
                ))}
                {(data.sales ?? []).length === 0 ? <p className="text-muted-foreground">Nenhuma venda ainda.</p> : null}
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Comissões</h2>
              <div className="mt-4 space-y-2 text-sm">
                {(data.commissions ?? []).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <span>{c.kind === "renewal" ? "Renovação" : "Venda"} · {c.percent}%</span>
                    <span className="font-semibold">
                      {brl(c.amount)} · {c.status === "paid" ? "paga" : "pendente"}
                    </span>
                  </div>
                ))}
                {(data.commissions ?? []).length === 0 ? <p className="text-muted-foreground">Nenhuma comissão ainda.</p> : null}
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="font-display text-lg font-bold">Minhas plaquinhas</h2>
              <div className="mt-4 space-y-2 text-sm">
                {(data.plates ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <span className="font-semibold">{p.qr_code}</span>
                    <span className="text-muted-foreground">{PLATE_STATUS_LABEL[p.status] ?? p.status}</span>
                  </div>
                ))}
                {(data.plates ?? []).length === 0 ? <p className="text-muted-foreground">Nenhuma plaquinha atribuída.</p> : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
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
