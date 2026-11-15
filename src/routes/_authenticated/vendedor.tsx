import { RecordsTable } from "@/components/records-table";
import { SystemPageHeading } from "@/components/system-page";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <main className="system-ui min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <BadgeDollarSign className="h-5 w-5 text-primary" /> Painel do vendedor
          </div>
          <Link to="/painel" className="text-sm font-semibold text-primary">Minha conta</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-5 px-5 py-6">
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
        {data && !data.seller ? (
          <div className="surface-card p-6 text-sm text-muted-foreground">
            Sua conta ainda não está cadastrada como vendedor. Fale com o administrador.
          </div>
        ) : null}

        {data?.seller ? (
          <>
            <SystemPageHeading title={data.seller.name || "Visão geral"} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Plaquinhas vendidas" value={String(data.sales?.length ?? 0)} />
              <Stat label="Comissões a receber" value={brl(data.totals?.pending ?? 0)} />
              <Stat label="Comissões pagas" value={brl(data.totals?.paid ?? 0)} />
            </div>

            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">Minhas vendas</h2>
              <RecordsTable name="vendas"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr><th>Data</th><th>Valor</th></tr></thead><tbody>{(data.sales ?? []).map((s: any) => <tr key={s.id}><td>{dateBR(s.created_at ?? s.sold_at)}</td><td className="font-semibold">{brl(s.amount)}</td></tr>)}</tbody></table></RecordsTable>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">Comissões</h2>
              <RecordsTable name="comissões"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr><th>Origem</th><th>Percentual</th><th>Valor</th><th>Situação</th></tr></thead><tbody>{(data.commissions ?? []).map((c: any) => <tr key={c.id}><td>{c.kind === "renewal" ? "Renovação" : "Venda"}</td><td>{c.percent}%</td><td className="font-semibold">{brl(c.amount)}</td><td><span className={`rounded-md px-2 py-1 text-xs font-medium ${c.status === "paid" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{c.status === "paid" ? "Paga" : "Pendente"}</span></td></tr>)}</tbody></table></RecordsTable>
            </section>

            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">Minhas plaquinhas</h2>
              <RecordsTable name="plaquinhas"><table className="w-full min-w-[480px] text-left text-sm"><thead><tr><th>Código</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{(data.plates ?? []).map((p: any) => <tr key={p.id}><td className="font-semibold">{p.qr_code}</td><td>{PLATE_STATUS_LABEL[p.status] ?? p.status}</td><td><Button asChild size="sm" variant="outline"><Link to="/imprimir/$plateId" params={{ plateId: p.id }}><Printer /> Imprimir</Link></Button></td></tr>)}</tbody></table></RecordsTable>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}
