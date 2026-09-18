import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccount } from "@/lib/account.functions";
import { ArrowLeft } from "lucide-react";
// We reuse the CompanyPanel logic from painel.tsx but wrapped as admin
// To keep it simple, we'll just show a message and the actual panel could be extracted to a component later
// But for now, let's just implement the route so it doesn't 404.

export const Route = createFileRoute("/_authenticated/admin/cliente/$companyId")({
  component: ImpersonationPage,
});

function ImpersonationPage() {
  const { companyId } = Route.useParams();
  const fetchAccount = useServerFn(getAccount);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "impersonate", companyId],
    queryFn: () => fetchAccount({ data: { companyId } }),
  });

  if (isLoading) return <p>Carregando...</p>;
  if (error) return <p className="text-destructive">Erro: {(error as Error).message}</p>;
  if (!data) return <p>Cliente não encontrado.</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/clientes" className="flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </Link>
        <div className="rounded-full bg-amber-100 px-4 py-1 text-xs font-bold text-amber-800">
          MODO ADMIN: Visualizando como {data.company?.name}
        </div>
      </div>
      
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/30 p-8 text-center">
         <h1 className="text-xl font-bold">Painel do Cliente (Modo Suporte)</h1>
         <p className="mt-2 text-muted-foreground">Você está visualizando a conta de <strong>{data.name}</strong> ({data.email})</p>
         <p className="mt-4 text-sm">
            Aqui o administrador poderia gerenciar a página do cliente diretamente.
            Por segurança e simplicidade nesta versão, utilize as ações na lista de clientes e estoque.
         </p>
         <Link to="/admin/clientes" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-semibold text-primary-foreground">
            Voltar para Administração
         </Link>
      </div>
    </div>
  );
}
