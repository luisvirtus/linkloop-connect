import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, LogOut, QrCode, Star, Trash2, Unlock } from "lucide-react";
import { getAccount, getPlateByCode, linkPlate } from "@/lib/account.functions";
import { savePage, saveLink, deleteLink, setPlateBlock, requestRenewal } from "@/lib/page.functions";
import { brl, dateBR, PLATE_SIZE_LABEL, PLATE_STATUS_LABEL } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type Search = { code?: string | undefined; companyId?: string | undefined };

export const Route = createFileRoute("/_authenticated/painel")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    companyId: typeof s["companyId"] === "string" ? s["companyId"] : undefined,
  }),
  head: () => ({ meta: [
    { title: "Minha plaquinha — Plaquinhas QR" },
    { name: "description", content: "Configure sua página, seus links e sua assinatura." },
    { property: "og:title", content: "Minha plaquinha — Plaquinhas QR" },
    { property: "og:description", content: "Gerencie sua plaquinha e sua página pública." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ClientPanel,
});

const LINK_KINDS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "website", label: "Site" },
  { value: "other", label: "Outro" },
];

function ClientPanel() {
  const search = useSearch({ from: "/_authenticated/painel" });
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getAccount);

  const account = useQuery({
    queryKey: ["account", search.companyId ?? "self"],
    queryFn: () => fetchAccount({ data: { companyId: search.companyId ?? null } }),
  });

  if (account.isLoading) return <Shell><p className="text-sm text-muted-foreground">Carregando...</p></Shell>;
  if (account.error) return <Shell><p className="text-sm text-destructive">Não foi possível carregar seus dados.</p></Shell>;

  const data = account.data;
  if (!data) return <Shell><p className="text-sm text-muted-foreground">Conta não encontrada.</p></Shell>;

  return (
    <Shell isAdmin={data.isAdmin} isSeller={!!data.seller} impersonating={data.impersonating}>
      {!data.company ? (
        <LinkPlateCard initialCode={search.code ?? ""} onDone={() => qc.invalidateQueries({ queryKey: ["account"] })} />
      ) : (
        <CompanyPanel data={data} onChange={() => qc.invalidateQueries({ queryKey: ["account"] })} />
      )}
    </Shell>
  );
}

function Shell({
  children,
  isAdmin,
  isSeller,
  impersonating,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
  isSeller?: boolean;
  impersonating?: boolean;
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <QrCode className="h-5 w-5 text-primary" /> Minha plaquinha
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isSeller ? <Link to="/vendedor" className="font-semibold text-primary">Vendedor</Link> : null}
            {isAdmin ? <Link to="/admin" className="font-semibold text-primary">Admin</Link> : null}
            <button
              className="flex items-center gap-1 text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
        {impersonating ? (
          <div className="flex items-center justify-between rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <strong>Modo de suporte: visualizando a conta do cliente</strong>
            <Link to="/admin/clientes" className="font-semibold text-primary">Voltar aos clientes</Link>
          </div>
        ) : null}
        {children}
      </div>
    </main>
  );
}

