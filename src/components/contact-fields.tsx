import { emptyContact, type Contact } from "@/lib/registration";
const fields: { key: keyof Contact; label: string; max: number; numeric?: boolean }[] = [
  { key: "whatsapp", label: "WhatsApp com DDD", max: 20, numeric: true }, { key: "document", label: "CPF ou CNPJ", max: 18, numeric: true },
  { key: "cep", label: "CEP", max: 9, numeric: true }, { key: "street", label: "Logradouro", max: 160 }, { key: "number", label: "Número", max: 20 },
  { key: "complement", label: "Complemento (opcional)", max: 160 }, { key: "district", label: "Bairro", max: 160 }, { key: "city", label: "Cidade", max: 160 }, { key: "state", label: "UF", max: 2 },
];
export function ContactFields({ value, onChange }: { value: Contact; onChange: (value: Contact) => void }) {
  return <div className="grid gap-3 sm:grid-cols-2">{fields.map(f => <label key={f.key} className="grid gap-1 text-sm font-semibold"><span>{f.label}</span><input className="input" required={f.key !== "complement"} maxLength={f.max} inputMode={f.numeric ? "numeric" : "text"} value={value[f.key] ?? ""} onChange={e => onChange({ ...emptyContact, ...value, [f.key]: e.target.value })} /></label>)}</div>;
}