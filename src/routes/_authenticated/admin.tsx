import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const META = [
  { title: "Administração — Plaquinhas QR" },
  { name: "description", content: "Gestão de plaquinhas, clientes, vendas, assinaturas e financeiro." },
  { property: "og:title", content: "Administração — Plaquinhas QR" },
  { property: "og:description", content: "Gestão completa da operação Plaquinhas QR." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
];

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw redirect({ to: "/entrar" });

    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if (error || !roles?.some(({ role }) => role === "admin")) {
      throw redirect({ to: "/painel" });
    }
  },
  head: () => ({ meta: META }),
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
