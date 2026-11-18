import { describe, expect, it } from "vitest";
import { SESSION_MINUTES, sessionActive, orderTotal, nextServiceStatus, serviceInput } from "./table-service";
describe("atendimento de mesa", () => {
  it("expira exatamente após 90 minutos", () => {
    expect(SESSION_MINUTES).toBe(90);
    expect(sessionActive(new Date(90 * 60000).toISOString(), false, 90 * 60000 - 1)).toBe(true);
    expect(sessionActive(new Date(90 * 60000).toISOString(), false, 90 * 60000)).toBe(false);
  });
  it("liberar mesa invalida acesso anterior", () => expect(sessionActive(new Date(999999).toISOString(), true, 1)).toBe(false));
  it("soma pedidos adicionais sem alterar os anteriores", () => expect(orderTotal([{ p: 22, q: 2 }, { p: 10, q: 1 }]) + orderTotal([{ p: 7, q: 2 }])).toBe(68));
  it("chamado funciona sem cardápio", () => expect(nextServiceStatus("waiter", "sent", "claim")).toBe("claimed"));
  it("pedido funciona sem chamado", () => expect(nextServiceStatus("menu", "sent", "prepare")).toBe("preparing"));
  it("impede assumir novamente", () => expect(() => nextServiceStatus("waiter", "claimed", "claim")).toThrow());
  it("não aceita preço enviado pelo visitante", () => {
    const parsed = serviceInput.parse({ code: "ABC123", token: "00000000-0000-4000-8000-000000000001", requestId: "00000000-0000-4000-8000-000000000002", kind: "menu", items: [{ index: 0, quantity: 2, p: 0 }] });
    expect(parsed.items[0]).not.toHaveProperty("p");
  });
});