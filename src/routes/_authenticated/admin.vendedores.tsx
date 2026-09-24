import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { deleteAdminRecord, listSellers, saveSeller } from "@/lib/admin.functions";
import { brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/vendedores")({
  head: () => ({ meta: [
    { title: "Vendedores — Plaquinhas QR" },
    { name: "description", content: "Cadastro de vendedores, vendas e comissões." },
    { property: "og:title", content: "Vendedores — Plaquinhas QR" },
    { property: "og:description", content: "Gestão da equipe comercial." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Sellers,
});

function Sellers() {
  const qc = useQueryClient();
  const fetchSellers = useServerFn(listSellers);
  const save = useServerFn(saveSeller);
  const remove = useServerFn(deleteAdminRecord);
  const [form, setForm] = useState({ id: "", name: "", email: "", phone: "", active: true });
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sellers"],
    queryFn: () => fetchSellers({ data: {} } as never),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.linkedUser ? "Vendedor salvo e vinculado ao acesso." : "Vendedor salvo. Ele aparece no painel quando entrar com esse e-mail.");
      setForm({ id: "", name: "", email: "", phone: "", active: true });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { entity: "sellers", id } }),
    onSuccess: () => { toast.success("Vendedor excluído definitivamente."); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const edit = (s: any) => { setForm({ id: s.id, name: s.name, email: s.email ?? "", phone: s.phone ?? "", active: s.active }); setShowForm(true); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-bold">Vendedores</h1><Button onClick={() => { setForm({ id: "", name: "", email: "", phone: "", active: true }); setShowForm(true); }}><Plus /> Incluir vendedor</Button></div>
      {showForm ? <div className="surface-card p-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{form.id ? "Alterar vendedor" : "Novo vendedor"}</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setShowForm(false)}><X /></Button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="input" maxLength={120} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" type="email" maxLength={255} placeholder="E-mail de acesso" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" inputMode="tel" maxLength={30} placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <Button className="mt-4"
          disabled={!form.name || saveMutation.isPending}
          onClick={() => saveMutation.mutate(form)}
        >
          {form.id ? "Salvar alterações" : "Incluir vendedor"}
        </Button>
      </div> : null}

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
                <th>Situação</th><th>Ações</th>
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
                    <Button variant="link" size="sm"
                      onClick={() => saveMutation.mutate({ id: s.id, name: s.name, email: s.email, phone: s.phone, active: !s.active })}
                    >
                      {s.active ? "Ativo" : "Inativo"}
                    </Button>
                  </td>
                  <td><div className="flex gap-1"><Button variant="ghost" size="icon" title="Alterar vendedor" aria-label={`Alterar ${s.name}`} onClick={() => edit(s)}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir vendedor" aria-label={`Excluir ${s.name}`} disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Excluir definitivamente ${s.name}? As comissões vinculadas também serão apagadas.`)) deleteMutation.mutate(s.id); }}><Trash2 className="text-destructive" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
