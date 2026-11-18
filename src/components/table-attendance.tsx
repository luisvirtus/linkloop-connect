import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openTableSession, sendTableRequest } from "@/lib/table-service.functions";
import { MenuOrder } from "./menu-order";
import { brl } from "@/lib/format";

export function TableAttendance({ code, waiter, menu, waiterActive, menuActive, label }: {
  code: string; waiter: boolean; menu: { c: string; n: string; d?: string; p: number }[] | null;
  waiterActive: boolean; menuActive: boolean; label: string | null;
}) {
  const open = useServerFn(openTableSession);
  const send = useServerFn(sendTableRequest);
  const [session, setSession] = useState<{ token: string; expiresAt: string; total: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let alive = true;
    const key = `votona-table-${code}`;
    const token = localStorage.getItem(key);
    open({ data: { code, token } }).then((r) => { if (!alive) return; localStorage.setItem(key, r.token); setSession(r); }).catch((e) => { if (alive) { setError(e.message); if (/encerrada|expirada/.test(e.message)) localStorage.removeItem(key); } });
    return () => { alive = false; };
  }, [code, open]);
  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(() => setExpired(true), Math.max(0, new Date(session.expiresAt).getTime() - Date.now()));
    return () => clearTimeout(timeout);
  }, [session]);
  useEffect(() => {
    if (!session || expired) return;
    const poll = setInterval(() => open({ data: { code, token: session.token } }).then((r) => setSession((s) => s ? { ...s, total: r.total } : s)).catch((e) => { if (/encerrada|expirada/.test(e.message)) { setExpired(true); setError(e.message); localStorage.removeItem(`votona-table-${code}`); } }), 15000);
    return () => clearInterval(poll);
  }, [code, session?.token, expired, open]);
  const submit = async (kind: "waiter" | "menu", items: { index: number; quantity: number }[]) => {
    if (!session || busy || expired) return false;
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await send({ data: { code, token: session.token, requestId: crypto.randomUUID(), kind, items } });
      if (r.total !== null) setSession((s) => s ? { ...s, total: r.total ?? s.total } : s);
      setNotice(kind === "waiter" ? "Chamado enviado à equipe!" : "Pedido enviado à equipe!");
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível enviar."); return false; }
    finally { setBusy(false); }
  };
  return <section className="mt-6 space-y-3">
    {label ? <p className="text-center text-sm font-semibold">{label}</p> : null}
    {waiter ? <Button className="min-h-14 w-full" disabled={!waiterActive || !session || busy || expired} onClick={() => submit("waiter", [])}><BellRing />{!waiterActive ? "Chamar atendente · Pausado" : busy ? "Enviando…" : "Chamar atendente"}</Button> : null}
    {menu ? <MenuOrder items={menu} disabled={!menuActive || !session || busy || expired} onSubmit={(items) => submit("menu", items)} /> : null}
    {session && menu ? <p className="text-center text-sm font-semibold">Total da mesa: {brl(session.total)}</p> : null}
    {notice ? <p role="status" className="text-center text-sm text-google-green">{notice}</p> : null}
    {expired ? <p role="alert" className="text-sm text-destructive">Sessão de 90 minutos expirada. Solicite à equipe um novo atendimento.</p> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </section>;
}