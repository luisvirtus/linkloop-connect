import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getTelegramSettings, saveTelegramSettings, registerTelegramWebhook } from "@/lib/table-service.functions";

export function TelegramSettings({ companyId, admin }: { companyId: string; admin: boolean }) {
  const get = useServerFn(getTelegramSettings);
  const q = useQuery({ queryKey: ["telegram-settings", companyId], queryFn: () => get({ data: { companyId } }) });
  if (q.isPending) return <p className="text-sm text-muted-foreground">Carregando Telegram…</p>;
  if (q.error) return <p role="alert" className="text-destructive">{q.error.message}</p>;
  return <SettingsForm key={`${companyId}-${q.data?.chat_id}-${q.data?.waiter_enabled}`} companyId={companyId} admin={admin} initial={q.data} onSaved={() => q.refetch()} />;
}
function SettingsForm({ companyId, admin, initial, onSaved }: { companyId: string; admin: boolean; initial: { chat_id: string; waiter_enabled: boolean } | null | undefined; onSaved: () => void }) {
  const save = useServerFn(saveTelegramSettings);
  const register = useServerFn(registerTelegramWebhook);
  const [chatId, setChatId] = useState(initial?.chat_id ?? "");
  const [enabled, setEnabled] = useState(initial?.waiter_enabled ?? false);
  const [verification, setVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const m = useMutation({ mutationFn: () => save({ data: { companyId, chatId, waiterEnabled: enabled, verificationCode } }), onSuccess: (r) => { if (r.verificationRequired) { setVerification(true); toast.success("Código enviado ao grupo. Informe abaixo para confirmar."); } else { toast.success("Grupo conectado."); onSaved(); } }, onError: (e: Error) => toast.error(e.message) });
  const w = useMutation({ mutationFn: () => register(), onSuccess: () => toast.success("Botões do Telegram conectados."), onError: (e: Error) => toast.error(e.message) });
  return <div className="management-section space-y-3">
    <h2 className="font-display text-lg font-bold">Atendimento no Telegram</h2>
    <a href="https://t.me/VotonaAtende_bot?startgroup=true" target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary">Adicionar @VotonaAtende_bot ao grupo da equipe</a>
    <label className="block text-sm font-semibold">ID do grupo<input className="input mt-1" value={chatId} maxLength={21} placeholder="-100…" onChange={(e) => setChatId(e.target.value)} /></label>
    <p className="text-xs text-muted-foreground">Após conectar os botões, envie /id no grupo para consultar o número.</p>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Habilitar chamar atendente (opcional)</label>
    {verification ? <label className="block text-sm font-semibold">Código recebido no grupo<input className="input mt-1" inputMode="numeric" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} /></label> : null}
    <Button disabled={m.isPending || !chatId} onClick={() => m.mutate()}>{m.isPending ? "Conectando…" : "Salvar e testar grupo"}</Button>
    {admin ? <div className="border-t border-border pt-3"><Button variant="outline" disabled={w.isPending} onClick={() => w.mutate()}>Conectar botões do Telegram após publicar</Button></div> : null}
  </div>;
}