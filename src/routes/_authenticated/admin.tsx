import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const MENU = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/estoque", label: "Estoque" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/vendedores", label: "Vendedores" },
  { to: "/admin/comercial", label: "Comercial" },
  { to: "/admin/configuracoes", label: "Configurações" },
  { to: "/admin/auditoria", label: "Auditoria" },
] as const;

function AdminLayout() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-bold">
              <ShieldCheck className="h-5 w-5 text-primary" /> Administração
            </div>
            <Link to="/painel" className="text-sm font-semibold text-primary">
              Minha conta
            </Link>
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {MENU.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: (item as any).exact ?? false }}
                activeProps={{ className: "bg-primary text-primary-foreground" }}
                className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </div>
    </main>
  );
}
