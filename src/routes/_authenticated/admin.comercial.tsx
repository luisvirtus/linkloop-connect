import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, CircleDollarSign, Clock3, HandCoins, ReceiptText, RefreshCw, ShoppingBag } from "lucide-react";
import { listSales, listSubscriptions, listPayments, confirmPayment, listCommissions, payCommission } from "@/lib/admin.functions";
import { brl, dateBR } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteAdminRecord, listAdminOptions, saveCommercialRecord } from "@/lib/admin.functions";

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
type CommercialEntity = "sales" | "subscriptions" | "payments" | "commissions";

function Commercial() {
  const qc = useQueryClient();
  const fetchSales = useServerFn(listSales);
  const fetchSubs = useServerFn(listSubscriptions);
  const fetchPayments = useServerFn(listPayments);
  const fetchCommissions = useServerFn(listCommissions);
  const confirm = useServerFn(confirmPayment);
  const pay = useServerFn(payCommission);
  const fetchOptions = useServerFn(listAdminOptions);
  const saveRecord = useServerFn(saveCommercialRecord);
  const remove = useServerFn(deleteAdminRecord);
  const [editor, setEditor] = useState<{ entity: CommercialEntity; id: string; values: Record<string, any> } | null>(null);

  const sales = useQuery({ queryKey: ["admin", "sales"], queryFn: () => fetchSales({ data: {} } as never) });
  const subs = useQuery({ queryKey: ["admin", "subs"], queryFn: () => fetchSubs({ data: {} } as never) });
  const payments = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fetchPayments({ data: {} } as never) });
  const commissions = useQuery({ queryKey: ["admin", "commissions"], queryFn: () => fetchCommissions({ data: {} } as never) });
  const options = useQuery({ queryKey: ["admin", "options"], queryFn: () => fetchOptions({ data: {} } as never) });

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
  const saveMutation = useMutation({ mutationFn: () => editor ? saveRecord({ data: { entity: editor.entity, id: editor.id || null, values: editor.values } }) : Promise.reject(new Error("Registro inválido.")), onSuccess: () => { toast.success(editor?.id ? "Registro alterado." : "Registro incluído."); setEditor(null); qc.invalidateQueries({ queryKey: ["admin"] }); }, onError: (e: Error) => toast.error(e.message) });
  const deleteMutation = useMutation({ mutationFn: ({ entity, id }: { entity: CommercialEntity; id: string }) => remove({ data: { entity, id } }), onSuccess: () => { toast.success("Registro excluído definitivamente."); qc.invalidateQueries({ queryKey: ["admin"] }); }, onError: (e: Error) => toast.error(e.message) });
  const openNew = (entity: CommercialEntity) => setEditor({ entity, id: "", values: defaultValues(entity) });
  const openEdit = (entity: CommercialEntity, item: any) => setEditor({ entity, id: item.id, values: { ...item, sold_at: localDate(item.sold_at), starts_at: localDate(item.starts_at), expires_at: localDate(item.expires_at), paid_at: localDate(item.paid_at) } });
  const exclude = (entity: CommercialEntity, id: string) => { if (window.confirm("Excluir este registro definitivamente? Os totais financeiros serão recalculados e a ação não poderá ser desfeita.")) deleteMutation.mutate({ entity, id }); };

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

      {editor ? <CommercialEditor editor={editor} setEditor={setEditor} options={options.data} pending={saveMutation.isPending} onSave={() => saveMutation.mutate()} onClose={() => setEditor(null)} /> : null}

      <Tabs defaultValue="vendas">
        <div className="overflow-x-auto pb-1">
          <TabsList className="min-w-max">
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
            <TabsTrigger value="comissoes">Comissões</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="vendas"><DataPanel title="Histórico de vendas" action={<Button size="sm" onClick={() => openNew("sales")}><Plus /> Incluir venda</Button>} loading={sales.isLoading} error={sales.error} empty={saleRows.length === 0}>
          <table className="w-full min-w-[860px] text-left text-sm"><TableHead labels={["Data", "Empresa", "QR Code", "Vendedor", "Valor", "Status", "Ações"]} /><tbody>
            {saleRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.sold_at)}</Cell><Cell strong>{item.company_name}</Cell><Cell>{item.qr_code}</Cell><Cell>{item.seller_name}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.payment_status} /></Cell><ActionCell onEdit={() => openEdit("sales", item)} onDelete={() => exclude("sales", item.id)} /></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="assinaturas"><DataPanel title="Assinaturas anuais" action={<Button size="sm" onClick={() => openNew("subscriptions")}><Plus /> Incluir assinatura</Button>} loading={subs.isLoading} error={subs.error} empty={(subs.data ?? []).length === 0}>
          <table className="w-full min-w-[720px] text-left text-sm"><TableHead labels={["Empresa", "Vencimento", "Situação", "Valor", "Ações"]} /><tbody>
            {(subs.data ?? []).map((item: any) => <tr key={item.id} className="border-t border-border"><Cell strong>{item.company_name}</Cell><Cell>{dateBR(item.expires_at)}</Cell><Cell><Status value={item.active ? "active" : "expired"} /></Cell><Cell>{brl(item.amount)}</Cell><ActionCell onEdit={() => openEdit("subscriptions", item)} onDelete={() => exclude("subscriptions", item.id)} /></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="pagamentos"><DataPanel title="Pagamentos" action={<Button size="sm" onClick={() => openNew("payments")}><Plus /> Incluir pagamento</Button>} loading={payments.isLoading} error={payments.error} empty={paymentRows.length === 0}>
          <table className="w-full min-w-[900px] text-left text-sm"><TableHead labels={["Data", "Empresa", "Tipo", "Valor", "Status", "Operação", "Ações"]} /><tbody>
            {paymentRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.created_at)}</Cell><Cell strong>{item.company_name}</Cell><Cell>{KIND_LABELS[item.kind] ?? item.kind}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.status} /></Cell><Cell>{item.status === "pending" ? <Button variant="outline" size="sm" disabled={confirmMutation.isPending} onClick={() => confirmMutation.mutate(item.id)}><CircleDollarSign /> Confirmar</Button> : "—"}</Cell><ActionCell onEdit={() => openEdit("payments", item)} onDelete={() => exclude("payments", item.id)} /></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>

        <TabsContent value="comissoes"><DataPanel title="Comissões dos vendedores" action={<Button size="sm" onClick={() => openNew("commissions")}><Plus /> Incluir comissão</Button>} loading={commissions.isLoading} error={commissions.error} empty={commissionRows.length === 0}>
          <table className="w-full min-w-[900px] text-left text-sm"><TableHead labels={["Data", "Vendedor", "Origem", "Valor", "Status", "Operação", "Ações"]} /><tbody>
            {commissionRows.map((item: any) => <tr key={item.id} className="border-t border-border"><Cell>{dateBR(item.created_at)}</Cell><Cell strong>{item.seller_name}</Cell><Cell>{KIND_LABELS[item.kind] ?? item.kind}</Cell><Cell>{brl(item.amount)}</Cell><Cell><Status value={item.status} /></Cell><Cell>{item.status === "pending" ? <Button variant="outline" size="sm" disabled={payMutation.isPending} onClick={() => payMutation.mutate(item.id)}><HandCoins /> Marcar paga</Button> : "—"}</Cell><ActionCell onEdit={() => openEdit("commissions", item)} onDelete={() => exclude("commissions", item.id)} /></tr>)}
          </tbody></table>
        </DataPanel></TabsContent>
      </Tabs>
    </div>
  );
}

