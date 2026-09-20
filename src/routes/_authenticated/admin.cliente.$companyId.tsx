import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/cliente/$companyId")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/painel",
      search: { companyId: params.companyId },
      replace: true,
    });
  },
  head: () => ({ meta: [
    { title: "Acesso de suporte — Plaquinhas QR" },
    { name: "description", content: "Acesso administrativo ao painel de um cliente." },
    { property: "og:title", content: "Acesso de suporte — Plaquinhas QR" },
    { property: "og:description", content: "Visualização administrativa da conta de um cliente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ImpersonationRedirect,
});

function ImpersonationRedirect() {
  return <p className="text-sm text-muted-foreground">Abrindo o painel do cliente...</p>;
}
