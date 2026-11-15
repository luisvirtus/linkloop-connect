import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, Package, Building2, Users, ReceiptText, Settings2, ScrollText, UserRound, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  { to: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/estoque", label: "Estoque", icon: Package },
  { to: "/admin/clientes", label: "Clientes", icon: Building2 },
  { to: "/admin/vendedores", label: "Vendedores", icon: Users },
  { to: "/admin/comercial", label: "Comercial", icon: ReceiptText },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings2 },
  { to: "/admin/auditoria", label: "Auditoria", icon: ScrollText },
] as const;

function AdminLayout() {
  return (
    <main className="system-ui min-h-screen bg-background lg:pl-60">
      <aside className="system-navigation border-b border-border bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-b-0">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display font-bold">
              <QrCode className="h-5 w-5 text-primary" /> Plaquinhas QR
            </div>
            <ShieldCheck className="size-4 text-muted-foreground" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Administração</p>
          <nav className="mt-6 flex gap-1 overflow-x-auto lg:flex-col">
            {MENU.map((item) => (
              <Button key={item.to} asChild variant="ghost" className="h-10 justify-start px-3 lg:w-full"><Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: (item as any).exact ?? false }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
                className="flex shrink-0 items-center gap-2 rounded-md text-sm font-medium text-muted-foreground"
              >
                <item.icon className="size-4" />{item.label}
              </Link></Button>
            ))}
          </nav>
        </div>
      </aside>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-5 lg:px-8"><span className="text-sm text-muted-foreground">Gestão da operação</span><Button asChild variant="outline" size="sm"><Link to="/painel"><UserRound />Minha conta</Link></Button></header>
      <div className="mx-auto min-w-0 max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <Outlet />
      </div>
    </main>
  );
}
