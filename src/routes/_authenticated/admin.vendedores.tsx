import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { listSellers, saveSeller } from "@/lib/admin.functions";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  component: Sellers,
});

function Sellers() {
  const qc = useQueryClient();
  const fetchSellers = useServerFn(listSellers);
  const save = useServerFn(saveSeller);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sellers"],
    queryFn: () => fetchSellers({ data: {} } as never),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.linkedUser ? "Vendedor salvo e vinculado ao acesso." : "Vendedor salvo. Ele aparece no painel quando entrar com esse e-mail.");
      setForm({ name: "", email: "", phone: "" });
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Novo vendedor</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="E-mail de acesso" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <button
          className="mt-4 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          disabled={!form.name || saveMutation.isPending}
          onClick={() => saveMutation.mutate(form)}
        >
          Salvar vendedor
        </button>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Vendedores</h2>
        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2">Nome</th>
                <th>E-mail</th>
                <th>Vendas</th>
                <th>A receber</th>
                <th>Pago</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((s: any) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="py-2 font-semibold">{s.name}</td>
                  <td>{s.email ?? "—"}</td>
                  <td>{s.sales}</td>
                  <td>{brl(s.pending)}</td>
                  <td>{brl(s.paid)}</td>
                  <td>
                    <button
                      className="text-xs font-semibold text-primary"
                      onClick={() => saveMutation.mutate({ id: s.id, name: s.name, email: s.email, phone: s.phone, active: !s.active })}
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </button>
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
