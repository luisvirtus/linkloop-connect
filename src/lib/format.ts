export const brl = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));

export const dateBR = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value)) : "—";

export const dateTimeBR = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";

export const PLATE_STATUS_LABEL: Record<string, string> = {
  available: "Disponível",
  reserved: "Reservada",
  sold: "Vendida",
  linked: "Vinculada",
  donated: "Doada",
  lost: "Extraviada",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

export const PLATE_SIZE_LABEL: Record<string, string> = {
  small: "Pequena 10x10",
  medium: "Média 15x15",
  large: "Grande 20x20",
};
