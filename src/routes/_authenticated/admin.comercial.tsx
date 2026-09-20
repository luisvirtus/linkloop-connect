import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, CircleDollarSign, Clock3, HandCoins, ReceiptText, RefreshCw, ShoppingBag } from "lucide-react";
import { listSales, listSubscriptions, listPayments, confirmPayment, listCommissions, payCommission } from "@/lib/admin.functions";
import { brl, dateBR } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/comercial")({
  head: () => ({ meta: [
    { title: "Comercial — Plaquinhas QR" },
    { name: "description", content: "Vendas, assinaturas, pagamentos e comissões." },
    { property: "og:title", content: "Comercial — Plaquinhas QR" },
    { property: "og:description", content: "Gestão comercial e de recebimentos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Commercial,
});

const PAYMENT_LABELS: Record<string, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado" };
const KIND_LABELS: Record<string, string> = { plate: "Plaquinha", subscription: "Assinatura", renewal: "Renovação", sale: "Venda" };

function Commercial() {
  const qc = useQueryClient();
  const fetchSales = useServerFn(listSales);
  const fetchSubs = useServerFn(listSubscriptions);
  const fetchPayments = useServerFn(listPayments);
  const fetchCommissions = useServerFn(listCommissions);
  const confirm = useServerFn(confirmPayment);
  const pay = useServerFn(payCommission);

  const sales = useQuery({ queryKey: ["admin", "sales"], queryFn: () => fetchSales({ data: {} } as never) });
  const subs = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fetchSubs({ data: {} } as never) });
  const payments = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchPayments({ data: {} } as never) });
  const commissions = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => fetchCommissions({ data: {} } as never) });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: string) => confirm({ data: { paymentId } }),
    onSuccess: () => {
      toast.success("Pagamento confirmado e assinatura atualizada.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const payMutation = useMutation({
    mutationFn: (id: string) => pay({ data: { id } }),
    onSuccess: () => {
      toast.success("Comissão marcada como paga.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saleRows = sales.data ?? [];
  const paymentRows = payments.data ?? [];
  const commissionRows = commissions.data ?? [];
  const received = paymentRows.filter((item: any) => item.status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const pending = paymentRows.filter((item: any) => item.status === "pending").reduce((sum: number, item: any) => sum + Number(item.amount), 0);
  const commissionsPending = commissionRows.filter((item: any) => item.status === "pending").reduce((sum: number, item: any) => sum + Number(item.amount), 0);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary"><ReceiptText className="h-5 w-5" /><span className="text-sm font-semibold">Operação comercial</span></div>
        <h1 className="mt-2 font-display text-2xl font-bold">Comercial</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acompanhe vendas, vencimentos, recebimentos e valores devidos aos vendedores.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Summary icon={ShoppingBag} label="Vendas registradas" value={String(saleRows.length)} loading={sales.isLoading} />
        <Summary icon={BadgeCheck} label="Total recebido" value={brl(received)} loading={payments.isLoading} />
        <Summary icon={Clock3} label="A receber" value={brl(pending)} loading={payments.isLoading} />
        <Summary icon={HandCoins} label="Comissões pendentes" value={brl(commissionsPending)} loading={commissions.isLoading} />
      </div>

      <Tabs defaultValue="vendas">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vendas"><DataPanel title="Histórico de vendas" loading={sales.isLoading} error={sales.error} empty={saleRows.length === 0}>
          <table className="w-full min-w-[760px] text-left text-sm"><TableHead labels={["Data", "Empresa", "QR Code", "Vendedor", "Valor", "Status"]} /><tbody>
            {saleRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.sold_at)}</Cell><Cell strong>{item.company_name}</Cell><Cell>{item.qr_code}</Cell><Cell>{item.seller_name}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.payment_status} /></Cell></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="assinaturas"><DataPanel title="Assinaturas anuais" loading={subs.isLoading} error={subs.error} empty={(subs.data ?? []).length === 0}>
          <table className="w-full min-w-[620px] text-left text-sm"><TableHead labels={["Empresa", "Vencimento", "Situação", "Valor"]} /><tbody>
            {(subs.data ?? []).map((item: any) => <tr key={item.id} className="border-t border-border"><Cell strong>{item.company_name}</Cell><Cell>{dateBR(item.expires_at)}</Cell><Cell><Status value={item.active ? "active" : "expired"} /></Cell><Cell>{brl(item.amount)}</Cell></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="pagamentos"><DataPanel title="Pagamentos" loading={payments.isLoading} error={payments.error} empty={paymentRows.length === 0}>
          <table className="w-full min-w-[760px] text-left text-sm"><TableHead labels={["Data", "Empresa", "Tipo", "Valor", "Status", "Ação"]} /><tbody>
            {paymentRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.created_at)}</Cell><Cell strong>{item.company_name}</Cell><Cell>{KIND_LABELS[item.kind] ?? item.kind}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.status} /></Cell><Cell>{item.status === "pending" ? <Button variant="outline" size="sm" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(item.id)}><CircleDollarSign /> Confirmar</Button> : "—"}</Cell></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="comissoes"><DataPanel title="Comissões dos vendedores" loading={commissions.isLoading} error={commissions.error} empty={commissionRows.length === 0}>
          <table className="w-full min-w-[760px] text-left text-sm"><TableHead labels={["Data", "Vendedor", "Origem", "Valor", "Status", "Ação"]} /><tbody>
            {commissionRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.created_at)}</Cell><Cell strong>{item.seller_name}</Cell><Cell>{KIND_LABELS[item.kind] ?? item.kind}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.status} /></Cell><Cell>{item.status === "pending" ? <Button variant="outline" size="sm" disabled={payMutation.isPending} onClick={() => payMutation.mutate(item.id)}><HandCoins /> Marcar paga</Button> : "—"}</Cell></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ icon: Icon, label, value, loading }: { icon: typeof ShoppingBag; label: string; value: string; loading: boolean }) {
  return <div className="surface-card p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 font-display text-2xl font-bold">{loading ? "—" : value}</p></div>;
}

function DataPanel({ title, loading, error, empty, children }: { title: string; loading: boolean; error: Error | null; empty: boolean; children: React.ReactNode }) {
  return <section className="surface-card mt-4 overflow-hidden"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="font-display text-lg font-bold">{title}</h2>{loading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}</div>{error ? <p className="p-6 text-sm text-destructive">Não foi possível carregar estes dados.</p> : !loading && empty ? <p className="p-6 text-sm text-muted-foreground">Nenhum registro encontrado.</p> : <div className="overflow-x-auto">{children}</div>}</section>;
}

function TableHead({ labels }: { labels: string[] }) {
  return <thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr>{labels.map((label, index) => <th key={label} className={index === 0 ? "px-5 py-3" : "py-3 pr-5"}>{label}</th>)}</tr></thead>;
}

function Cell({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-5 py-3 ${strong ? "font-semibold" : ""}`}>{children}</td>;
}

function Status({ value }: { value: string }) {
  const positive = value === "paid" || value === "active";
  const negative = value === "failed" || value === "expired";
  const label = value === "active" ? "Ativa" : value === "expired" ? "Vencida" : PAYMENT_LABELS[value] ?? value;
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${positive ? "bg-success/10 text-success" : negative ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground"}`}>{label}</span>;
}