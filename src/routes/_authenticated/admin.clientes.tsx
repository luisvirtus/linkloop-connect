import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteAdminRecord, listAdminOptions, listCompanies, saveCompany } from "@/lib/admin.functions";
import { dateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LogIn, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — Plaquinhas QR" },
    { name: "description", content: "Clientes, plaquinhas vinculadas e assinaturas." },
    { property: "og:title", content: "Clientes — Plaquinhas QR" },
    { property: "og:description", content: "Gestão de clientes e assinaturas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Clients,
});

function Clients() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchCompanies = useServerFn(listCompanies);
  const fetchOptions = useServerFn(listAdminOptions);
  const save = useServerFn(saveCompany);
  const remove = useServerFn(deleteAdminRecord);
  const [form, setForm] = useState({ id: "", name: "", ownerId: "", websiteUrl: "" });
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () => fetchCompanies({ data: {} } as never),
  });
  const options = useQuery({ queryKey: ["admin", "options"], queryFn: () => fetchOptions({ data: {} } as never) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const saveMutation = useMutation({
    mutationFn: () => save({ data: { ...form, id: form.id || null } }),
    onSuccess: () => { toast.success(form.id ? "Cliente alterado." : "Cliente incluído."); setShowForm(false); setForm({ id: "", name: "", ownerId: "", websiteUrl: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { entity: "companies", id } }),
    onSuccess: () => { toast.success("Cliente excluído definitivamente."); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const edit = (c: any) => { setForm({ id: c.id, name: c.name, ownerId: c.owner_id, websiteUrl: c.website_url ?? "" }); setShowForm(true); };
  const exclude = (c: any) => { if (window.confirm(`Excluir definitivamente ${c.name}? Plaquinhas, páginas e histórico financeiro vinculados também poderão ser apagados.`)) deleteMutation.mutate(c.id); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-bold">Clientes</h1><Button onClick={() => { setForm({ id: "", name: "", ownerId: "", websiteUrl: "" }); setShowForm(true); }}><Plus /> Incluir cliente</Button></div>
      {showForm ? <section className="surface-card p-6"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{form.id ? "Alterar cliente" : "Novo cliente"}</h2><Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => setShowForm(false)}><X /></Button></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><input className="input" maxLength={120} placeholder="Nome da empresa" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><select className="input" aria-label="Responsável" value={form.ownerId} onChange={e => setForm({ ...form, ownerId: e.target.value })}><option value="">Selecione o responsável</option>{(options.data?.profiles ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>)}</select><input className="input" type="url" maxLength={500} placeholder="Site da empresa" value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} /></div><Button className="mt-4" disabled={!form.name.trim() || !form.ownerId || saveMutation.isPending} onClick={() => saveMutation.mutate()}>{form.id ? "Salvar alterações" : "Incluir cliente"}</Button></section> : null}
      <div className="surface-card p-6">
      <h2 className="font-display text-lg font-bold">Empresas cadastradas</h2>
      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Empresa</th>
              <th>Responsável</th>
              <th>Plaquinhas</th>
              <th>Assinatura</th>
              <th>Desde</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="py-2 font-semibold">{c.name}</td>
                <td>{c.owner_email ?? c.owner_name ?? "—"}</td>
                <td>{c.codes.join(", ") || "—"}</td>
                <td>
                  {c.expires_at ? (
                    <span className={c.active ? "text-primary" : "text-destructive"}>
                      {c.active ? "Ativa" : "Vencida"} até {dateBR(c.expires_at)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{dateBR(c.created_at)}</td>
                <td>
                  <div className="flex gap-1"><Button
                    variant="link"
                    size="sm"
                    onClick={() => navigate({ to: "/admin/cliente/$companyId", params: { companyId: c.id } })}
                  >
                    <LogIn /> Entrar como cliente
                  </Button><Button variant="ghost" size="icon" title="Alterar cliente" aria-label={`Alterar ${c.name}`} onClick={() => edit(c)}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir cliente" aria-label={`Excluir ${c.name}`} disabled={deleteMutation.isPending} onClick={() => exclude(c)}><Trash2 className="text-destructive" /></Button></div>
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
