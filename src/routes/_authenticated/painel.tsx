import { SystemPageHeading } from "@/components/system-page";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, LogOut, Printer, QrCode, Star, Trash2, Unlock } from "lucide-react";
import { PlateActivation } from "@/components/plate-activation";
import { ContactFields } from "@/components/contact-fields";
import { emptyContact } from "@/lib/registration";
import { getAccount, saveAccountContact } from "@/lib/account.functions";
import { savePage, saveLink, deleteLink, setPlateBlock, requestRenewal, setPlateLabel, setPlateCustomPage, saveMenu, getAddons, requestAddon } from "@/lib/page.functions";
import { brl, dateBR, PLATE_SIZE_LABEL, PLATE_STATUS_LABEL } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { channelFor, editableLinkValue, LINK_CHANNELS, normalizeLinkValue } from "@/lib/link-channels";
import { Button } from "@/components/ui/button";
import { TelegramSettings } from "@/components/telegram-settings";

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

function ClientPanel() {
  const search = useSearch({ from: "/_authenticated/painel" });
  const qc = useQueryClient();
  const fetchAccount = useServerFn(getAccount);

  const account = useQuery({
    queryKey: ["account", search.companyId ?? "self"],
    queryFn: () => fetchAccount({ data: { companyId: search.companyId ?? null } }),
  });

  if (account.isLoading) return <Shell><p className="text-sm text-muted-foreground">Carregando...</p></Shell>;
  if (account.error) return <Shell><p role="alert" className="text-destructive">{account.error.message}</p>{search.companyId ? <Link to="/admin/clientes" className="mt-4 inline-flex text-sm font-semibold text-primary">Voltar aos clientes</Link> : null}</Shell>;

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
    <main className="system-ui min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <QrCode className="h-5 w-5 text-primary" /> Minha plaquinha
          </div>
          <div className="flex items-center gap-3 text-sm">
            {isSeller ? <Link to="/vendedor" className="font-semibold text-primary">Vendedor</Link> : null}
            {isAdmin ? <Link to="/admin" className="font-semibold text-primary">Admin</Link> : null}
            <Button
              variant="ghost" size="sm" className="text-muted-foreground"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-5 px-5 py-6">
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
  const code = initialCode.toUpperCase();
  if (/^[A-Z0-9]{6}$/.test(code)) return <PlateActivation key={code} code={code} onDone={onDone} />;
  return <div className="management-section"><h2 className="font-display text-lg font-bold">Nenhuma plaquinha vinculada</h2><p className="mt-2 text-sm text-muted-foreground">Para vincular, aponte a câmera do celular para o QR Code da plaquinha física. Assim evitamos erros de digitação.</p></div>;
}

function CompanyPanel({ data, onChange }: { data: any; onChange: () => void }) {
  const [pageId, setPageId] = useState<string>(data.pages?.[0]?.id ?? "");
  const page = data.pages?.find((pg: any) => pg.id === pageId) ?? data.pages?.[0] ?? null;
  const plateName = (id: string) => { const p = data.plates.find((x: any) => x.id === id); return p ? (p.label || p.qr_code) : "Plaquinha"; };
  return (
    <>
      <SystemPageHeading title={data.company.name} count={data.plates.length} />
      {data.pages?.length > 1 ? (
        <Field label="Página que você está editando">
          <select className="input" value={page?.id} onChange={(e) => setPageId(e.target.value)}>
            {data.pages.map((pg: any, i: number) => <option key={pg.id} value={pg.id}>{i === 0 ? "Página padrão (todas as plaquinhas)" : `Página própria: ${plateName(pg.plate_id)}`}</option>)}
          </select>
        </Field>
      ) : null}
      <CompanyPanelInner key={page?.id} data={{ ...data, page, links: page?.links ?? [] }} onChange={onChange} />
    </>
  );
}

