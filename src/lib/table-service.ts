import { z } from "zod";

export const SESSION_MINUTES = 90;
export const serviceInput = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/),
  token: z.string().uuid(),
  requestId: z.string().uuid(),
  kind: z.enum(["waiter", "menu"]),
  items: z.array(z.object({ index: z.number().int().min(0).max(149), quantity: z.number().int().min(1).max(99) })).max(150),
});
export function sessionActive(expiresAt: string, closed: boolean, now = Date.now()) {
  return !closed && new Date(expiresAt).getTime() > now;
}
export function orderTotal(items: { p: number; q: number }[]) {
  return items.reduce((sum, item) => sum + Math.round(item.p * 100) * item.q, 0) / 100;
}
export function nextServiceStatus(kind: string, status: string, action: string) {
  if (kind === "waiter" && status === "sent" && action === "claim") return "claimed";
  if (kind === "waiter" && status === "claimed" && action === "done") return "done";
  if (kind === "menu" && status === "sent" && action === "prepare") return "preparing";
  if (kind === "menu" && status === "preparing" && action === "deliver") return "delivered";
  throw new Error("Este atendimento já foi atualizado.");
}