import { describe, expect, it, vi } from "vitest";
import { removeCompany } from "./company-removal";

describe("Exclusão de cliente", () => {
  it("invalida as plaquinhas pela operação atômica, sem excluir financeiro separadamente", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn();
    const result = await removeCompany({ rpc, from } as Parameters<typeof removeCompany>[0], "cliente-teste");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("remove_company", { _company_id: "cliente-teste" });
    expect(from).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
  it("não informa sucesso quando a exclusão é recusada", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: { message: "Acesso restrito ao administrador." } });
    await expect(removeCompany({ rpc }, "cliente-teste")).rejects.toThrow("Acesso restrito ao administrador.");
  });
});