function AddonBilling({ companyId }: { companyId: string }) {
  const load = useServerFn(getAddons);
  const req = useServerFn(requestAddon);
  const q = useQuery({ queryKey: ["addons", companyId], queryFn: () => load({ data: { companyId } }) });
  const [cycle, setCycle] = useState<Record<"waiter" | "menu", "monthly" | "annual">>({ waiter: "monthly", menu: "monthly" });
  const m = useMutation({
    mutationFn: (addon: "waiter" | "menu") => req({ data: { companyId, addon, cycle: cycle[addon] } }),
    onSuccess: (r) => { toast.success(r.alreadyPending ? "Já existe um pedido aguardando pagamento." : "Pedido registrado. Em breve confirmaremos o pagamento."); q.refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (!q.data) return null;
  const items = (["waiter", "menu"] as const).filter((k) => !q.data[k]?.free);
  if (!items.length) return null;
  const names = { waiter: "Chamar atendente", menu: "Cardápio" };
  return (
    <div className="management-section">
      <h2 className="font-display text-lg font-bold">Recursos adicionais</h2>
      <p className="mt-1 text-sm text-muted-foreground">Cobrados à parte da anuidade, por plaquinha vinculada.</p>
      <div className="mt-4 space-y-4">
        {items.map((k) => {
          const a = q.data[k];
          const unit = Number(cycle[k] === "monthly" ? a.monthly : a.annual);
          return (
            <div key={k} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{names[k]}</p>
                <span className={a.active ? "text-sm text-primary" : "text-sm text-muted-foreground"}>{a.active ? `Ativo até ${dateBR(a.expiresAt ?? "")}` : "Inativo"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                {(["monthly", "annual"] as const).map((c) => (
                  <label key={c} className="flex items-center gap-1"><input type="radio" name={`cycle-${k}`} checked={cycle[k] === c} disabled={Number(c === "monthly" ? a.monthly : a.annual) <= 0} onChange={() => setCycle((s) => ({ ...s, [k]: c }))} /> {c === "monthly" ? `Mensal (${brl(a.monthly)})` : `Anual (${brl(a.annual)})`}</label>
                ))}
              </div>
              <p className="mt-2 text-sm">{a.quantity} plaquinha(s) × {brl(unit)} = <strong>{brl(unit * a.quantity)}</strong></p>
              <Button className="mt-3" size="sm" disabled={m.isPending || a.pending || unit <= 0} onClick={() => m.mutate(k)}>{a.pending ? "Aguardando pagamento" : a.active ? "Renovar" : "Contratar"}</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MenuEditor({ data, active, onChange }: { data: any; active: boolean; onChange: () => void }) {
  const save = useServerFn(saveMenu);
  const [enabled, setEnabled] = useState<boolean>(!!data.page?.menu_enabled);
  const [items, setItems] = useState<any[]>(data.page?.menu ?? []);
  const m = useMutation({ mutationFn: () => save({ data: { companyId: data.company.id, pageId: data.page.id, enabled, items } }), onSuccess: () => { toast.success("Cardápio salvo."); onChange(); }, onError: (e: Error) => toast.error(e.message) });
  const set = (i: number, k: string, v: any) => setItems((s) => s.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div className="management-section">
      <h2 className="font-display text-lg font-bold">Cardápio (opcional)</h2>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} disabled={!active} onChange={(e) => setEnabled(e.target.checked)} /> Mostrar cardápio na página e receber pedidos pelo Telegram</label>
      {enabled ? (
        <div className="mt-4 space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1.5fr_0.8fr_auto]">
              <input className="input" aria-label="Categoria" placeholder="Categoria" value={it.c ?? ""} disabled={!active} onChange={(e) => set(i, "c", e.target.value)} />
              <input className="input" aria-label="Item" placeholder="Nome do item" value={it.n ?? ""} disabled={!active} onChange={(e) => set(i, "n", e.target.value)} />
              <input className="input" aria-label="Preço" type="number" min={0} step="0.01" placeholder="Preço" value={it.p ?? ""} disabled={!active} onChange={(e) => set(i, "p", e.target.value)} />
              <Button variant="ghost" size="icon" aria-label="Excluir item do cardápio" className="text-destructive" disabled={!active} onClick={() => setItems((s) => s.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              <input className="input sm:col-span-4" aria-label="Descrição" placeholder="Descrição (opcional)" value={it.d ?? ""} disabled={!active} onChange={(e) => set(i, "d", e.target.value)} />
            </div>
          ))}
          <Button variant="outline" disabled={!active} onClick={() => setItems((s) => [...s, { c: s[s.length - 1]?.c ?? "", n: "", p: 0 }])}>Adicionar item</Button>
        </div>
      ) : null}
      <Button className="mt-4" disabled={!active || m.isPending} onClick={() => m.mutate()}>Salvar cardápio</Button>
    </div>
  );
}

function PlateRowExtras({ plate, data, onChange }: { plate: any; data: any; onChange: () => void }) {
  const saveLabel = useServerFn(setPlateLabel);
  const setCustom = useServerFn(setPlateCustomPage);
  const [label, setLabel] = useState(plate.label ?? "");
  const isMain = data.pages?.[0]?.plate_id === plate.id;
  const custom = !isMain && data.pages?.some((pg: any) => pg.plate_id === plate.id);
  const lm = useMutation({ mutationFn: () => saveLabel({ data: { companyId: data.company.id, plateId: plate.id, label } }), onSuccess: () => { toast.success("Apelido salvo."); onChange(); }, onError: (e: Error) => toast.error(e.message) });
  const cm = useMutation({ mutationFn: (c: boolean) => setCustom({ data: { companyId: data.company.id, plateId: plate.id, custom: c } }), onSuccess: () => onChange(), onError: (e: Error) => toast.error(e.message) });
  return (
    <div className="flex w-full flex-wrap items-end gap-3 border-t border-border pt-3">
      <Field label="Apelido (ex.: Mesa 04)"><input className="input" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== (plate.label ?? "") && lm.mutate()} /></Field>
      {!isMain ? (
        <label className="flex items-center gap-2 pb-3 text-sm"><input type="checkbox" checked={custom} disabled={cm.isPending || !(data.subscriptionActive || data.impersonating)} onChange={(e) => { if (!e.target.checked && !confirm("Voltar para a página padrão apaga os links próprios desta plaquinha. Continuar?")) return; cm.mutate(e.target.checked); }} /> Página própria (filial/setor)</label>
      ) : <span className="pb-3 text-xs text-muted-foreground">Usa a página padrão</span>}
    </div>
  );
}

function CompanyPanelInner({ data, onChange }: { data: any; onChange: () => void }) {
  const save = useServerFn(savePage);
  const saveContact = useServerFn(saveAccountContact);
  const [contact, setContact] = useState({ ...emptyContact, ...data.company.contact });
  const contactMutation = useMutation({ mutationFn: () => saveContact({ data: { companyId: data.company.id, contact } }), onSuccess: () => { toast.success("Cadastro salvo."); onChange(); }, onError: (e: Error) => toast.error(e.message) });
  const upsertLink = useServerFn(saveLink);
  const removeLink = useServerFn(deleteLink);
  const block = useServerFn(setPlateBlock);
  const renew = useServerFn(requestRenewal);

  const [companyName, setCompanyName] = useState(data.company.name);
  const [title, setTitle] = useState(data.page?.title ?? data.company.name);
  const [subtitle, setSubtitle] = useState(data.page?.subtitle ?? "");
  const [website, setWebsite] = useState(data.company.website_url ?? "");
  const [google, setGoogle] = useState(data.page?.google_review_url ?? "");
  const active = data.subscriptionActive || data.impersonating;

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
    mutationFn: (payload: any) => {
      const url = normalizeLinkValue(payload.kind, payload.url);
      return upsertLink({ data: { companyId: data.company.id, pageId: data.page.id, ...payload, url } });
    },
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
      <section className="border-b border-border pb-6"><h2 className="mb-4 font-display text-lg font-bold">Dados de cadastro</h2><ContactFields value={contact} onChange={setContact} /><Button className="mt-4" disabled={contactMutation.isPending} onClick={() => contactMutation.mutate()}>Salvar cadastro</Button></section>
      {!data.subscriptionActive && !data.impersonating ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5">
          <p className="font-semibold text-destructive">Assinatura vencida</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Para alterar as informações da sua página, é necessário renovar sua assinatura. Sua página
            pública continua no ar e nada foi apagado.
          </p>
          <Button
            className="mt-4"
            onClick={() => renewMutation.mutate()}
          >
            Renovar agora
          </Button>
        </div>
      ) : null}

      <div className="management-section">
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
          <Button
            disabled={!active || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Salvar
          </Button>
        </div>
      </div>

      <div className="management-section">
        <h2 className="font-display text-lg font-bold">Seus links</h2>
        <div className="mt-4 space-y-3">
          {data.links.map((l: any) => (
            <ExistingLink key={l.id} link={l} active={active} onSave={(payload) => linkMutation.mutate(payload)} onDelete={() => deleteMutation.mutate(l.id)} />
          ))}
          {data.links.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum link ainda.</p> : null}

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row">
            <select
              className="input sm:w-40"
              value={newLink.kind}
              disabled={!active}
              onChange={(e) => {
                const kind = e.target.value;
                setNewLink((s) => ({ ...s, kind, label: channelFor(kind).label, url: "" }));
              }}
            >
              {LINK_CHANNELS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            <input
              className="input flex-1"
              placeholder={channelFor(newLink.kind).placeholder}
              inputMode={channelFor(newLink.kind).inputMode}
              value={newLink.url}
              disabled={!active}
              onChange={(e) => setNewLink((s) => ({ ...s, url: e.target.value }))}
            />
            <Button
              disabled={!active || !newLink.url}
              onClick={() => {
                try {
                  normalizeLinkValue(newLink.kind, newLink.url);
                  linkMutation.mutate({ ...newLink, position: data.links.length });
                  setNewLink({ kind: "whatsapp", label: "WhatsApp", url: "" });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Confira o contato informado.");
                }
              }}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <AddonBilling companyId={data.company.id} />
      <TelegramSettings companyId={data.company.id} admin={!!data.isAdmin} />
      {data.page ? <MenuEditor data={data} active={active} onChange={onChange} /> : null}

      <div className="management-section">
        <h2 className="font-display text-lg font-bold">Plaquinhas</h2>
        <p className="mt-1 text-sm text-muted-foreground">Para adicionar outra, escaneie o QR Code da nova plaquinha com o celular conectado a esta conta.</p>
        <div className="mt-4 space-y-3">
          {data.plates.map((p: any) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-semibold">{p.label ? `${p.label} · ` : ""}{p.qr_code}</p>
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
                 <Button asChild variant="outline" size="sm" title={`Imprimir ${p.qr_code}`}><Link to="/imprimir/$plateId" params={{ plateId: p.id }}><Printer /> Imprimir</Link></Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => blockMutation.mutate({ plateId: p.id, blocked: !p.blocked_by_client })}
                >
                  {p.blocked_by_client ? <><Unlock className="h-4 w-4" /> Desbloquear</> : <><Lock className="h-4 w-4" /> Bloquear</>}
                </Button>
              </div>
              <PlateRowExtras plate={p} data={data} onChange={onChange} />
            </div>
          ))}
        </div>
      </div>

      <div className="management-section">
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

function ExistingLink({ link, active, onSave, onDelete }: { link: any; active: boolean; onSave: (payload: any) => void; onDelete: () => void }) {
  const [label, setLabel] = useState(link.label);
  const [value, setValue] = useState(editableLinkValue(link.kind, link.url));
  const channel = channelFor(link.kind);
  const saveIfChanged = () => {
    if (label !== link.label || value !== editableLinkValue(link.kind, link.url)) {
      onSave({ id: link.id, kind: link.kind, label, url: value, position: link.position });
    }
  };
  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[140px_1fr_1fr_auto] sm:items-center">
      <span className="text-sm font-semibold">{channel.label}</span>
      <input className="input" aria-label={`Nome de ${channel.label}`} value={label} disabled={!active} onChange={(e) => setLabel(e.target.value)} onBlur={saveIfChanged} />
      <input className="input" aria-label={`Contato de ${channel.label}`} value={value} placeholder={channel.placeholder} inputMode={channel.inputMode} disabled={!active} onChange={(e) => setValue(e.target.value)} onBlur={saveIfChanged} />
      <Button aria-label={`Excluir ${channel.label}`} title="Excluir" disabled={!active} onClick={onDelete} variant="ghost" size="icon" className="text-muted-foreground">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
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
