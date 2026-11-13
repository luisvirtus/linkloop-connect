import { z } from "zod";

export const emptyContact = { whatsapp: "", document: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" };
export type Contact = typeof emptyContact;
const digits = (value: string) => value.replace(/\D/g, "");
export function validDocument(value: string) {
  const d = digits(value);
  if (!/^\d{11}$|^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => { const rest = [...base].reduce((s, n, i) => s + Number(n) * (weights[i] ?? 0), 0) % 11; return rest < 2 ? 0 : 11 - rest; };
  if (d.length === 11) return calc(d.slice(0, 9), [10,9,8,7,6,5,4,3,2]) === Number(d[9]) && calc(d.slice(0, 10), [11,10,9,8,7,6,5,4,3,2]) === Number(d[10]);
  return calc(d.slice(0,12), [5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[12]) && calc(d.slice(0,13), [6,5,4,3,2,9,8,7,6,5,4,3,2]) === Number(d[13]);
}
const text = z.string().trim().max(160);
export const contactSchema = z.object({
  whatsapp: text.transform(digits).refine(v => /^(?:55)?\d{10,11}$/.test(v), "Informe WhatsApp com DDD."),
  document: text.transform(digits).refine(validDocument, "Informe um CPF ou CNPJ válido."),
  cep: text.transform(digits).refine(v => /^\d{8}$/.test(v), "Informe CEP com 8 dígitos."),
  street: text.min(1, "Informe o logradouro."), number: text.min(1, "Informe o número ou S/N."),
  complement: text, district: text.min(1, "Informe o bairro."), city: text.min(1, "Informe a cidade."),
  state: text.transform(v => v.toUpperCase()).refine(v => ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].includes(v), "Informe a UF."),
});
export function parseContact(value: unknown): Contact {
  const result = contactSchema.safeParse(value);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Confira o cadastro.");
  return result.data;
}
export function requireAnnualConsent(accepted: boolean, acceptedPrice: number, currentPrice: number) {
  if (!accepted || !Number.isFinite(acceptedPrice) || acceptedPrice !== currentPrice) throw new Error("Confirme o aceite do valor anual atual.");
}