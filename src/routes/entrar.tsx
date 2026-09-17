import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

type Search = { next?: string; code?: string };

export const Route = createFileRoute("/entrar")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    next: typeof search.next === "string" ? search.next : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Plaquinhas QR" },
      { name: "description", content: "Acesse sua conta para vincular a plaquinha e configurar sua página." },
      { property: "og:title", content: "Entrar — Plaquinhas QR" },
      { property: "og:description", content: "Acesse com o Google e configure sua plaquinha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/entrar" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const go = () => {
      const next = search.next ?? "/painel";
      navigate({ to: next as string, search: search.code ? { code: search.code } : undefined as never });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) go();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    setLoading(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error) {
      toast.error("Não foi possível entrar com o Google. Tente novamente.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="surface-card w-full max-w-sm p-8 text-center">
        <QrCode className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-4 font-display text-2xl font-bold">Entrar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use sua conta Google. É rápido e não precisa criar senha.
        </p>
        <button
          onClick={signIn}
          disabled={loading}
          className="mt-7 w-full rounded-full bg-primary px-6 py-3 text-base font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Abrindo..." : "Continuar com o Google"}
        </button>
      </div>
    </main>
  );
}
