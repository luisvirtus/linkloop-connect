import { RecordsTable } from "@/components/records-table";
import { SystemEditor, SystemPageHeading } from "@/components/system-page";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { deleteAdminRecord, listSellers, saveSeller } from "@/lib/admin.functions";
import { ContactFields } from "@/components/contact-fields";
import { emptyContact } from "@/lib/registration";
import { sellerFormSchema, sellerFieldErrors } from "@/lib/seller-validation";
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
  const [form, setForm] = useState({ id: "", name: "", email: "", phone: "", contact: emptyContact, active: true });
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "sellers"],
    queryFn: () => fetchSellers({ data: {} } as never),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: (res) => {
      toast.success(res.linkedUser ? "Vendedor salvo e vinculado ao acesso." : "Vendedor salvo. Ele aparece no painel quando entrar com esse e-mail.");
      setForm({ id: "", name: "", email: "", phone: "", contact: emptyContact, active: true });
      setShowForm(false);
      setErrors({});
      setSaveError("");
      qc.invalidateQueries({ queryKey: ["admin", "sellers"] });
    },
    onError: (e: Error) => { setSaveError(e.message); toast.error(e.message); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { entity: "sellers", id } }),
    onSuccess: (res) => { toast.success(res.deactivated ? "Vendedor desativado; histórico preservado." : "Vendedor excluído."); qc.invalidateQueries({ queryKey: ["admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const edit = (s: any) => { setErrors({}); setSaveError(""); setForm({ id: s.id, name: s.name, email: s.email ?? "", phone: s.phone ?? "", contact: { ...emptyContact, ...s.contact }, active: s.active }); setShowForm(true); };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError("");
    const result = sellerFormSchema.safeParse(form);
    if (!result.success) {
      const nextErrors = sellerFieldErrors(result.error);
      setErrors(nextErrors);
      toast.error("Confira os campos obrigatórios destacados.");
      const firstField = Object.keys(nextErrors)[0];
      const field = firstField ? event.currentTarget.elements.namedItem(firstField) : null;
      if (field instanceof HTMLElement) field.focus();
      return;
    }
    setErrors({});
    saveMutation.mutate({ ...form, ...result.data, phone: result.data.contact.whatsapp });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><SystemPageHeading title="Vendedores" count={data?.length ?? 0} /><Button onClick={() => { setErrors({}); setSaveError(""); setForm({ id: "", name: "", email: "", phone: "", contact: emptyContact, active: true }); setShowForm(true); }}><Plus /> Incluir vendedor</Button></div>
      <SystemEditor open={showForm} title={form.id ? "Alterar vendedor" : "Novo vendedor"} onClose={() => setShowForm(false)}><form noValidate onSubmit={submit} className="surface-card p-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">{form.id ? "Alterar vendedor" : "Novo vendedor"}</h2><Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={() => setShowForm(false)}><X /></Button></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-semibold"><span>Nome <span className="text-destructive">*</span></span><input name="name" required aria-invalid={!!errors["name"]} aria-describedby={errors["name"] ? "seller-name-error" : undefined} className={`input ${errors["name"] ? "border-destructive ring-1 ring-destructive" : ""}`} maxLength={120} placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />{errors["name"] ? <span id="seller-name-error" className="text-xs font-normal text-destructive">{errors["name"]}</span> : null}</label>
          <label className="grid gap-1 text-sm font-semibold"><span>E-mail de acesso <span className="text-destructive">*</span></span><input name="email" required aria-invalid={!!errors["email"]} aria-describedby={errors["email"] ? "seller-email-error" : undefined} className={`input ${errors["email"] ? "border-destructive ring-1 ring-destructive" : ""}`} type="email" maxLength={255} placeholder="E-mail de acesso" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />{errors["email"] ? <span id="seller-email-error" className="text-xs font-normal text-destructive">{errors["email"]}</span> : null}</label>
        </div>
        <div className="mt-4"><ContactFields showRequired errors={errors} value={form.contact} onChange={contact => setForm({ ...form, contact })} /></div>
        {saveError ? <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p> : null}
        <Button className="mt-4" type="submit"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Salvando..." : form.id ? "Salvar alterações" : "Incluir vendedor"}
        </Button>
      </form></SystemEditor>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Vendedores</h2>
        {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : null}
        <div className="mt-4 overflow-x-auto">
          <RecordsTable><table className="w-full min-w-[700px] text-left text-sm">
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
                  <td><div className="flex gap-1"><Button variant="ghost" size="icon" title="Alterar vendedor" aria-label={`Alterar ${s.name}`} onClick={() => edit(s)}><Pencil /></Button><Button variant="ghost" size="icon" title="Excluir vendedor" aria-label={`Excluir ${s.name}`} disabled={deleteMutation.isPending} onClick={() => { if (window.confirm(`Excluir definitivamente ${s.name}? Se houver histórico, ele será apenas desativado.`)) deleteMutation.mutate(s.id); }}><Trash2 className="text-destructive" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table></RecordsTable>
        </div>
      </div>
    </div>
  );
}
