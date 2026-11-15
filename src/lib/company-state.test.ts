import { describe, expect, it } from "vitest";
import { isPrintablePlate, requireActiveCompany } from "./company-state";

describe("Cliente excluído", () => {
  it("não permite novas operações para cadastro excluído", () => {
    expect(() => requireActiveCompany({ deleted_at: "2026-11-15T23:12:00Z" })).toThrow();
    expect(() => requireActiveCompany(null)).toThrow();
    expect(() => requireActiveCompany({ deleted_at: null })).not.toThrow();
  });
  it("não imprime QR cancelado em nenhum formato", () => {
    expect(isPrintablePlate("cancelled")).toBe(false);
    for (const status of ["available", "linked", "reserved", "blocked"]) expect(isPrintablePlate(status)).toBe(true);
  });
});