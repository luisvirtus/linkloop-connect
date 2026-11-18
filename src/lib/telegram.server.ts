import { createHash, timingSafeEqual } from "node:crypto";

export function webhookSecret() {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("Bot do Telegram não configurado.");
  return createHash("sha256").update(`votona-webhook:${token}`).digest("hex");
}
export function verifyWebhook(value: string) {
  if (!value || !process.env["TELEGRAM_BOT_TOKEN"]) return false;
  const expected = Buffer.from(webhookSecret());
  const actual = Buffer.from(value);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export async function telegram(method: string, body: Record<string, unknown>) {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  if (!token) throw new Error("Bot do Telegram não configurado.");
  // Never log the URL: Telegram embeds the credential in it.
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  } catch { throw new Error("Não foi possível conectar ao Telegram. Tente novamente."); }
  const result = await response.json() as { ok: boolean; description?: string; result?: any };
  if (!response.ok || !result.ok) throw new Error(`Telegram (${response.status}): ${result.description ?? "falha no envio"}`);
  return result.result;
}
export function serviceKeyboard(id: string, kind: string, status: string) {
  const step = kind === "waiter"
    ? status === "sent" ? ["🙋 Atender", "claim"] : status === "claimed" ? ["✅ Concluído", "done"] : null
    : status === "sent" ? ["👨‍🍳 Em preparo", "prepare"] : status === "preparing" ? ["✅ Entregue", "deliver"] : null;
  return { inline_keyboard: status === "closed" ? [] : [
    ...(step ? [[{ text: step[0], callback_data: `${step[1]}:${id}` }]] : []),
    [{ text: "🏁 Liberar mesa", callback_data: `close:${id}` }],
  ] };
}