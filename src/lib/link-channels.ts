export type LinkChannel = {
  value: string;
  label: string;
  placeholder: string;
  inputMode?: "text" | "tel" | "email" | "url";
};

export const LINK_CHANNELS: LinkChannel[] = [
  { value: "whatsapp", label: "WhatsApp", placeholder: "(11) 99999-9999", inputMode: "tel" },
  { value: "instagram", label: "Instagram", placeholder: "@suaempresa" },
  { value: "facebook", label: "Facebook", placeholder: "facebook.com/suaempresa" },
  { value: "youtube", label: "YouTube", placeholder: "@seucanal" },
  { value: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/suaempresa" },
  { value: "tiktok", label: "TikTok", placeholder: "@suaempresa" },
  { value: "x", label: "X (Twitter)", placeholder: "@suaempresa" },
  { value: "telegram", label: "Telegram", placeholder: "@suaempresa" },
  { value: "email", label: "E-mail", placeholder: "contato@suaempresa.com.br", inputMode: "email" },
  { value: "phone", label: "Telefone", placeholder: "(11) 3333-4444", inputMode: "tel" },
  { value: "maps", label: "Localização", placeholder: "Link do Google Maps", inputMode: "url" },
  { value: "website", label: "Site", placeholder: "suaempresa.com.br", inputMode: "url" },
  { value: "other", label: "Outro link", placeholder: "https://...", inputMode: "url" },
];

const PROFILE_BASE: Record<string, string> = {
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  youtube: "https://youtube.com/",
  linkedin: "https://linkedin.com/in/",
  tiktok: "https://tiktok.com/@",
  x: "https://x.com/",
  telegram: "https://t.me/",
};

function webUrl(value: string) {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(candidate);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Informe um endereço válido.");
  return parsed.toString();
}

function brazilianNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13 || !digits.startsWith("55")) {
    throw new Error("Informe um telefone brasileiro com DDD.");
  }
  return digits;
}

export function normalizeLinkValue(kind: string, rawValue: string) {
  const value = rawValue.trim();
  if (!value) throw new Error("Preencha o contato ou endereço.");

  if (kind === "whatsapp") {
    const fromUrl = value.match(/(?:wa\.me\/|phone=)(\d+)/i)?.[1] ?? value;
    return `https://wa.me/${brazilianNumber(fromUrl)}`;
  }
  if (kind === "phone") return `tel:+${brazilianNumber(value.replace(/^tel:\+?/i, ""))}`;
  if (kind === "email") {
    const email = value.replace(/^mailto:/i, "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
    return `mailto:${email}`;
  }
  if (PROFILE_BASE[kind]) {
    if (/^(https?:\/\/|www\.)/i.test(value)) return webUrl(value);
    const handle = value.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
    if (!handle || /\s/.test(handle)) throw new Error("Informe um usuário ou endereço válido.");
    return `${PROFILE_BASE[kind]}${kind === "youtube" && value.startsWith("@") ? "@" : ""}${handle}`;
  }
  return webUrl(value);
}

export function editableLinkValue(kind: string, value: string) {
  if (kind === "whatsapp") return value.match(/wa\.me\/(\d+)/i)?.[1] ?? value;
  if (kind === "phone") return value.replace(/^tel:\+?/i, "");
  if (kind === "email") return value.replace(/^mailto:/i, "");
  return value;
}

export function channelFor(kind: string) {
  return LINK_CHANNELS.find((channel) => channel.value === kind) ?? LINK_CHANNELS[LINK_CHANNELS.length - 1];
}