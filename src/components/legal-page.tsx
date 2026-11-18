import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="system-ui min-h-screen bg-background">
      <header className="mx-auto flex max-w-3xl items-center gap-2 px-5 py-5 font-display text-lg font-bold">
        <Link to="/" className="flex items-center gap-2"><BrandLogo className="h-7 w-7" />Votona</Link>
      </header>
      <article className="mx-auto max-w-3xl space-y-4 px-5 pb-16 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_a]:text-primary [&_a]:underline">
        <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
        <p>Última atualização: {updated}</p>
        {children}
      </article>
    </main>
  );
}

export function LegalLinks() {
  return (
    <nav className="mt-3 flex justify-center gap-4 text-xs text-muted-foreground">
      <Link to="/termos" className="hover:underline">Termos de Uso</Link>
      <Link to="/privacidade" className="hover:underline">Política de Privacidade</Link>
    </nav>
  );
}
