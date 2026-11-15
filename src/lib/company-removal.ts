type RemovalClient = {
  rpc: (name: "remove_company", args: { _company_id: string }) => PromiseLike<{ error: { message: string } | null }>;
};

export async function removeCompany(client: RemovalClient, companyId: string): Promise<{ ok: true; deactivated?: boolean }> {
  const { error } = await client.rpc("remove_company", { _company_id: companyId });
  if (error) throw new Error(error.message);
  return { ok: true };
}