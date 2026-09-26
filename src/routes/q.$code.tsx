import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ComponentType } from "react";
import { ArrowRight, ExternalLink, Globe, Link2, Mail, MapPin, Phone, QrCode, Star } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
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

type ChannelIcon = { icon: ComponentType<{ className?: string }>; color: string };

const ICONS: Record<string, ChannelIcon> = {
  whatsapp: { icon: FaWhatsapp, color: "text-channel-whatsapp" },
  instagram: { icon: FaInstagram, color: "text-channel-instagram" },
  website: { icon: Globe, color: "text-channel-web" },
  google: { icon: Star, color: "text-google-yellow" },
  facebook: { icon: FaFacebookF, color: "text-channel-facebook" },
  youtube: { icon: FaYoutube, color: "text-channel-youtube" },
  linkedin: { icon: FaLinkedinIn, color: "text-channel-linkedin" },
  tiktok: { icon: FaTiktok, color: "text-channel-tiktok" },
  x: { icon: FaXTwitter, color: "text-channel-x" },
  telegram: { icon: FaTelegram, color: "text-channel-telegram" },
  email: { icon: Mail, color: "text-channel-email" },
  phone: { icon: Phone, color: "text-channel-phone" },
  maps: { icon: MapPin, color: "text-channel-maps" },
};

function WebsiteIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  let favicon = "";
  try {
    favicon = `${new URL(url).origin}/favicon.ico`;
  } catch {
    // Invalid legacy URLs keep the neutral website icon.
  }

  if (!favicon || failed) return <Globe className="h-5 w-5 text-channel-web" aria-hidden="true" />;
  return <img src={favicon} alt="" className="h-5 w-5 object-contain" onError={() => setFailed(true)} />;
}

function MulticolorRule({ muted = false }: { muted?: boolean }) {
  return (
    <div className={`flex h-1.5 w-full ${muted ? "opacity-35" : ""}`} aria-hidden="true">
      <span className="flex-1 bg-google-blue" />
      <span className="flex-1 bg-google-red" />
      <span className="flex-1 bg-google-yellow" />
      <span className="flex-1 bg-google-green" />
    </div>
  );
}

function ChannelLink({ href, label, kind }: { href: string; label: string; kind: string }) {
  const channel = ICONS[kind] ?? { icon: Link2, color: "text-channel-web" };
  const Icon = channel.icon;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${label}`}
      className="group flex min-h-16 w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left font-semibold text-card-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-google-blue/30 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className={`h-5 w-5 ${channel.color}`} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 break-words">{label}</span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-google-blue" aria-hidden="true" />
    </a>
  );
}

function Message({ title, text, code }: { title: string; text: string; code?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-8">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-muted"><QrCode className="h-8 w-8 text-primary" aria-hidden="true" /></div>
        <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{text}</p>
        {code ? (
          <Link to="/entrar" search={{ next: "/painel", code }} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Ativar minha plaquinha <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </main>
  );
}

function PublicPage() {
  const page = Route.useLoaderData();
  const { code } = Route.useParams();

  if (page.state === "notfound")
    return <Message title="Plaquinha não encontrada" text="Confira o código do QR." />;
  if (page.state === "unlinked")
    return (
      <Message
        title="Plaquinha ainda não ativada"
        text="Esta plaquinha ainda não está vinculada a uma empresa. Se ela é sua, ative-a para configurar sua página."
        code={code}
      />
    );
  if (page.state === "blocked")
    return <Message title="Página temporariamente indisponível" text="Esta plaquinha está bloqueada." />;

  const expired = page.state === "expired";

  const showWebsite = page.websiteUrl && !page.links.some((link) => link.kind === "website" && link.url === page.websiteUrl);

  return (
    <main className="min-h-screen bg-card sm:flex sm:items-center sm:justify-center sm:bg-muted/55 sm:px-4 sm:py-10">
      <div className="w-full bg-card sm:max-w-md sm:overflow-hidden sm:rounded-lg sm:border sm:border-border sm:shadow-lift">
        <MulticolorRule />
        <div className="mx-auto max-w-md px-5 pb-7 pt-8 sm:px-8 sm:pt-10">
          <header className="text-center">
            {page.logoUrl ? (
              <img
                src={page.logoUrl}
                alt={page.companyName ?? "Logo"}
                className="mx-auto h-20 w-20 rounded-lg border border-border object-contain shadow-sm"
              />
            ) : (
              <div className="google-dots mx-auto flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
                <QrCode className="h-9 w-9 text-google-blue" />
              </div>
            )}
             <h1 className="mt-5 break-words font-display text-2xl font-semibold text-card-foreground">{page.companyName ?? page.title}</h1>
             {page.subtitle ? <p className="mt-1.5 break-words text-sm leading-relaxed text-muted-foreground">{page.subtitle}</p> : null}
          </header>

          {!expired && page.googleReviewUrl ? (
            <section className="mt-8 text-center" aria-labelledby="review-title">
              <div className="flex justify-center gap-1.5 text-google-yellow" aria-label="Cinco estrelas">
                {Array.from({ length: 5 }, (_, index) => <Star key={index} className="h-7 w-7 fill-current" />)}
              </div>
               <h2 id="review-title" className="mt-3 font-display text-lg font-semibold">Como foi sua experiência?</h2>
               <p className="mt-1 text-sm text-muted-foreground">Conte para outras pessoas no Google.</p>
              <a
                href={page.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                 className="mt-5 flex min-h-16 w-full items-center justify-center gap-2 rounded-lg bg-google-blue px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
              >
                <Star className="h-5 w-5" />
                Avalie-nos no Google
              </a>
               <p className="mt-3 text-xs text-muted-foreground">Você será levado ao Google para escrever sua avaliação.</p>
            </section>
          ) : null}

           {showWebsite || page.links.length > 0 ? (
            <section className="mt-8 border-t border-border pt-6" aria-labelledby="channels-title">
               <h2 id="channels-title" className="mb-3 text-left text-sm font-semibold text-card-foreground">Fale com {page.companyName ?? "a empresa"}</h2>
              <div className="space-y-3">
                 {showWebsite && page.websiteUrl ? (
                  <a
                    href={page.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                     aria-label="Abrir site oficial"
                     className="group flex min-h-16 w-full items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 text-left font-semibold text-card-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-google-blue/30 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transform-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <WebsiteIcon url={page.websiteUrl} />
                    </span>
                     <span className="min-w-0 flex-1">Site oficial</span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-google-blue" aria-hidden="true" />
                  </a>
                ) : null}
                {page.links.map((link) => <ChannelLink key={link.id} href={link.url} label={link.label} kind={link.kind} />)}
              </div>
            </section>
          ) : null}

           <p className="mt-7 text-center text-xs text-muted-foreground">Plaquinhas QR</p>
        </div>
        <MulticolorRule muted />
      </div>
    </main>
  );
}
