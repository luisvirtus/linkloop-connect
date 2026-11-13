export function publicChannelEnabled(expired: boolean, kind: string) { return kind === "google" || !expired; }
type MoneyRow = { amount: number | string; status: string; kind?: string; sale_id?: string | null };
export function financialTotals(payments: MoneyRow[], commissions: MoneyRow[]) {
  const total = (rows: MoneyRow[], status: string) => rows.filter(r => r.status === status).reduce((s, r) => s + Number(r.amount), 0);
  const received = total(payments, "paid");
  const commissionsPaid = total(commissions, "paid");
  return { received, pending: total(payments, "pending"), commissionsPaid, commissionsPending: total(commissions, "pending"), netReceived: received - commissionsPaid,
    platesReceived: total(payments.filter(p => p.kind === "plate"), "paid"), subscriptionsReceived: total(payments.filter(p => p.kind === "subscription" || p.kind === "renewal"), "paid") };
}