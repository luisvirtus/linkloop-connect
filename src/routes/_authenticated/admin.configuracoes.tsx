import { SystemPageHeading } from "@/components/system-page";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getSettings, resetSettings, saveSettings } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { BadgePercent, CircleDollarSign, RotateCcw, Save, Settings2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — Plaquinhas QR" },
    { name: "description", content: "Preços e percentuais de comissão." },
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
  const reset = useServerFn(resetSettings);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => fetchSettings({ data: {} } as any),
  });

  const [form, setForm] = useState({
    plate_price: 0,
    subscription_price: 0,
    commission_sale_percent: 0,
    commission_renewal_percent: 0,
    waiter_monthly_price: 0, waiter_annual_price: 0, menu_monthly_price: 0, menu_annual_price: 0,
  });

  useEffect(() => {
    if (data) setForm({
      plate_price: Number(data.plate_price),
      subscription_price: Number(data.subscription_price),
      commission_sale_percent: Number(data.commission_sale_percent),
      commission_renewal_percent: Number(data.commission_renewal_percent),
      waiter_monthly_price: Number(data.waiter_monthly_price ?? 0), waiter_annual_price: Number(data.waiter_annual_price ?? 0),
      menu_monthly_price: Number(data.menu_monthly_price ?? 0), menu_annual_price: Number(data.menu_annual_price ?? 0),
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const values = Object.values(form);
      if (values.some((value) => !Number.isFinite(value) || value < 0)) {
        throw new Error("Informe apenas valores iguais ou maiores que zero.");
      }
      if (form.commission_sale_percent > 100 || form.commission_renewal_percent > 100) {
        throw new Error("Os percentuais de comissão não podem passar de 100%.");
      }
      return save({ data: form });
    },
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetMutation = useMutation({ mutationFn: () => reset({ data: {} } as never), onSuccess: () => { toast.success("Configurações padrão restauradas."); qc.invalidateQueries({ queryKey: ["admin"] }); }, onError: (e: Error) => toast.error(e.message) });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando configurações...</p>;
  if (error) return <p className="text-sm text-destructive">Não foi possível carregar as configurações.</p>;

  return (
    <div className="max-w-4xl space-y-6">
      <SystemPageHeading title="Configurações" />

      <section className="management-section">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Preços</h2>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Preço da Plaquinha (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.plate_price} onChange={e => setForm({...form, plate_price: Number(e.target.value)})} />
          </Field>
          <Field label="Valor da Anuidade (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.subscription_price} onChange={e => setForm({...form, subscription_price: Number(e.target.value)})} />
          </Field>
          <Field label="Chamar atendente — mensal por plaquinha (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.waiter_monthly_price} onChange={e => setForm({...form, waiter_monthly_price: Number(e.target.value)})} />
          </Field>
          <Field label="Chamar atendente — anual por plaquinha (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.waiter_annual_price} onChange={e => setForm({...form, waiter_annual_price: Number(e.target.value)})} />
          </Field>
          <Field label="Cardápio — mensal por plaquinha (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.menu_monthly_price} onChange={e => setForm({...form, menu_monthly_price: Number(e.target.value)})} />
          </Field>
          <Field label="Cardápio — anual por plaquinha (R$)">
            <input type="number" min="0" step="0.01" className="input" value={form.menu_annual_price} onChange={e => setForm({...form, menu_annual_price: Number(e.target.value)})} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-2">Recursos adicionais: valor multiplicado pelas plaquinhas vinculadas. Deixe 0 para liberar sem cobrança.</p>
        </div>
      </section>

      <section className="management-section">
        <div className="flex items-center gap-2">
          <BadgePercent className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Comissões</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Percentuais aplicados ao vendedor responsável pela plaquinha.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Comissão na Venda (%)">
            <input type="number" min="0" max="100" step="0.01" className="input" value={form.commission_sale_percent} onChange={e => setForm({...form, commission_sale_percent: Number(e.target.value)})} />
          </Field>
          <Field label="Comissão na Renovação (%)">
            <input type="number" min="0" max="100" step="0.01" className="input" value={form.commission_renewal_percent} onChange={e => setForm({...form, commission_renewal_percent: Number(e.target.value)})} />
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" size="lg" disabled={resetMutation.isPending} onClick={() => { if (window.confirm("Restaurar os valores padrão? Os valores atuais serão substituídos.")) resetMutation.mutate(); }}><RotateCcw /> Restaurar padrões</Button>
        <Button
          size="lg"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Save /> {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
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
