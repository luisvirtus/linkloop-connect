import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { serviceInput } from "./table-service";
import { brl } from "./format";

export const openTableSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ code: z.string().regex(/^[A-Z0-9]{6}$/), token: z.string().uuid().nullable() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("open_table_session", { _code: data.code, ...(data.token ? { _token: data.token } : {}) });
    if (error) throw new Error(error.message);
    return result as { token: string; expiresAt: string; total: number };
  });

export const sendTableRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => serviceInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { telegram, serviceKeyboard } = await import("./telegram.server");
    const { data: result, error } = await supabaseAdmin.rpc("create_table_request", { _code: data.code, _token: data.token, _id: data.requestId, _kind: data.kind, _items: data.items });
    if (error) throw new Error(error.message);
    const r = result as any;
    if (r.duplicate) {
      if (["pending", "failed"].includes(r.status)) throw new Error("O envio anterior não foi confirmado. Aguarde e tente novamente.");
      return { ok: true, total: null as number | null };
    }
    const text = [
      data.kind === "waiter" ? "🔔 CHAMADO DE ATENDIMENTO" : r.orderCount > 1 ? "🍽️ PEDIDO ADICIONAL" : "🍽️ NOVO PEDIDO",
      `📍 ${r.label}`, `⏰ ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
      ...(r.items as { n: string; q: number; p: number }[]).map((x) => `• ${x.q}x ${x.n} — ${brl(x.q * x.p)}`),
      ...(data.kind === "menu" ? [`Subtotal: ${brl(r.subtotal)}`, `Total acumulado: ${brl(r.total)} (${r.orderCount} pedido(s))`] : []),
    ].join("\n");
    let sent;
    try { sent = await telegram("sendMessage", { chat_id: r.chatId, text, reply_markup: serviceKeyboard(data.requestId, data.kind, "sent") }); }
    catch (error) {
      await supabaseAdmin.from("table_requests").update({ status: "failed" }).eq("id", data.requestId);
      throw error;
    }
    const saved = await supabaseAdmin.from("table_requests").update({ status: "sent", message_id: sent.message_id }).eq("id", data.requestId);
    if (saved.error) throw new Error("Telegram recebeu o envio, mas o registro falhou. Não repita; avise a equipe.");
    return { ok: true, total: Number(r.total) as number | null };
  });

export const getTelegramSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ companyId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: cfg, error } = await context.supabase.from("telegram_service_settings").select("chat_id,waiter_enabled").eq("company_id", data.companyId).maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Telegram.");
    return cfg;
  });

export const saveTelegramSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ companyId: z.string().uuid(), chatId: z.string().trim().regex(/^-\d{5,20}$/, "Informe o ID numérico do grupo (começa com -)."), waiterEnabled: z.boolean(), verificationCode: z.string().trim().max(12).optional() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: company } = await context.supabase.from("companies").select("owner_id,deleted_at").eq("id", data.companyId).maybeSingle();
    const { data: admin } = await context.supabase.rpc("is_admin");
    if (!company || company.deleted_at || (company.owner_id !== context.userId && !admin)) throw new Error("Acesso negado.");
    const { telegram } = await import("./telegram.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createHash, randomInt } = await import("node:crypto");
    const { data: current } = await context.supabase.from("telegram_service_settings").select("chat_id").eq("company_id", data.companyId).maybeSingle();
    if (current?.chat_id !== data.chatId) {
      if (!data.verificationCode) {
        const chat = await telegram("getChat", { chat_id: data.chatId });
        if (!["group", "supergroup"].includes(chat.type)) throw new Error("Escolha um grupo da equipe.");
        const code = String(randomInt(100000, 1000000));
        const saved = await supabaseAdmin.from("telegram_pairings").upsert({ company_id: data.companyId, user_id: context.userId, chat_id: data.chatId, code_hash: createHash("sha256").update(code).digest("hex"), expires_at: new Date(Date.now() + 10 * 60000).toISOString() });
        if (saved.error) throw new Error("Não foi possível iniciar a confirmação.");
        await telegram("sendMessage", { chat_id: data.chatId, text: `Confirmação Votona: ${code}\nDigite este código no painel do estabelecimento. Válido por 10 minutos. Não compartilhe fora da equipe.` });
        return { ok: false, verificationRequired: true };
      }
      const { data: pairing } = await supabaseAdmin.from("telegram_pairings").select("*").eq("company_id", data.companyId).maybeSingle();
      if (!pairing || pairing.user_id !== context.userId || pairing.chat_id !== data.chatId || new Date(pairing.expires_at).getTime() <= Date.now() || pairing.code_hash !== createHash("sha256").update(data.verificationCode).digest("hex")) throw new Error("Código incorreto ou expirado. Solicite outro código.");
      await supabaseAdmin.from("telegram_pairings").delete().eq("company_id", data.companyId);
    }
    const { error } = await context.supabase.from("telegram_service_settings").upsert({ company_id: data.companyId, chat_id: data.chatId, waiter_enabled: data.waiterEnabled });
    if (error) throw new Error("Não foi possível salvar o grupo.");
    return { ok: true, verificationRequired: false };
  });

export const registerTelegramWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin } = await context.supabase.rpc("is_admin");
    if (!admin) throw new Error("Acesso exclusivo do administrador.");
    const { telegram, webhookSecret } = await import("./telegram.server");
    const url = "https://www.votona.com.br/api/public/telegram/webhook";
    const check = await fetch(url, { redirect: "manual" });
    if (!check.ok || await check.text() !== "Votona Telegram webhook") throw new Error("Publique esta versão antes de conectar o recebimento do Telegram.");
    await telegram("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["callback_query", "message"] });
    return { ok: true };
  });