import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlates } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/impressao")({
  component: Printing,
});

function Printing() {
  const fetchPlates = useServerFn(listPlates);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plates", "available"],
    queryFn: () => fetchPlates({ data: { status: "available" } }),
  });

  if (isLoading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Artes para Impressão</h2>
        <button 
          onClick={() => window.print()}
          className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground print:hidden"
        >
          Imprimir Página
        </button>
      </div>
      
      <p className="text-sm text-muted-foreground print:hidden">
        Abaixo estão as plaquinhas com status <strong>Disponível</strong>. 
        Ao imprimir, certifique-se que o QR Code aponte para <code>{window.location.origin}/q/[CÓDIGO]</code>
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
        {(data?.plates ?? []).map((p: any) => (
          <div key={p.id} className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center bg-white">
            <div className="mb-4 text-2xl font-bold tracking-widest text-primary">{p.qr_code}</div>
            <div className="aspect-square w-48 bg-slate-100 flex items-center justify-center rounded-xl mb-4 border border-border">
              <span className="text-xs text-muted-foreground">QR CODE AQUI</span>
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase">
              Tamanho: {p.size} | ID: {p.serial}
            </div>
            <div className="mt-2 text-[10px] text-slate-400 break-all">
              {window.location.origin}/q/{p.qr_code}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
