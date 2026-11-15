import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { deleteAdminRecord, listAdminOptions, listCompanies, saveCompany } from "@/lib/admin.functions";
import { ContactFields } from "@/components/contact-fields";
import { emptyContact, type Contact } from "@/lib/registration";
import { dateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { ArrowDown, ArrowUp, ArrowUpDown, Building2, ChevronLeft, ChevronRight, Columns3, Eye, Loader2, LogIn, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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

type Company = { id: string; name: string; owner_id: string; owner_email: string | null; owner_name: string | null; website_url: string | null; created_at: string; expires_at: string | null; active: boolean; codes: string[]; contact: Partial<Contact> | null };
type Status = "all" | "active" | "expired" | "none";
const statusOf = (c: Company) => !c.expires_at ? "none" : c.active ? "active" : "expired";
const statusLabels = { all: "Todos", active: "Ativa", expired: "Vencida", none: "Sem assinatura" };
const initialForm = { id: "", name: "", ownerId: "", websiteUrl: "", contact: emptyContact };
const columnLabels = { owner: "Responsável", plates: "Plaquinhas", subscription: "Assinatura", since: "Desde" };
type Column = keyof typeof columnLabels;

function SubscriptionStatus({ company }: { company: Company }) {
  const status = statusOf(company);
  return <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${status === "active" ? "bg-success/10 text-success" : status === "expired" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}><span className="size-1.5 rounded-full bg-current" />{statusLabels[status]}</span>;
}

function Clients() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchCompanies = useServerFn(listCompanies);
  const fetchOptions = useServerFn(listAdminOptions);
  const save = useServerFn(saveCompany);
  const remove = useServerFn(deleteAdminRecord);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Company | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [sort, setSort] = useState<"name" | "created_at">("created_at");
  const [ascending, setAscending] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [columns, setColumns] = useState<Record<Column, boolean>>({ owner: true, plates: true, subscription: true, since: true });
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "companies"], queryFn: () => fetchCompanies({ data: {} } as never) });
  const options = useQuery({ queryKey: ["admin", "options"], queryFn: () => fetchOptions({ data: {} } as never), enabled: showForm });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const saveMutation = useMutation({
    mutationFn: () => save({ data: { ...form, id: form.id || null } }),
    onSuccess: () => { toast.success(form.id ? "Cliente alterado." : "Cliente incluído."); setShowForm(false); setForm(initialForm); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { entity: "companies", id } }),
    onSuccess: async (_, id) => {
      qc.setQueryData(["admin", "companies"], (rows: Company[] | undefined) => rows?.filter(c => c.id !== id));
      setDetail(null);
      await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["account"] }), qc.invalidateQueries({ queryKey: ["public-page"] })]);
      toast.success("Cliente excluído e plaquinhas invalidadas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const edit = (c: Company) => { setDetail(null); setForm({ id: c.id, name: c.name, ownerId: c.owner_id, websiteUrl: c.website_url ?? "", contact: { ...emptyContact, ...c.contact } }); setShowForm(true); };
  const exclude = (c: Company) => { if (window.confirm(`Excluir ${c.name}? Todas as plaquinhas vinculadas serão invalidadas e suas páginas removidas. O histórico financeiro será preservado.`)) deleteMutation.mutate(c.id); };
  const enter = (c: Company) => navigate({ to: "/admin/cliente/$companyId", params: { companyId: c.id } });
  const companies: Company[] = data ?? [];
  const query = search.trim().toLocaleLowerCase("pt-BR");
  const filtered = companies.filter(c => {
    const text = [c.name, c.owner_email, c.owner_name, c.contact?.document, c.contact?.whatsapp, c.contact?.city, ...c.codes].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
    const numeric = query.replace(/\D/g, "");
    const contactMatch = numeric.length >= 3 && [c.contact?.document, c.contact?.whatsapp].some(v => v?.replace(/\D/g, "").includes(numeric));
    return (status === "all" || statusOf(c) === status) && (text.includes(query) || contactMatch);
  }).sort((a, b) => (ascending ? 1 : -1) * (sort === "name" ? a.name.localeCompare(b.name, "pt-BR") : Date.parse(a.created_at) - Date.parse(b.created_at)));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const changeSort = (key: typeof sort) => { setSort(key); setAscending(sort === key ? !ascending : true); setPage(0); };
  const SortIcon = ({ field }: { field: typeof sort }) => sort !== field ? <ArrowUpDown /> : ascending ? <ArrowUp /> : <ArrowDown />;

  return <div className="space-y-5 pb-12">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><h1 className="font-display text-2xl font-semibold">Clientes</h1><span className="rounded-md border border-border bg-muted px-2 py-0.5 text-sm text-muted-foreground">{companies.length}</span></div>
      <Button onClick={() => { setForm(initialForm); setShowForm(true); }}><Plus /> Incluir cliente</Button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full sm:max-w-sm"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><input className="input h-10 pl-9 pr-9" aria-label="Buscar clientes" placeholder="Buscar empresa, CPF/CNPJ ou WhatsApp..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />{search ? <Button className="absolute right-1 top-1" size="icon" variant="ghost" aria-label="Limpar busca" onClick={() => { setSearch(""); setPage(0); }}><X /></Button> : null}</div>
      <div className="flex items-center gap-2">
        <select aria-label="Filtrar assinatura" className="input min-h-9 w-auto py-2" value={status} onChange={e => { setStatus(e.target.value as Status); setPage(0); }}>{(Object.keys(statusLabels) as Status[]).map(s => <option key={s} value={s}>{s === "all" ? "Todas as assinaturas" : statusLabels[s]}</option>)}</select>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" aria-label="Colunas visíveis"><Columns3 /><span className="hidden sm:inline">Colunas</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{(Object.keys(columnLabels) as Column[]).map(key => <DropdownMenuCheckboxItem key={key} checked={columns[key]} onCheckedChange={checked => setColumns({ ...columns, [key]: checked })}>{columnLabels[key]}</DropdownMenuCheckboxItem>)}</DropdownMenuContent></DropdownMenu>
      </div>
    </div>
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr>
          <th className="px-4 py-2 font-medium"><Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => changeSort("name")}>Empresa<SortIcon field="name" /></Button></th>
          {columns.owner ? <th className="px-4 py-3 font-medium">Responsável</th> : null}
          {columns.plates ? <th className="px-4 py-3 font-medium">Plaquinhas</th> : null}
          {columns.subscription ? <th className="px-4 py-3 font-medium">Assinatura</th> : null}
          {columns.since ? <th className="px-4 py-2 font-medium"><Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground" onClick={() => changeSort("created_at")}>Desde<SortIcon field="created_at" /></Button></th> : null}
          <th className="w-12 px-3"><span className="sr-only">Ações</span></th>
        </tr></thead>
        <tbody>{visible.map(c => <tr key={c.id} className="border-b border-border last:border-b-0 hover:bg-muted/30">
          <td className="px-4 py-4"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><Building2 className="size-4" /></span><div className="min-w-0 max-w-56"><Button variant="link" className="h-auto max-w-full justify-start whitespace-normal p-0 text-left font-semibold text-foreground" onClick={() => setDetail(c)}>{c.name}</Button><p className="mt-0.5 truncate text-xs text-muted-foreground">{c.contact?.city ? [c.contact.city, c.contact.state].filter(Boolean).join(" / ") : c.contact?.document || "—"}</p></div></div></td>
          {columns.owner ? <td className="px-4 py-4"><p className="max-w-48 truncate">{c.owner_name || c.owner_email || "—"}</p>{c.owner_name && c.owner_email ? <p className="mt-0.5 max-w-48 truncate text-xs text-muted-foreground" title={c.owner_email}>{c.owner_email}</p> : null}</td> : null}
          {columns.plates ? <td className="px-4 py-4"><span className="font-medium tabular-nums">{c.codes.length}</span><p className="mt-0.5 max-w-36 truncate font-mono text-xs text-muted-foreground" title={c.codes.join(", ")}>{c.codes.join(", ") || "—"}</p></td> : null}
          {columns.subscription ? <td className="px-4 py-4"><SubscriptionStatus company={c} />{c.expires_at ? <p className="mt-1 text-xs text-muted-foreground">Até {dateBR(c.expires_at)}</p> : null}</td> : null}
          {columns.since ? <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">{dateBR(c.created_at)}</td> : null}
          <td className="px-3 py-4"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Ações de ${c.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setDetail(c)}><Eye />Ver detalhes</DropdownMenuItem><DropdownMenuItem onSelect={() => edit(c)}><Pencil />Alterar cliente</DropdownMenuItem><DropdownMenuItem onSelect={() => enter(c)}><LogIn />Entrar como cliente</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" disabled={deleteMutation.isPending} onSelect={() => exclude(c)}><Trash2 />Excluir cliente</DropdownMenuItem></DropdownMenuContent></DropdownMenu></td>
        </tr>)}</tbody>
      </table></div>
      {isLoading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin motion-reduce:animate-none" />Carregando clientes...</div> : isError ? <div className="space-y-3 py-12 text-center"><p className="text-sm text-destructive">Não foi possível carregar os clientes.</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div> : !filtered.length ? <div className="flex flex-col items-center gap-3 px-4 py-14"><Building2 className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{companies.length ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}</p>{companies.length ? <Button variant="outline" onClick={() => { setSearch(""); setStatus("all"); setPage(0); }}>Limpar filtros</Button> : null}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">{filtered.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} de ${filtered.length} clientes` : "0 clientes"}</p>
        <div className="flex items-center gap-3"><select className="rounded-md border border-input bg-background px-2 py-1.5 text-xs" aria-label="Clientes por página" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}><option value="10">10 por página</option><option value="25">25 por página</option><option value="50">50 por página</option></select><span className="text-xs tabular-nums text-muted-foreground">{currentPage + 1} / {pageCount}</span><div className="flex gap-1"><Button size="icon" variant="outline" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button><Button size="icon" variant="outline" aria-label="Próxima página" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button></div></div>
      </div>
    </div>
    <Sheet open={showForm || !!detail} onOpenChange={open => { if (!open && !saveMutation.isPending) { setShowForm(false); setDetail(null); } }}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl" aria-describedby={undefined}>
        <SheetHeader className="border-b border-border p-6 text-left"><SheetTitle>{showForm ? form.id ? "Alterar cliente" : "Novo cliente" : detail?.name}</SheetTitle></SheetHeader>
        {showForm ? <form className="flex flex-1 flex-col" onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
          <div className="space-y-6 p-6"><section className="space-y-4"><h2 className="text-xs font-semibold uppercase text-muted-foreground">Dados da empresa</h2><label className="grid gap-1 text-sm font-semibold">Nome da empresa<input className="input" required maxLength={120} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label className="grid gap-1 text-sm font-semibold">Responsável<select className="input" required value={form.ownerId} disabled={options.isLoading || options.isError} onChange={e => setForm({ ...form, ownerId: e.target.value })}><option value="">{options.isLoading ? "Carregando responsáveis..." : "Selecione o responsável"}</option>{(options.data?.profiles ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => <option key={p.id} value={p.id}>{p.full_name || p.email || p.id}</option>)}</select></label>{options.isError ? <Button variant="outline" type="button" onClick={() => options.refetch()}>Recarregar responsáveis</Button> : null}<label className="grid gap-1 text-sm font-semibold">Site da empresa (opcional)<input className="input" type="url" maxLength={500} placeholder="https://" value={form.websiteUrl} onChange={e => setForm({ ...form, websiteUrl: e.target.value })} /></label></section><section className="space-y-4 border-t border-border pt-6"><h2 className="text-xs font-semibold uppercase text-muted-foreground">Contato e endereço</h2><ContactFields value={form.contact} onChange={contact => setForm({ ...form, contact })} /></section></div>
          <div className="sticky bottom-0 mt-auto flex justify-end gap-2 border-t border-border bg-background p-4"><Button type="button" variant="outline" disabled={saveMutation.isPending} onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit" disabled={!form.name.trim() || !form.ownerId || options.isError || saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : null}{saveMutation.isPending ? "Salvando..." : form.id ? "Salvar alterações" : "Incluir cliente"}</Button></div>
        </form> : detail ? <div className="space-y-6 p-6"><div className="flex flex-wrap gap-2"><SubscriptionStatus company={detail} /><Button variant="outline" size="sm" onClick={() => edit(detail)}><Pencil />Alterar</Button><Button size="sm" onClick={() => enter(detail)}><LogIn />Entrar como cliente</Button></div><dl className="grid grid-cols-2 gap-5 text-sm">{[["Responsável", detail.owner_name || detail.owner_email], ["E-mail", detail.owner_email], ["WhatsApp", detail.contact?.whatsapp], ["CPF/CNPJ", detail.contact?.document], ["Site", detail.website_url], ["Desde", dateBR(detail.created_at)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "—"}</dd></div>)}</dl><section className="space-y-2 border-t border-border pt-5"><h2 className="text-sm font-semibold">Endereço</h2><p className="break-words text-sm text-muted-foreground">{[detail.contact?.street, detail.contact?.number, detail.contact?.complement, detail.contact?.district, detail.contact?.city, detail.contact?.state, detail.contact?.cep].filter(Boolean).join(", ") || "—"}</p></section><section className="space-y-3 border-t border-border pt-5"><h2 className="text-sm font-semibold">Plaquinhas <span className="ml-1 text-muted-foreground">{detail.codes.length}</span></h2><div className="flex flex-wrap gap-2">{detail.codes.map(code => <span key={code} className="rounded-md border border-border bg-muted px-2 py-1 font-mono text-xs">{code}</span>)}{!detail.codes.length ? <p className="text-sm text-muted-foreground">Nenhuma plaquinha vinculada.</p> : null}</div></section></div> : null}
      </SheetContent>
    </Sheet>
  </div>;
}
