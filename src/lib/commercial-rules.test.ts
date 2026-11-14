import { describe, expect, it } from "vitest";
import { financialTotals, publicChannelEnabled } from "./commercial-rules";
import { emptyContact, parseContact, requireAnnualConsent, validDocument } from "./registration";

describe("Regras aprovadas", () => {
  it("mantém avaliação Google funcional quando a assinatura vence", () => { expect(publicChannelEnabled(true, "google")).toBe(true); });
  it("desativa canais adicionais vencidos", () => { for (const kind of ["whatsapp", "website", "instagram", "phone"]) expect(publicChannelEnabled(true, kind)).toBe(false); });
  it("reativa adicionais após renovação", () => { expect(publicChannelEnabled(false, "whatsapp")).toBe(true); });
  it("exige aceite explícito", () => { expect(() => requireAnnualConsent(false, 99, 99)).toThrow(); });
  it("exige aceite do preço anual vigente", () => { expect(() => requireAnnualConsent(true, 99, 100)).toThrow(); expect(() => requireAnnualConsent(true, 99, 99)).not.toThrow(); });
  it("valida CPF ou CNPJ", () => { expect(validDocument("529.982.247-25")).toBe(true); expect(validDocument("11.222.333/0001-81")).toBe(true); expect(validDocument("11111111111")).toBe(false); expect(validDocument("52998224724")).toBe(false); });
  it("exige WhatsApp e endereço completo", () => { expect(() => parseContact(emptyContact)).toThrow(); const c = parseContact({ ...emptyContact, whatsapp: "(11) 99999-9999", document: "52998224725", cep: "01001-000", street: "Praça", number: "1", district: "Centro", city: "São Paulo", state: "sp" }); expect(c.whatsapp).toBe("11999999999"); expect(c.state).toBe("SP"); });
  it("separa recebimentos e comissões pagas sem custo unitário", () => {
    const totals = financialTotals([{ amount: 80, kind: "plate", status: "paid" }, { amount: 99, kind: "renewal", status: "pending" }, { amount: 50, kind: "plate", status: "refunded" }], [{ amount: 8, status: "paid" }, { amount: 4.95, status: "pending" }]);
    expect(totals.received).toBe(80); expect(totals.pending).toBe(99); expect(totals.netReceived).toBe(72); expect(totals.commissionsPending).toBe(4.95);
  });
});