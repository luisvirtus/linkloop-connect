import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAudit } from "@/lib/admin.functions";
import { dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/auditoria")({
  component: Audit,
});

function Audit() {
  const fetchAudit = useServerFn(listAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => fetchAudit({ data: {} } as any),
  });

  return (
    <div className="surface-card p-6">
      <h2 className="font-display text-lg font-bold">Logs de Auditoria</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Data</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>ID</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((l: any) => (
              <tr key={l.id} className="border-t border-border">
                <td className="py-2 whitespace-nowrap">{dateBR(l.created_at)}</td>
                <td>{l.user_label}</td>
                <td className="font-semibold">{l.action}</td>
                <td>{l.entity}</td>
                <td className="text-xs">{l.entity_id}</td>
                <td className="text-xs max-w-xs truncate">{JSON.stringify(l.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
