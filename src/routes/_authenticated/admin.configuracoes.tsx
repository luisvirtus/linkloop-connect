import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSettings, saveSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — Plaquinhas QR" },
    { name: "description", content: "Preços, custos e percentuais de comissão." },
    { property: "og:title", content: "Configurações — Plaquinhas QR" },
    { property: "og:description", content: "Configurações comerciais da plataforma." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Config,
});

function Config() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getSettings);
  const save = useServerFn(saveSettings);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => fetchSettings({ data: {} } as any),
  });

  const [form, setForm] = useState({
    plate_price: 0,
    plate_cost: 0,
    subscription_price: 0,
    commission_sale_percent: 0,
    commission_renewal_percent: 0,
  });

  useEffect(() => {
    if (data) setForm({
      plate_price: Number(data.plate_price),
      plate_cost: Number(data.plate_cost),
      subscription_price: Number(data.subscription_price),
      commission_sale_percent: Number(data.commission_sale_percent),
      commission_renewal_percent: Number(data.commission_renewal_percent),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: form }),
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p>Carregando...</p>;

  return (
    <div className="surface-card max-w-2xl p-6">
      <h2 className="font-display text-lg font-bold">Configurações do Sistema</h2>
      <div className="mt-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preço da Plaquinha (R$)">
            <input type="number" step="0.01" className="input" value={form.plate_price} onChange={e => setForm({...form, plate_price: Number(e.target.value)})} />
          </Field>
          <Field label="Custo da Plaquinha (R$)">
            <input type="number" step="0.01" className="input" value={form.plate_cost} onChange={e => setForm({...form, plate_cost: Number(e.target.value)})} />
          </Field>
          <Field label="Valor da Anuidade (R$)">
            <input type="number" step="0.01" className="input" value={form.subscription_price} onChange={e => setForm({...form, subscription_price: Number(e.target.value)})} />
          </Field>
        </div>
        <hr className="border-border" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Comissão na Venda (%)">
            <input type="number" className="input" value={form.commission_sale_percent} onChange={e => setForm({...form, commission_sale_percent: Number(e.target.value)})} />
          </Field>
          <Field label="Comissão na Renovação (%)">
            <input type="number" className="input" value={form.commission_renewal_percent} onChange={e => setForm({...form, commission_renewal_percent: Number(e.target.value)})} />
          </Field>
        </div>
        <Button
          className="mt-4"
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
