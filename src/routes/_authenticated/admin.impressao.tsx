import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { listBatches } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { PlatePrintArt } from "@/components/plate-print-art";

export const Route = createFileRoute("/_authenticated/admin/impressao")({
  head: () => ({ meta: [
    { title: "Artes para impressão — Plaquinhas QR" },
    { name: "description", content: "Artes com QR Code permanente organizadas por lote e tamanho." },
    { property: "og:title", content: "Artes para impressão — Plaquinhas QR" },
    { property: "og:description", content: "Geração das artes finais das plaquinhas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Printing,
});

function Printing() {
  const fetchBatches = useServerFn(listBatches);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin", "print-batches"],
    queryFn: () => fetchBatches({ data: {} } as never),
  });
  const [batchId, setBatchId] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  useEffect(() => {
    if (!batchId && data[0]?.id) setBatchId(data[0].id);
  }, [batchId, data]);

  const batch = data.find((item: any) => item.id === batchId);

  return (
    <div className="space-y-6">
      <div className="print-controls flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Artes para impressão</h1>
          <label className="mt-4 block text-sm font-semibold">
            Lote
            <select className="input mt-1 min-w-72" value={batchId} onChange={(event) => setBatchId(event.target.value)}>
              <option value="">Selecione um lote</option>
              {data.map((item: any) => (
                <option key={item.id} value={item.id}>{item.label} · {item.plates.length} unidades</option>
              ))}
            </select>
          </label>
        </div>
        <Button onClick={() => window.print()} disabled={!batch || !origin}>
          <Printer /> Imprimir lote
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando lotes...</p> : null}
      {!isLoading && data.length === 0 ? <p className="surface-card p-6 text-sm text-muted-foreground">Crie um lote no estoque antes de gerar as artes.</p> : null}

      {batch && origin ? (
        <div className="print-sheet grid gap-6 sm:grid-cols-2">
          {batch.plates.map((plate: any) => (
            <PlatePrintArt
              key={plate.id}
              origin={origin}
              plate={{
                id: plate.id,
                qrCode: plate.qr_code,
                size: plate.size,
                companyName: plate.company_name,
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}