function Summary({ icon: Icon, label, value, loading }: { icon: typeof ShoppingBag; label: string; value: string; loading: boolean }) {
  return <div className="surface-card p-5"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary" /></div><p className="mt-3 font-display text-2xl font-bold">{loading ? "—" : value}</p></div>;
}

function DataPanel({ title, action, loading, error, empty, children }: { title: string; action?: React.ReactNode; loading: boolean; error: Error | null; empty: boolean; children: React.ReactNode }) {
  return <section className="surface-card mt-4 overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4"><h2 className="font-display text-lg font-bold">{title}</h2><div className="flex items-center gap-2">{loading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}{action}</div></div>{error ? <p className="p-6 text-sm text-destructive">Não foi possível carregar estes dados.</p> : !loading && empty ? <div className="p-6 text-sm text-muted-foreground"><p>Nenhum registro encontrado.</p><div className="mt-3">{action}</div></div> : <div className="overflow-x-auto">{children}</div>}</section>;
}

function ActionCell({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <Cell><div className="flex gap-1"><Button variant="ghost" size="icon" title="Alterar" aria-label="Alterar" onClick={onEdit}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir" aria-label="Excluir" onClick={onDelete}><Trash2 className="text-destructive" /></Button></div></Cell>; }

function localDate(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }
function defaultValues(entity: CommercialEntity) { const today = new Date().toISOString().slice(0, 10); const next = new Date(); next.setFullYear(next.getFullYear() + 1); if (entity === "sales") return { company_id: "", plate_id: "", seller_id: "", amount: 0, cost: 0, payment_method: "", payment_status: "pending", sold_at: today }; if (entity === "subscriptions") return { company_id: "", plate_id: "", starts_at: today, expires_at: next.toISOString().slice(0, 10), amount: 0, status: "active" }; if (entity === "payments") return { company_id: "", subscription_id: "", sale_id: "", kind: "plate", amount: 0, status: "pending", stripe_reference: "" }; return { seller_id: "", kind: "sale", sale_id: "", subscription_id: "", base_amount: 0, percent: 0, amount: 0, status: "pending" }; }

function CommercialEditor({ editor, setEditor, options, pending, onSave, onClose }: { editor: { entity: CommercialEntity; id: string; values: Record<string, any> }; setEditor: (value: any) => void; options: any; pending: boolean; onSave: () => void; onClose: () => void }) {
  const v = editor.values; const set = (key: string, value: any) => setEditor({ ...editor, values: { ...v, [key]: value } });
  const company = <select className="input" aria-label="Empresa" value={v.company_id ?? ""} onChange={e => set("company_id", e.target.value)}><option value="">Selecione a empresa</option>{(options?.companies ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>;
  const plate = <select className="input" aria-label="Plaquinha" value={v.plate_id ?? ""} onChange={e => set("plate_id", e.target.value)}><option value="">Selecione a plaquinha</option>{(options?.plates ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.qr_code}</option>)}</select>;
  const seller = <select className="input" aria-label="Vendedor" value={v.seller_id ?? ""} onChange={e => set("seller_id", e.target.value)}><option value="">Selecione o vendedor</option>{(options?.sellers ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>;
  return <section className="surface-card p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{editor.id ? "Alterar" : "Incluir"} {({ sales: "venda", subscriptions: "assinatura", payments: "pagamento", commissions: "comissão" } as const)[editor.entity]}</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={onClose}><X /></Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{editor.entity === "sales" ? <>{company}{plate}{seller}<Money label="Valor" value={v.amount} set={x => set("amount", x)} /><Money label="Custo" value={v.cost} set={x => set("cost", x)} /><input className="input" maxLength={80} placeholder="Forma de pagamento" value={v.payment_method ?? ""} onChange={e => set("payment_method", e.target.value)} /><StatusSelect value={v.payment_status} set={x => set("payment_status", x)} /><input className="input" aria-label="Data da venda" type="date" value={v.sold_at ?? ""} onChange={e => set("sold_at", e.target.value)} /></> : editor.entity === "subscriptions" ? <>{company}{plate}<input className="input" aria-label="Início" type="date" value={v.starts_at ?? ""} onChange={e => set("starts_at", e.target.value)} /><input className="input" aria-label="Vencimento" type="date" value={v.expires_at ?? ""} onChange={e => set("expires_at", e.target.value)} /><Money label="Valor" value={v.amount} set={x => set("amount", x)} /><select className="input" aria-label="Situação" value={v.status} onChange={e => set("status", e.target.value)}><option value="active">Ativa</option><option value="expired">Vencida</option><option value="cancelled">Cancelada</option></select></> : editor.entity === "payments" ? <>{company}<select className="input" aria-label="Tipo" value={v.kind} onChange={e => set("kind", e.target.value)}><option value="plate">Plaquinha</option><option value="subscription">Assinatura</option><option value="renewal">Renovação</option></select><Money label="Valor" value={v.amount} set={x => set("amount", x)} /><StatusSelect value={v.status} set={x => set("status", x)} /><input className="input" maxLength={200} placeholder="Referência" value={v.stripe_reference ?? ""} onChange={e => set("stripe_reference", e.target.value)} /></> : <>{seller}<select className="input" aria-label="Origem" value={v.kind} onChange={e => set("kind", e.target.value)}><option value="sale">Venda</option><option value="renewal">Renovação</option></select><Money label="Valor base" value={v.base_amount} set={x => set("base_amount", x)} /><Money label="Percentual" value={v.percent} set={x => set("percent", x)} /><Money label="Comissão" value={v.amount} set={x => set("amount", x)} /><select className="input" aria-label="Situação" value={v.status} onChange={e => set("status", e.target.value)}><option value="pending">Pendente</option><option value="paid">Paga</option><option value="cancelled">Cancelada</option></select></>}</div><Button className="mt-4" disabled={pending} onClick={onSave}>Salvar</Button></section>;
}
function Money({ label, value, set }: { label: string; value: any; set: (value: number) => void }) { return <input className="input" aria-label={label} type="number" min="0" step="0.01" placeholder={label} value={value ?? 0} onChange={e => set(Number(e.target.value))} />; }
function StatusSelect({ value, set }: { value: string; set: (value: string) => void }) { return <select className="input" aria-label="Status" value={value} onChange={e => set(e.target.value)}><option value="pending">Pendente</option><option value="paid">Pago</option><option value="failed">Falhou</option><option value="refunded">Reembolsado</option></select>; }

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