import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const message = z.object({ message_id: z.number().int(), text: z.string().max(4096).optional(), chat: z.object({ id: z.number().int(), type: z.string() }) });
const updateSchema = z.object({ update_id: z.number().int(), message: message.optional(), callback_query: z.object({ id: z.string().max(200), from: z.object({ id: z.number().int(), first_name: z.string().max(80) }), data: z.string().max(64), message }).optional() });

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: { handlers: {
    GET: () => new Response("Votona Telegram webhook"),
    POST: async ({ request }) => {
      const { verifyWebhook, telegram, serviceKeyboard } = await import("@/lib/telegram.server");
      if (!verifyWebhook(request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "")) return new Response("Unauthorized", { status: 401 });
      if (Number(request.headers.get("content-length") ?? 0) > 20000) return new Response("Too large", { status: 413 });
      const raw = await request.text();
      if (raw.length > 20000) return new Response("Too large", { status: 413 });
      let update;
      try { update = updateSchema.parse(JSON.parse(raw)); } catch { return new Response("Invalid update", { status: 400 }); }
      try {
        if (update.message?.text?.match(/^\/id(?:@VotonaAtende_bot)?$/i) && ["group", "supergroup"].includes(update.message.chat.type)) {
          await telegram("sendMessage", { chat_id: update.message.chat.id, text: `ID deste grupo: ${update.message.chat.id}` });
        }
        const cb = update.callback_query;
        if (!cb) return Response.json({ ok: true });
        const parsed = z.string().regex(/^(claim|done|prepare|deliver|close):[0-9a-f-]{36}$/).safeParse(cb.data);
        if (!parsed.success || !["group", "supergroup"].includes(cb.message.chat.type)) return Response.json({ ok: true });
        const [action, id] = cb.data.split(":");
        if (!id || !action || !z.string().uuid().safeParse(id).success) return Response.json({ ok: true });
        const member = await telegram("getChatMember", { chat_id: cb.message.chat.id, user_id: cb.from.id });
        if (!["creator", "administrator", "member"].includes(member.status)) return Response.json({ ok: true });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: result, error } = await supabaseAdmin.rpc("telegram_table_action", { _id: id, _chat: String(cb.message.chat.id), _message: cb.message.message_id, _action: action, _actor: cb.from.first_name });
        if (error) { await telegram("answerCallbackQuery", { callback_query_id: cb.id, text: "Atendimento indisponível ou não autorizado.", show_alert: true }); return Response.json({ ok: true }); }
        const r = result as { status: string; actor?: string };
        const { data: row } = await supabaseAdmin.from("table_requests").select("kind").eq("id", id).single();
        const labels: Record<string, string> = { claimed: "Em atendimento", done: "Concluído", preparing: "Em preparo", delivered: "Entregue", closed: "Mesa encerrada" };
        const original = (cb.message.text ?? "").split("\n\nStatus:")[0];
        await telegram("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: `${original}\n\nStatus: ${labels[r.status] ?? r.status}${r.actor ? ` — ${r.actor}` : ""}`, reply_markup: serviceKeyboard(id, row?.kind ?? "waiter", r.status) });
        await telegram("answerCallbackQuery", { callback_query_id: cb.id, text: labels[r.status] ?? "Atualizado" });
        return Response.json({ ok: true });
      } catch { return Response.json({ error: "Telegram unavailable" }, { status: 503 }); }
    },
  } },
});