function LinkPlateCard({ initialCode, onDone }: { initialCode: string; onDone: () => void }) {
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [companyName, setCompanyName] = useState("");
  const [google, setGoogle] = useState("");
  const check = useServerFn(getPlateByCode);
  const link = useServerFn(linkPlate);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (initialCode) setCode(initialCode.toUpperCase());
  }, [initialCode]);

  const checkMutation = useMutation({
    mutationFn: () => check({ data: { code } }),
    onSuccess: (res) => {
      if (!res.found) setStatus("Plaquinha não encontrada. Confira o código.");
      else if (!res.available) setStatus("Esta plaquinha não está disponível para vinculação.");
      else setStatus(null);
    },
  });

  const linkMutation = useMutation({
    mutationFn: () => link({ data: { code, companyName, googleReviewUrl: google } }),
    onSuccess: () => {
      toast.success("Plaquinha vinculada!");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="surface-card p-6">
      <h1 className="font-display text-xl font-bold">Vincular plaquinha</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Informe o código impresso na plaquinha (ou escaneie o QR Code).
      </p>
      <div className="mt-5 space-y-3">
        <Field label="Código da plaquinha">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onBlur={() => code && checkMutation.mutate()}
            placeholder="ABC123"
            className="input"
          />
        </Field>
        {status ? <p className="text-sm text-destructive">{status}</p> : null}
        <Field label="Nome da empresa">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input" />
        </Field>
        <Field label="Link de avaliação do Google (opcional agora)">
          <input value={google} onChange={(e) => setGoogle(e.target.value)} placeholder="https://g.page/..." className="input" />
        </Field>
        <button
          className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60"
          disabled={!code || !companyName || linkMutation.isPending}
          onClick={() => linkMutation.mutate()}
        >
          {linkMutation.isPending ? "Vinculando..." : "Vincular plaquinha"}
        </button>
      </div>
    </div>
  );
}

function CompanyPanel({ data, onChange }: { data: any; onChange: () => void }) {
  const save = useServerFn(savePage);
  const upsertLink = useServerFn(saveLink);
  const removeLink = useServerFn(deleteLink);
  const block = useServerFn(setPlateBlock);
  const renew = useServerFn(requestRenewal);

  const [companyName, setCompanyName] = useState(data.company.name);
  const [title, setTitle] = useState(data.page?.title ?? data.company.name);
  const [subtitle, setSubtitle] = useState(data.page?.subtitle ?? "");
  const [website, setWebsite] = useState(data.company.website_url ?? "");
  const [google, setGoogle] = useState(data.page?.google_review_url ?? "");
  const active = data.subscriptionActive;

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          companyId: data.company.id,
          pageId: data.page.id,
          companyName,
          title,
          subtitle,
          websiteUrl: website,
          googleReviewUrl: google,
          logoUrl: data.page?.logo_url ?? null,
        },
      }),
    onSuccess: () => {
      toast.success("Página atualizada.");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkMutation = useMutation({
    mutationFn: (payload: any) => upsertLink({ data: { companyId: data.company.id, pageId: data.page.id, ...payload } }),
    onSuccess: () => {
      toast.success("Link salvo.");
      onChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLink({ data: { companyId: data.company.id, id } }),
    onSuccess: () => onChange(),
    onError: (e: Error) => toast.error(e.message),
  });

  const blockMutation = useMutation({
    mutationFn: (payload: { plateId: string; blocked: boolean }) => block({ data: payload }),
    onSuccess: () => onChange(),
    onError: (e: Error) => toast.error(e.message),
  });

  const renewMutation = useMutation({
    mutationFn: () => renew({ data: { companyId: data.company.id } }),
    onSuccess: () => toast.success("Pedido de renovação registrado. Em breve confirmaremos o pagamento."),
    onError: (e: Error) => toast.error(e.message),
  });

  const [newLink, setNewLink] = useState({ kind: "whatsapp", label: "WhatsApp", url: "" });

  return (
    <>
      {!active ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="font-semibold text-destructive">Assinatura vencida</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Para alterar as informações da sua página, é necessário renovar sua assinatura. Sua página
            pública continua no ar e nada foi apagado.
          </p>
          <button
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
            onClick={() => renewMutation.mutate()}
          >
            Renovar agora
          </button>
        </div>
      ) : null}

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Sua página</h2>
        <div className="mt-4 space-y-3">
          <Field label="Nome da empresa">
            <input className="input" value={companyName} disabled={!active} onChange={(e) => setCompanyName(e.target.value)} />
          </Field>
          <Field label="Título da página">
            <input className="input" value={title} disabled={!active} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Frase curta">
            <input className="input" value={subtitle} disabled={!active} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
          <Field label="Link de avaliação do Google">
            <input className="input" value={google} disabled={!active} onChange={(e) => setGoogle(e.target.value)} />
          </Field>
          <Field label="Site">
            <input className="input" value={website} disabled={!active} onChange={(e) => setWebsite(e.target.value)} />
          </Field>
          <button
            className="rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
            disabled={!active || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Salvar
          </button>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Seus links</h2>
        <div className="mt-4 space-y-3">
          {data.links.map((l: any) => (
            <div key={l.id} className="flex items-center gap-2">
              <input
                className="input flex-1"
                defaultValue={l.label}
                disabled={!active}
                onBlur={(e) => e.target.value !== l.label && linkMutation.mutate({ id: l.id, kind: l.kind, label: e.target.value, url: l.url, position: l.position })}
              />
              <input
                className="input flex-1"
                defaultValue={l.url}
                disabled={!active}
                onBlur={(e) => e.target.value !== l.url && linkMutation.mutate({ id: l.id, kind: l.kind, label: l.label, url: e.target.value, position: l.position })}
              />
              <button disabled={!active} onClick={() => deleteMutation.mutate(l.id)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.links.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum link ainda.</p> : null}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <select
              className="input sm:w-40"
              value={newLink.kind}
              disabled={!active}
              onChange={(e) => {
                const kind = e.target.value;
                setNewLink((s) => ({ ...s, kind, label: LINK_KINDS.find((k) => k.value === kind)?.label ?? "Link" }));
              }}
            >
              {LINK_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <input
              className="input flex-1"
              placeholder="https://..."
              value={newLink.url}
              disabled={!active}
              onChange={(e) => setNewLink((s) => ({ ...s, url: e.target.value }))}
            />
            <button
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              disabled={!active || !newLink.url}
              onClick={() => {
                linkMutation.mutate({ ...newLink, position: data.links.length });
                setNewLink({ kind: "whatsapp", label: "WhatsApp", url: "" });
              }}
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="font-display text-lg font-bold">Plaquinhas</h2>
        <div className="mt-4 space-y-3">
          {data.plates.map((p: any) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="font-semibold">{p.qr_code}</p>
                <p className="text-xs text-muted-foreground">
                  {PLATE_SIZE_LABEL[p.size] ?? p.size} · {PLATE_STATUS_LABEL[p.status] ?? p.status}
                  {p.blocked_by_client ? " · bloqueada por você" : ""}
                  {p.blocked_by_admin ? " · bloqueada pelo suporte" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`/q/${p.qr_code}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">
                  Ver página
                </a>
                <button
                  className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold"
                  onClick={() => blockMutation.mutate({ plateId: p.id, blocked: !p.blocked_by_client })}
                >
                  {p.blocked_by_client ? <><Unlock className="h-4 w-4" /> Desbloquear</> : <><Lock className="h-4 w-4" /> Bloquear</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="surface-card p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <Star className="h-5 w-5 text-primary" /> Assinatura
        </h2>
        {data.subscription ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Válida de {dateBR(data.subscription.starts_at)} até {dateBR(data.subscription.expires_at)} ·{" "}
            {brl(data.subscription.amount)} por ano · {active ? "ativa" : "vencida"}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nenhuma assinatura registrada.</p>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-left">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
