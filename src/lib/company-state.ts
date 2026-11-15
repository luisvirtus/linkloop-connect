export function requireActiveCompany(company: { deleted_at: string | null } | null | undefined) {
  if (!company || company.deleted_at !== null) throw new Error("Cliente excluído ou não encontrado.");
}

export function isPrintablePlate(status: string) {
  return status !== "cancelled";
}