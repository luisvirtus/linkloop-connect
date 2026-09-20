import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCompanies } from "@/lib/admin.functions";
import { dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({ meta: [
    { title: "Clientes — Plaquinhas QR" },
    { name: "description", content: "Clientes, plaquinhas vinculadas e assinaturas." },
    { property: "og:title", content: "Clientes — Plaquinhas QR" },
    { property: "og:description", content: "Gestão de clientes e assinaturas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Clients,
});

function Clients() {
  const navigate = useNavigate();
  const fetchCompanies = useServerFn(listCompanies);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "companies"],
    queryFn: () => fetchCompanies({ data: {} } as never),
  });

  return (
    <div className="surface-card p-6">
      <h2 className="font-display text-lg font-bold">Clientes</h2>
      {isLoading ? <p className="mt-4 text-sm text-muted-foreground">Carregando...</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Empresa</th>
              <th>Responsável</th>
              <th>Plaquinhas</th>
              <th>Assinatura</th>
              <th>Desde</th>
              <th>Suporte</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="py-2 font-semibold">{c.name}</td>
                <td>{c.owner_email ?? c.owner_name ?? "—"}</td>
                <td>{c.codes.join(", ") || "—"}</td>
                <td>
                  {c.expires_at ? (
                    <span className={c.active ? "text-primary" : "text-destructive"}>
                      {c.active ? "Ativa" : "Vencida"} até {dateBR(c.expires_at)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{dateBR(c.created_at)}</td>
                <td>
                  <button
                    className="text-xs font-semibold text-primary"
                    onClick={() => navigate({ to: "/admin/cliente/$companyId", params: { companyId: c.id } })}
                  >
                    Entrar como cliente
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
