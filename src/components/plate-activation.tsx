import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { ContactFields } from "@/components/contact-fields";
import { emptyContact, parseContact, requireAnnualConsent } from "@/lib/registration";
import { getMyCompany, linkPlate } from "@/lib/account.functions";
import { getPublicPage } from "@/lib/public.functions";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { brl } from "@/lib/format";

export function PlateActivation({ code, annualPrice: initialPrice, onDone }: { code: string; annualPrice?: number | undefined; onDone?: () => void }) {
  const [name, setName] = useState(""); const [review, setReview] = useState(""); const [contact, setContact] = useState(emptyContact);
  const [accepted, setAccepted] = useState(false); const [busy, setBusy] = useState(false); const [signedIn, setSignedIn] = useState(false); const [annualPrice, setAnnualPrice] = useState(initialPrice);
  const activate = useServerFn(linkPlate); const loadCompany = useServerFn(getMyCompany); const [existing, setExisting] = useState<{ name: string; complete: boolean } | null>(null); const probe = useServerFn(getPublicPage); const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (!alive) return; setSignedIn(!!data.session); if (data.session) loadCompany().then(r => { if (alive) setExisting(r.company); }).catch(() => {}); });
    if (initialPrice === undefined) probe({ data: { code } }).then(p => { if (alive) setAnnualPrice(p.annualPrice); }).catch(() => toast.error("Não foi possível consultar a anuidade."));
    const draft = sessionStorage.getItem(`activation:${code}`);
    if (draft) { try { const d = JSON.parse(draft); setName(d.name ?? ""); setReview(d.review ?? ""); setContact({ ...emptyContact, ...d.contact }); } catch { sessionStorage.removeItem(`activation:${code}`); } }
    return () => { alive = false; };
  }, [code, initialPrice, probe, loadCompany]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const quick = !!existing?.complete;
      const parsed = quick ? contact : parseContact(contact);
      if (annualPrice === undefined) throw new Error("Não foi possível consultar a anuidade. Tente novamente.");
      requireAnnualConsent(accepted, annualPrice, annualPrice);
      if (!signedIn) {
        sessionStorage.setItem(`activation:${code}`, JSON.stringify({ name, review, contact: parsed }));
        const callback = new URL("/entrar", window.location.origin); callback.searchParams.set("next", `/q/${code}`);
        const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: callback.toString() });
        if (result.error) throw result.error;
        const session = await supabase.auth.getSession();
        if (!session.data.session) return;
        setSignedIn(true);
      }
      await activate({ data: { code, companyName: name, googleReviewUrl: review, contact: parsed, accepted, annualPrice } });
      sessionStorage.removeItem(`activation:${code}`); toast.success("Plaquinha ativada!");
      if (onDone) onDone(); else await navigate({ to: "/painel" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível ativar."); }
    finally { setBusy(false); }
  }
  if (signedIn && existing?.complete) return <section className="mx-auto w-full max-w-xl px-5 py-8"><h1 className="font-display text-2xl font-semibold">Vincular nova plaquinha</h1><p className="mt-2 text-sm text-muted-foreground">Você está conectado como <strong>{existing.name}</strong>. Deseja vincular a plaquinha <strong>{code}</strong> a esta empresa? Seus dados de cadastro serão aproveitados.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" /><span>Concordo com a anuidade de {annualPrice === undefined ? "…" : brl(annualPrice)} desta plaquinha, cobrada na renovação após os primeiros 12 meses, para os canais adicionais. A avaliação do Google permanece sempre ativa.</span></label><Button className="w-full" size="lg" disabled={busy || annualPrice === undefined || !accepted}>{busy ? "Aguarde…" : "Confirmar vinculação"}</Button></form></section>;
  return <section className="mx-auto w-full max-w-xl px-5 py-8"><h1 className="font-display text-2xl font-semibold">Ativar sua plaquinha</h1><p className="mt-2 text-sm text-muted-foreground">Código {code}</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="grid gap-1 text-sm font-semibold">Nome da empresa<input className="input" required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label><ContactFields value={contact} onChange={setContact} /><label className="grid gap-1 text-sm font-semibold">Link de avaliação do Google (opcional agora)<input className="input" type="url" maxLength={2048} value={review} onChange={e => setReview(e.target.value)} /></label><label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1" /><span>Concordo com a anuidade de {annualPrice === undefined ? "…" : brl(annualPrice)}, cobrada na renovação após os primeiros 12 meses da ativação, para os canais adicionais. Sem renovação, esses canais ficam visíveis, mas desativados; a avaliação do Google permanece ativa.</span></label><Button className="w-full" size="lg" disabled={busy || annualPrice === undefined || !accepted}>{!signedIn ? <FcGoogle /> : null}{busy ? "Aguarde…" : signedIn ? "Ativar plaquinha" : "Continuar com o Google e ativar"}</Button><Link to="/entrar" search={{ next: `/q/${code}` }} className="block text-center text-xs text-muted-foreground">Já tenho uma conta</Link></form></section>;
}