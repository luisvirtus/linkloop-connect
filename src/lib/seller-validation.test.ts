import { describe, expect, it } from "vitest";
import { sellerFormSchema, sellerSaveSchema } from "./seller-validation";

const valid = { name: "Vendedor", email: "vendedor@example.com", contact: { whatsapp: "41988083645", document: "52998224725", cep: "80010000", street: "Rua teste", number: "10", complement: "", district: "Centro", city: "Curitiba", state: "PR" } };
describe("cadastro obrigatório do vendedor", () => {
  it.each(["whatsapp", "document", "cep", "street", "number", "district", "city", "state"] as const)("exige %s no cliente e no servidor", key => {
    const input = { ...valid, contact: { ...valid.contact, [key]: "" } };
    expect(sellerFormSchema.safeParse(input).success).toBe(false);
    expect(sellerSaveSchema.safeParse(input).success).toBe(false);
  });
  it("aceita cadastro completo com complemento opcional", () => {
    expect(sellerFormSchema.safeParse(valid).success).toBe(true);
    expect(sellerSaveSchema.safeParse(valid).success).toBe(true);
  });
  it.each(["name", "email"] as const)("exige %s", key => {
    expect(sellerFormSchema.safeParse({ ...valid, [key]: "" }).success).toBe(false);
    expect(sellerSaveSchema.safeParse({ ...valid, [key]: "" }).success).toBe(false);
  });
  it("rejeita documento inválido nos dois lados", () => {
    const input = { ...valid, contact: { ...valid.contact, document: "12345678900" } };
    expect(sellerFormSchema.safeParse(input).success).toBe(false);
    expect(sellerSaveSchema.safeParse(input).success).toBe(false);
  });
});