import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Star, Smartphone, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Plaquinhas QR — Mais avaliações no Google para sua empresa" },
      {
        name: "description",
        content:
          "Plaquinha física com QR Code exclusivo que leva seus clientes direto à avaliação no Google, WhatsApp, Instagram e site.",
      },
      { property: "og:title", content: "Plaquinhas QR — Mais avaliações no Google" },
      {
        property: "og:description",
        content: "Escaneou, vinculou, configurou. Sua página de links pronta em minutos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-lg font-bold">
          <QrCode className="h-6 w-6 text-primary" />
          Plaquinhas QR
        </div>
        <Link
          to={user ? "/painel" : "/entrar"}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {loading ? "Verificando..." : user ? "Minha conta" : "Entrar"}
        </Link>
      </header>

      <section className="gradient-hero mx-auto max-w-5xl rounded-3xl px-6 py-14 text-center sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">
          Avaliações no Google
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight sm:text-5xl">
          Uma plaquinha. Um QR Code. Muito mais avaliações.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground">
          Seu cliente escaneia e cai numa página simples com o botão “Avalie no Google”, WhatsApp,
          Instagram e seu site. Você altera os links quando quiser, sem reimprimir nada.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={user ? "/painel" : "/entrar"}
            className="w-full rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground sm:w-auto"
          >
            {user ? "Acessar meu painel" : "Ativar minha plaquinha"}
          </Link>
          <a
            href="#como-funciona"
            className="w-full rounded-full border border-border px-8 py-3 text-base font-semibold sm:w-auto"
          >
            Como funciona
          </a>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto grid max-w-5xl gap-4 px-5 py-14 sm:grid-cols-3">
        {[
          { icon: Smartphone, title: "1. Escaneie", text: "Leia o QR da sua plaquinha e entre com o Google." },
          { icon: QrCode, title: "2. Vincule", text: "Confirme o nome da empresa e a plaquinha é sua." },
          { icon: Star, title: "3. Configure", text: "Cole o link de avaliação do Google e seus canais." },
        ].map((item) => (
          <div key={item.title} className="surface-card p-6">
            <item.icon className="h-7 w-7 text-primary" />
            <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="surface-card flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-display text-lg font-semibold">Seu QR nunca muda</h3>
            <p className="text-sm text-muted-foreground">
              O código aponta sempre para a plataforma. Mudou o WhatsApp ou o Instagram? Basta editar
              — a plaquinha impressa continua valendo.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Plaquinhas QR
      </footer>
    </main>
  );
}
