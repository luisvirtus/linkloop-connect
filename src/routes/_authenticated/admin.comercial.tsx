import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listSales, listSubscriptions, listPayments, confirmPayment, listCommissions, payCommission } from "@/lib/admin.functions";
import { brl, dateBR } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin/comercial")({
  component: Commercial,
});

function Commercial() {
  const qc = useQueryClient();
  const fetchSales = useServerFn(listSales);
  const fetchSubs = useServerFn(listSubscriptions);
  const fetchPayments = useServerFn(listPayments);
  const fetchCommissions = useServerFn(listCommissions);
  const confirm = useServerFn(confirmPayment);
  const pay = useServerFn(payCommission);

  const sales = useQuery({ queryKey: ["admin", "sales"], queryFn: () => fetchSales({ data: {} } as any) });
  const subs = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fetchSubs({ data: {} } as any) });
  const payments = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchPayments({ data: {} } as any) });
  const commissions = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => fetchCommissions({ data: {} } as any) });

  const confirmMutation = useMutation({
    mutationFn: (paymentId: string) => confirm({ data: { paymentId } }),
    onSuccess: () => {
      toast.success("Pagamento confirmado.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMutation = useMutation({
    mutationFn: (id: string) => pay({ data: { id } }),
    onSuccess: () => {
      toast.success("Comissão marcada como paga.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="surface-card mt-4 p-6">
          <h2 className="font-display text-lg font-bold">Histórico de Vendas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Data</th>
                  <th>Empresa</th>
                  <th>QR Code</th>
                  <th>Vendedor</th>
                  <th>Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(sales.data ?? []).map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2">{dateBR(s.sold_at)}</td>
                    <td className="font-semibold">{s.company_name}</td>
                    <td>{s.qr_code}</td>
                    <td>{s.seller_name}</td>
                    <td>{brl(s.amount)}</td>
                    <td>{s.payment_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="assinaturas" className="surface-card mt-4 p-6">
          <h2 className="font-display text-lg font-bold">Assinaturas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th>Empresa</th>
                  <th>Expira em</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {(subs.data ?? []).map((s: any) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-2 font-semibold">{s.company_name}</td>
                    <td>{dateBR(s.expires_at)}</td>
                    <td>{s.active ? "Ativa" : "Vencida"}</td>
                    <td>{brl(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="pagamentos" className="surface-card mt-4 p-6">
          <h2 className="font-display text-lg font-bold">Pagamentos Pendentes e Recebidos</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th>Data</th>
                  <th>Empresa</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(payments.data ?? []).map((p: any) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2">{dateBR(p.created_at)}</td>
                    <td>{p.company_name}</td>
                    <td>{p.kind}</td>
                    <td>{brl(p.amount)}</td>
                    <td>{p.status}</td>
                    <td>
                      {p.status === "pending" && (
                        <button
                          className="text-xs font-semibold text-primary"
                          onClick={() => confirmMutation.mutate(p.id)}
                        >
                          Confirmar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="comissoes" className="surface-card mt-4 p-6">
          <h2 className="font-display text-lg font-bold">Comissões de Vendedores</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th>Data</th>
                  <th>Vendedor</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(commissions.data ?? []).map((c: any) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="py-2">{dateBR(c.created_at)}</td>
                    <td>{c.seller_name}</td>
                    <td>{c.kind}</td>
                    <td>{brl(c.amount)}</td>
                    <td>{c.status}</td>
                    <td>
                      {c.status === "pending" && (
                        <button
                          className="text-xs font-semibold text-primary"
                          onClick={() => payMutation.mutate(c.id)}
                        >
                          Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
