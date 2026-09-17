import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, Globe, MessageCircle, Instagram, Link2, QrCode } from "lucide-react";
import { getPublicPage } from "@/lib/public.functions";

export const Route = createFileRoute("/q/$code")({
  loader: ({ params }) => getPublicPage({ data: { code: params.code } }),
  head: ({ loaderData }) => {
    const name = loaderData?.companyName ?? "Página";
    const title = `${name} — Links e avaliação`;
    const description = `Avalie ${name} no Google e acesse os canais oficiais da empresa.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <Message title="Não foi possível abrir esta página" text="Tente novamente em instantes." />,
  notFoundComponent: () => <Message title="Plaquinha não encontrada" text="Confira o código do QR." />,
  component: PublicPage,
});

const ICONS: Record<string, typeof Link2> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  website: Globe,
  google: Star,
};

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="surface-card max-w-sm p-8 text-center">
        <QrCode className="mx-auto h-9 w-9 text-primary" />
        <h1 className="mt-4 font-display text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary">
          Ir para o início
        </Link>
      </div>
    </main>
  );
}

function PublicPage() {
  const page = Route.useLoaderData();

  if (page.state === "notfound")
    return <Message title="Plaquinha não encontrada" text="Confira o código do QR." />;
  if (page.state === "unlinked")
    return (
      <Message
        title="Plaquinha ainda não ativada"
        text="Entre no sistema com a sua conta Google para vincular esta plaquinha à sua empresa."
      />
    );
  if (page.state === "blocked")
    return <Message title="Página temporariamente indisponível" text="Esta plaquinha está bloqueada." />;

  const expired = page.state === "expired";

  return (
    <main className="min-h-screen bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md text-center">
        {page.logoUrl ? (
          <img
            src={page.logoUrl}
            alt={page.companyName ?? "Logo"}
            className="mx-auto h-24 w-24 rounded-2xl object-cover"
          />
        ) : (
          <div className="google-dots mx-auto flex h-24 w-24 items-center justify-center rounded-2xl">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
        )}
        <h1 className="mt-5 font-display text-2xl font-bold">{page.title ?? page.companyName}</h1>
        {page.subtitle ? <p className="mt-2 text-sm text-muted-foreground">{page.subtitle}</p> : null}

        <div className="mt-8 space-y-3">
          {!expired && page.googleReviewUrl ? (
            <a
              href={page.googleReviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-primary-foreground shadow-sm"
            >
              <Star className="h-5 w-5" />
              AVALIE NO GOOGLE
            </a>
          ) : null}

          {page.websiteUrl ? (
            <a
              href={page.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="surface-card flex w-full items-center justify-center gap-2 px-6 py-4 text-base font-semibold"
            >
              <Globe className="h-5 w-5 text-primary" />
              Site oficial
            </a>
          ) : null}

          {page.links.map((link) => {
            const Icon = ICONS[link.kind] ?? Link2;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="surface-card flex w-full items-center justify-center gap-2 px-6 py-4 text-base font-semibold"
              >
                <Icon className="h-5 w-5 text-primary" />
                {link.label}
              </a>
            );
          })}
        </div>

        <p className="mt-10 text-xs text-muted-foreground">Plaquinhas QR</p>
      </div>
    </main>
  );
}
