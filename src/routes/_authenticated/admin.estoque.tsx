import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { createBatch, listPlates, unlinkPlate, updatePlate } from "@/lib/admin.functions";
import { brl, dateBR, PLATE_SIZE_LABEL, PLATE_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/estoque")({
  component: Stock,
});

const STATUSES = ["available", "reserved", "sold", "linked", "donated", "lost", "blocked", "cancelled"];

function Stock() {
  const qc = useQueryClient();
  const fetchPlates = useServerFn(listPlates);
  const create = useServerFn(createBatch);
  const update = useServerFn(updatePlate);
  const unlink = useServerFn(unlinkPlate);

  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");
  const [batch, setBatch] = useState({ label: "", quantity: 100, size: "medium", unitCost: 0, sellerId: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plates", status, search],
    queryFn: () => fetchPlates({ data: { status: status || null, search: search || null } }),
  });

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
      refresh();
    },
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
      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Gerar lote</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          <input className="input" placeholder="Nome do lote" value={batch.label} onChange={(e) => setBatch({ ...batch, label: e.target.value })} />
          <input className="input" type="number" min={1} value={batch.quantity} onChange={(e) => setBatch({ ...batch, quantity: Number(e.target.value) })} />
          <select className="input" value={batch.size} onChange={(e) => setBatch({ ...batch, size: e.target.value })}>
            <option value="small">Pequena 10x10</option>
            <option value="medium">Média 15x15</option>
            <option value="large">Grande 20x20</option>
          </select>
          <input className="input" type="number" step="0.01" placeholder="Custo unitário" value={batch.unitCost} onChange={(e) => setBatch({ ...batch, unitCost: Number(e.target.value) })} />
          <select className="input" value={batch.sellerId} onChange={(e) => setBatch({ ...batch, sellerId: e.target.value })}>
            <option value="">Sem vendedor</option>
            {(data?.sellers ?? []).map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button
          className="mt-4 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          disabled={batchMutation.isPending}
          onClick={() => batchMutation.mutate()}
        >
          {batchMutation.isPending ? "Gerando..." : "Gerar plaquinhas"}
        </button>
      </div>

      <div className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Plaquinhas</h2>
          <div className="flex flex-wrap gap-2">
            <input className="input" placeholder="Buscar código" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
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
                    <button
                      className="text-xs font-semibold text-primary"
                      onClick={() => updateMutation.mutate({ plateId: p.id, blockedByAdmin: !p.blocked_by_admin })}
                    >
                      {p.blocked_by_admin ? "Desbloquear" : "Bloquear"}
                    </button>
                    {p.company_id ? (
                      <button className="text-xs font-semibold text-destructive" onClick={() => unlinkMutation.mutate(p.id)}>
                        Desvincular
                      </button>
                    ) : null}
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
