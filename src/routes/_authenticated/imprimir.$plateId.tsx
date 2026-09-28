import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatePrintArt } from "@/components/plate-print-art";
import { getPrintablePlate } from "@/lib/printing.functions";
import { PLATE_SIZE_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/imprimir/$plateId")({
  head: () => ({ meta: [
    { title: "Imprimir plaquinha — Plaquinhas QR" },
    { name: "description", content: "Prévia e impressão individual da plaquinha com QR Code permanente." },
    { property: "og:title", content: "Imprimir plaquinha — Plaquinhas QR" },
    { property: "og:description", content: "Arte para impressão individual da plaquinha." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrintPlate,
});

function PrintPlate() {
  const { plateId } = Route.useParams();
  const fetchPlate = useServerFn(getPrintablePlate);
  const { data: plate, error, isLoading } = useQuery({
    queryKey: ["print-plate", plateId],
    queryFn: () => fetchPlate({ data: { plateId } }),
  });
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <main className="print-page min-h-screen bg-background px-4 py-6 sm:px-8">
      <div className="print-controls mx-auto mb-6 flex max-w-4xl flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/painel" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" /> Voltar ao painel</Link>
          <h1 className="mt-2 font-display text-2xl font-bold">Imprimir plaquinha</h1>
          {plate ? <p className="mt-1 text-sm text-muted-foreground">{plate.qrCode} · {PLATE_SIZE_LABEL[plate.size] ?? plate.size}</p> : null}
        </div>
        {plate && origin ? <Button type="button" onClick={() => window.print()}><Printer /> Imprimir plaquinha</Button> : null}
      </div>
      {isLoading ? <p className="text-center text-muted-foreground">Carregando arte...</p> : null}
      {error ? <p role="alert" className="text-center text-destructive">{error.message}</p> : null}
      {plate && origin ? <div className="print-preview mx-auto max-w-4xl"><PlatePrintArt plate={plate} origin={origin} /></div> : null}
    </main>
  );
}
