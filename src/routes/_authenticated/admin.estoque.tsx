import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createBatch, deleteAdminRecord, listBatches, listPlates, unlinkPlate, updatePlate } from "@/lib/admin.functions";
import { brl, dateBR, PLATE_SIZE_LABEL, PLATE_STATUS_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Printer, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  head: () => ({ meta: [
    { title: "Estoque — Plaquinhas QR" },
    { name: "description", content: "Lotes, códigos QR, custos e situação das plaquinhas." },
    { property: "og:title", content: "Estoque — Plaquinhas QR" },
    { property: "og:description", content: "Controle de estoque e geração de lotes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Stock,
});

type PlateStatus = "available" | "reserved" | "sold" | "linked" | "donated" | "lost" | "blocked" | "cancelled";
const STATUSES: PlateStatus[] = ["available", "reserved", "sold", "linked", "donated", "lost", "blocked", "cancelled"];

function Stock() {
  const qc = useQueryClient();
  const fetchPlates = useServerFn(listPlates);
  const fetchBatches = useServerFn(listBatches);
  const create = useServerFn(createBatch);
  const update = useServerFn(updatePlate);
  const unlink = useServerFn(unlinkPlate);
  const remove = useServerFn(deleteAdminRecord);

  const [status, setStatus] = useState<PlateStatus | "">("");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState({ label: "", quantity: 100, size: "medium", unitCost: 0, sellerId: "" });
  const [showBatch, setShowBatch] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plates", status, search],
    queryFn: () => fetchPlates({ data: { status: status || null, search: search || null } }),
  });
  const batches = useQuery({ queryKey: ["admin", "batches"], queryFn: () => fetchBatches({ data: {} } as never) });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const batchMutation = useMutation({
    mutationFn: () =>
      create({
        data: {
          label: batch.label,
          quantity: Number(batch.quantity),
          size: batch.size,
          unitCost: Number(batch.unitCost),
          sellerId: batch.sellerId || null,
        },
      }),
    onSuccess: (res) => {
      toast.success(`${res.codes.length} plaquinhas geradas.`);
      setShowBatch(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: ({ entity, id }: { entity: "plates" | "batches"; id: string }) => remove({ data: { entity, id } }),
    onSuccess: () => { toast.success("Registro excluído definitivamente."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) => update({ data: payload }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: (plateId: string) => unlink({ data: { plateId } }),
    onSuccess: () => {
      toast.success("Plaquinha desvinculada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="font-display text-2xl font-bold">Estoque</h1><Button onClick={() => setShowBatch(true)}><Plus /> Incluir lote</Button></div>
      {showBatch ? <div className="surface-card p-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Gerar lote</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setShowBatch(false)}><X /></Button></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Nome do lote"><input className="input" maxLength={100} placeholder="Ex.: Produção outubro" value={batch.label} onChange={(e) => setBatch({ ...batch, label: e.target.value })} /></Field>
          <Field label="Quantidade"><input className="input" type="number" min={1} max={2000} value={batch.quantity} onChange={(e) => setBatch({ ...batch, quantity: Number(e.target.value) })} /></Field>
          <Field label="Tamanho"><select className="input" value={batch.size} onChange={(e) => setBatch({ ...batch, size: e.target.value })}>
            <option value="small">Pequena 10x10</option>
            <option value="medium">Média 15x15</option>
            <option value="large">Grande 20x20</option>
          </select></Field>
          <Field label="Custo unitário"><input className="input" type="number" min={0} step="0.01" placeholder="R$ 0,00" value={batch.unitCost} onChange={(e) => setBatch({ ...batch, unitCost: Number(e.target.value) })} /></Field>
          <Field label="Vendedor responsável"><select className="input" value={batch.sellerId} onChange={(e) => setBatch({ ...batch, sellerId: e.target.value })}>
            <option value="">Sem vendedor</option>
            {(data?.sellers ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select></Field>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">O vendedor selecionado será atribuído a todas as plaquinhas deste lote e ficará vinculado à comissão quando elas forem vendidas.</p>
        <Button className="mt-4"
          disabled={batchMutation.isPending}
          onClick={() => batchMutation.mutate()}
        >
          {batchMutation.isPending ? "Gerando..." : "Gerar plaquinhas"}
        </Button>
      </div> : null}

      {editing ? <section className="surface-card p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Alterar plaquinha {editing.qr_code}</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setEditing(null)}><X /></Button></div><div className="mt-4 grid gap-3 sm:grid-cols-4"><select className="input" value={editing.status} onChange={e => setEditing({ ...editing, status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{PLATE_STATUS_LABEL[s]}</option>)}</select><select className="input" value={editing.seller_id ?? ""} onChange={e => setEditing({ ...editing, seller_id: e.target.value })}><option value="">Sem vendedor</option>{(data?.sellers ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><input className="input" type="number" min="0" step="0.01" placeholder="Custo" value={editing.cost} onChange={e => setEditing({ ...editing, cost: Number(e.target.value) })} /><input className="input" type="number" min="0" step="0.01" placeholder="Preço" value={editing.price ?? ""} onChange={e => setEditing({ ...editing, price: e.target.value === "" ? null : Number(e.target.value) })} /></div><textarea className="input mt-3 min-h-24" maxLength={1000} placeholder="Observações" value={editing.notes ?? ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} /><Button className="mt-3" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ plateId: editing.id, status: editing.status, sellerId: editing.seller_id || null, cost: editing.cost, price: editing.price, notes: editing.notes }, { onSuccess: () => { toast.success("Plaquinha alterada."); setEditing(null); } })}>Salvar alterações</Button></section> : null}

      <section className="surface-card p-6"><h2 className="font-display text-lg font-bold">Lotes</h2>{batches.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Carregando...</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Nome</th><th>Quantidade</th><th>Tamanho</th><th>Custo unitário</th><th>Criado</th><th>Ações</th></tr></thead><tbody>{(batches.data ?? []).map((item: any) => <tr key={item.id} className="border-t border-border"><td className="py-3 font-semibold">{item.label}</td><td>{item.quantity}</td><td>{PLATE_SIZE_LABEL[item.size]}</td><td>{brl(item.unit_cost)}</td><td>{dateBR(item.created_at)}</td><td><Button variant="ghost" size="icon" aria-label={`Excluir lote ${item.label}`} title="Excluir lote" onClick={() => { if (window.confirm(`Excluir definitivamente o lote ${item.label}? As plaquinhas serão mantidas sem lote.`)) deleteMutation.mutate({ entity: "batches", id: item.id }); }}><Trash2 className="text-destructive" /></Button></td></tr>)}</tbody></table></div>}</section>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Plaquinhas</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input" placeholder="Buscar código" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as PlateStatus | "")}>
              <option value="">Todos os status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{PLATE_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <Link to="/admin/impressao" className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              Artes para impressão
            </Link>
          </div>
        </div>

        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">#</th>
                <th>Código</th>
                <th>Tamanho</th>
                <th>Status</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Custo</th>
                <th>Gerada</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data?.plates ?? []).map((p: any) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">{p.serial}</td>
                  <td className="font-semibold">{p.qr_code}</td>
                  <td>{PLATE_SIZE_LABEL[p.size]}</td>
                  <td>
                    <select
                      className="input py-1"
                      value={p.status}
                      onChange={(e) => updateMutation.mutate({ plateId: p.id, status: e.target.value })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{PLATE_STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td>{p.company_name ?? "—"}</td>
                  <td>
                    <select
                      className="input py-1"
                      value={p.seller_id ?? ""}
                      onChange={(e) => updateMutation.mutate({ plateId: p.id, sellerId: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {(data?.sellers ?? []).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>{brl(p.cost)}</td>
                  <td>{dateBR(p.generated_at)}</td>
                  <td className="space-x-2 whitespace-nowrap">
                     <Button asChild variant="ghost" size="icon" title={`Imprimir ${p.qr_code}`} aria-label={`Imprimir ${p.qr_code}`}><Link to="/imprimir/$plateId" params={{ plateId: p.id }}><Printer /></Link></Button>
                    <Button variant="ghost" size="icon" title="Alterar plaquinha" aria-label={`Alterar ${p.qr_code}`} onClick={() => setEditing(p)}><Pencil /></Button>
                    <Button variant="link" size="sm"
                      onClick={() => updateMutation.mutate({ plateId: p.id, blockedByAdmin: !p.blocked_by_admin })}
                    >
                      {p.blocked_by_admin ? "Desbloquear" : "Bloquear"}
                    </Button>
                    {p.company_id ? (
                      <Button variant="link" size="sm" className="text-destructive" onClick={() => unlinkMutation.mutate(p.id)}>
                        Desvincular
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" title="Excluir plaquinha" aria-label={`Excluir ${p.qr_code}`} onClick={() => { if (window.confirm(`Excluir definitivamente a plaquinha ${p.qr_code}? A página e a venda vinculadas também serão apagadas.`)) deleteMutation.mutate({ entity: "plates", id: p.id }); }}><Trash2 className="text-destructive" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold"><span>{label}</span>{children}</label>;
}
