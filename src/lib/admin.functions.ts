import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context: any) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) {
    console.error("Não foi possível validar o perfil administrativo.", error);
    throw new Error("Não foi possível validar seu acesso. Tente novamente.");
  }
  if (!isAdmin) throw new Error("Acesso restrito ao administrador.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function audit(db: any, userId: string, action: string, entity: string, entityId?: string | null, details?: any) {
  await db.from("audit_logs").insert({ user_id: userId, action, entity, entity_id: entityId ?? null, details: details ?? null });
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len = 6) {
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [plates, companies, subs, sales, payments, commissions, settings] = await Promise.all([
      db.from("plates").select("status, cost, blocked_by_admin, blocked_by_client"),
      db.from("companies").select("id"),
      db.from("subscriptions").select("status, expires_at, amount"),
      db.from("sales").select("amount, cost, payment_status"),
      db.from("payments").select("amount, status, kind"),
      db.from("commissions").select("amount, status"),
      db.from("settings").select("*").eq("id", true).maybeSingle(),
    ]);

    const plateRows = plates.data ?? [];
    const byStatus: Record<string, number> = {};
    for (const p of plateRows) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    const blocked = plateRows.filter((p: any) => p.blocked_by_admin || p.blocked_by_client).length;

    const subRows = subs.data ?? [];
    const now = Date.now();
    const subsActive = subRows.filter((s: any) => new Date(s.expires_at).getTime() > now).length;
    const subsExpired = subRows.length - subsActive;

    const saleRows = sales.data ?? [];
    const revenuePlates = saleRows.reduce((a: number, s: any) => a + Number(s.amount), 0);
    const costPlates = saleRows.reduce((a: number, s: any) => a + Number(s.cost), 0);

    const paymentRows = payments.data ?? [];
    const received = paymentRows.filter((p: any) => p.status === "paid").reduce((a: number, p: any) => a + Number(p.amount), 0);
    const pending = paymentRows.filter((p: any) => p.status === "pending").reduce((a: number, p: any) => a + Number(p.amount), 0);
    const revenueSubscriptions = paymentRows
      .filter((p: any) => p.status === "paid" && (p.kind === "subscription" || p.kind === "renewal"))
      .reduce((a: number, p: any) => a + Number(p.amount), 0);

    const commissionRows = commissions.data ?? [];
    const commissionsPending = commissionRows.filter((c: any) => c.status === "pending").reduce((a: number, c: any) => a + Number(c.amount), 0);
    const commissionsPaid = commissionRows.filter((c: any) => c.status === "paid").reduce((a: number, c: any) => a + Number(c.amount), 0);

    const revenue = revenuePlates + revenueSubscriptions;
    const commissionsTotal = commissionsPending + commissionsPaid;

    return {
      plates: { total: plateRows.length, byStatus, blocked },
      companies: companies.data?.length ?? 0,
      subscriptions: { active: subsActive, expired: subsExpired },
      finance: {
        revenue,
        revenuePlates,
        revenueSubscriptions,
        cost: costPlates,
        commissions: commissionsTotal,
        commissionsPending,
        commissionsPaid,
        received,
        pending,
        result: revenue - costPlates - commissionsTotal,
      },
      settings: settings.data ?? null,
    };
  });

type PlateStatus = "available" | "reserved" | "sold" | "linked" | "donated" | "lost" | "blocked" | "cancelled";

export const listPlates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: PlateStatus | null; search?: string | null } | undefined) => ({
    status: data?.status ?? null,
    search: data?.search?.trim() ?? null,
  }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    let query = db
      .from("plates")
      .select("id, serial, qr_code, size, status, cost, price, company_id, seller_id, generated_at, sold_at, linked_at, blocked_by_admin, blocked_by_client, notes")
      .order("serial", { ascending: false })
      .limit(300);
    if (data.status) query = query.eq("status", data.status);
    if (data.search) query = query.ilike("qr_code", `%${data.search.toUpperCase()}%`);
    const { data: plates } = await query;
    const [{ data: companies }, { data: sellers }] = await Promise.all([
      db.from("companies").select("id, name"),
      db.from("sellers").select("id, name"),
    ]);
    const companyMap = Object.fromEntries((companies ?? []).map((c: any) => [c.id, c.name]));
    const sellerMap = Object.fromEntries((sellers ?? []).map((s: any) => [s.id, s.name]));
    return {
      plates: (plates ?? []).map((p: any) => ({
        ...p,
        company_name: p.company_id ? companyMap[p.company_id] ?? null : null,
        seller_name: p.seller_id ? sellerMap[p.seller_id] ?? null : null,
      })),
      sellers: sellers ?? [],
    };
  });

export const listBatches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: batches }, { data: plates }] = await Promise.all([
      db.from("batches").select("id, label, quantity, size, unit_cost, created_at").order("created_at", { ascending: false }),
      db.from("plates").select("id, batch_id, serial, qr_code, size, status").order("serial", { ascending: true }),
    ]);
    return (batches ?? []).map((batch: any) => ({
      ...batch,
      plates: (plates ?? []).filter((plate: any) => plate.batch_id === batch.id),
    }));
  });

export const createBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { label: string; quantity: number; size: string; unitCost: number; sellerId?: string | null }) => ({
    label: String(data.label).trim() || "Lote",
    quantity: Math.min(Math.max(Number(data.quantity) || 0, 1), 2000),
    size: data.size,
    unitCost: Number(data.unitCost) || 0,
    sellerId: data.sellerId || null,
  }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: batch, error } = await db
      .from("batches")
      .insert({
        label: data.label,
        quantity: data.quantity,
        size: data.size as any,
        unit_cost: data.unitCost,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: existing } = await db.from("plates").select("qr_code");
    const used = new Set((existing ?? []).map((p: any) => p.qr_code));
    const rows: any[] = [];
    while (rows.length < data.quantity) {
      const code = randomCode();
      if (used.has(code)) continue;
      used.add(code);
      rows.push({
        qr_code: code,
        batch_id: batch.id,
        size: data.size,
        cost: data.unitCost,
        seller_id: data.sellerId,
        status: "available",
      });
    }
    for (let i = 0; i < rows.length; i += 500) {
      const { error: insertError } = await db.from("plates").insert(rows.slice(i, i + 500));
      if (insertError) throw new Error(insertError.message);
    }
    await audit(db, context.userId, "batch.create", "batches", batch.id, { quantity: data.quantity, size: data.size });
    return { ok: true, batchId: batch.id, codes: rows.map((r) => r.qr_code) };
  });

export const updatePlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plateId: string; status?: string; sellerId?: string | null; notes?: string | null; blockedByAdmin?: boolean; cost?: number; price?: number | null }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.sellerId !== undefined) patch.seller_id = data.sellerId || null;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.blockedByAdmin !== undefined) patch.blocked_by_admin = data.blockedByAdmin;
    if (data.cost !== undefined) patch.cost = Math.max(0, Number(data.cost));
    if (data.price !== undefined) patch.price = data.price === null ? null : Math.max(0, Number(data.price));
    const { error } = await db.from("plates").update(patch).eq("id", data.plateId);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "plate.update", "plates", data.plateId, patch);
    return { ok: true };
  });

export const unlinkPlate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plateId: string }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    await db.from("pages").delete().eq("plate_id", data.plateId);
    const { error } = await db
      .from("plates")
      .update({ company_id: null, status: "available", linked_at: null, blocked_by_client: false })
      .eq("id", data.plateId);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "plate.unlink", "plates", data.plateId);
    return { ok: true };
  });

export const listCompanies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data: companies } = await db
      .from("companies")
      .select("id, name, website_url, owner_id, created_at")
      .order("created_at", { ascending: false });
    const [{ data: profiles }, { data: subs }, { data: plates }] = await Promise.all([
      db.from("profiles").select("id, email, full_name"),
      db.from("subscriptions").select("company_id, expires_at, status, amount"),
      db.from("plates").select("company_id, qr_code"),
    ]);
    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
    return (companies ?? []).map((c: any) => {
      const sub = (subs ?? [])
        .filter((s: any) => s.company_id === c.id)
        .sort((a: any, b: any) => +new Date(b.expires_at) - +new Date(a.expires_at))[0];
      return {
        ...c,
        owner_email: profileMap[c.owner_id]?.email ?? null,
        owner_name: profileMap[c.owner_id]?.full_name ?? null,
        expires_at: sub?.expires_at ?? null,
        active: sub ? new Date(sub.expires_at).getTime() > Date.now() : false,
        codes: (plates ?? []).filter((p: any) => p.company_id === c.id).map((p: any) => p.qr_code),
      };
    });
  });

export const listAdminOptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: companies }, { data: profiles }, { data: plates }, { data: sellers }, { data: subscriptions }, { data: sales }] = await Promise.all([
      db.from("companies").select("id, name").order("name"),
      db.from("profiles").select("id, email, full_name").order("email"),
      db.from("plates").select("id, qr_code, company_id").order("serial"),
      db.from("sellers").select("id, name").order("name"),
      db.from("subscriptions").select("id, company_id, expires_at").order("expires_at", { ascending: false }),
      db.from("sales").select("id, company_id, plate_id, amount").order("sold_at", { ascending: false }),
    ]);
    return { companies: companies ?? [], profiles: profiles ?? [], plates: plates ?? [], sellers: sellers ?? [], subscriptions: subscriptions ?? [], sales: sales ?? [] };
  });

export const saveCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string | null; name: string; ownerId: string; websiteUrl?: string | null }) => ({
    ...data,
    name: data.name.trim(),
    websiteUrl: data.websiteUrl?.trim() || null,
  }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    if (!data.name || !data.ownerId) throw new Error("Informe o nome e o responsável.");
    const payload = { name: data.name, owner_id: data.ownerId, website_url: data.websiteUrl };
    let id = data.id ?? null;
    if (id) {
      const { error } = await db.from("companies").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await db.from("companies").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    await audit(db, context.userId, data.id ? "company.update" : "company.create", "companies", id, { name: data.name });
    return { ok: true, id };
  });

export const deleteAdminRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { entity: "plates" | "batches" | "companies" | "sellers" | "sales" | "subscriptions" | "payments" | "commissions" | "audit_logs"; id: string }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    if (data.entity === "companies") {
      const [{ data: sales }, { data: subs }] = await Promise.all([
        db.from("sales").select("id").eq("company_id", data.id),
        db.from("subscriptions").select("id").eq("company_id", data.id),
      ]);
      const saleIds = (sales ?? []).map((item: any) => item.id);
      const subIds = (subs ?? []).map((item: any) => item.id);
      if (saleIds.length) await db.from("commissions").delete().in("sale_id", saleIds);
      if (subIds.length) await db.from("commissions").delete().in("subscription_id", subIds);
      await db.from("payments").delete().eq("company_id", data.id);
      await db.from("sales").delete().eq("company_id", data.id);
      await db.from("subscriptions").delete().eq("company_id", data.id);
      const { data: pages } = await db.from("pages").select("id").eq("company_id", data.id);
      const pageIds = (pages ?? []).map((item: any) => item.id);
      if (pageIds.length) await db.from("page_links").delete().in("page_id", pageIds);
      await db.from("pages").delete().eq("company_id", data.id);
      await db.from("plates").delete().eq("company_id", data.id);
    }
    if (data.entity === "sellers") {
      await db.from("commissions").delete().eq("seller_id", data.id);
      await db.from("sales").update({ seller_id: null }).eq("seller_id", data.id);
      await db.from("plates").update({ seller_id: null }).eq("seller_id", data.id);
    }
    const { error } = await db.from(data.entity).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.entity !== "audit_logs") await audit(db, context.userId, `${data.entity}.delete`, data.entity, data.id);
    return { ok: true };
  });

export const listSellers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: sellers }, { data: commissions }, { data: sales }] = await Promise.all([
      db.from("sellers").select("id, name, email, phone, active, user_id").order("name"),
      db.from("commissions").select("seller_id, amount, status"),
      db.from("sales").select("seller_id, amount"),
    ]);
    return (sellers ?? []).map((s: any) => {
      const mine = (commissions ?? []).filter((c: any) => c.seller_id === s.id);
      return {
        ...s,
        sales: (sales ?? []).filter((x: any) => x.seller_id === s.id).length,
        pending: mine.filter((c: any) => c.status === "pending").reduce((a: number, c: any) => a + Number(c.amount), 0),
        paid: mine.filter((c: any) => c.status === "paid").reduce((a: number, c: any) => a + Number(c.amount), 0),
      };
    });
  });

export const saveSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string | null; name: string; email?: string | null; phone?: string | null; active?: boolean }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const email = data.email?.trim().toLowerCase() || null;
    let userId: string | null = null;
    if (email) {
      const { data: profile } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = profile?.id ?? null;
    }
    const payload: any = { name: data.name.trim(), email, phone: data.phone || null, active: data.active ?? true };
    if (userId) payload.user_id = userId;
    let id = data.id ?? null;
    if (id) {
      const { error } = await db.from("sellers").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await db.from("sellers").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    if (userId) {
      await db.from("user_roles").upsert({ user_id: userId, role: "seller" }, { onConflict: "user_id,role" });
    }
    await audit(db, context.userId, data.id ? "seller.update" : "seller.create", "sellers", id, { name: payload.name });
    return { ok: true, id, linkedUser: !!userId };
  });

type CommercialEntity = "sales" | "subscriptions" | "payments" | "commissions";

export const saveCommercialRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { entity: CommercialEntity; id?: string | null; values: Record<string, unknown> }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const v = data.values;
    let payload: Record<string, unknown>;
    if (data.entity === "sales") {
      if (!v.plate_id || !v.company_id) throw new Error("Selecione a empresa e a plaquinha.");
      payload = { plate_id: v.plate_id, company_id: v.company_id, seller_id: v.seller_id || null, amount: Math.max(0, Number(v.amount)), cost: Math.max(0, Number(v.cost)), payment_method: v.payment_method || null, payment_status: v.payment_status, sold_at: v.sold_at };
    } else if (data.entity === "subscriptions") {
      if (!v.company_id || !v.expires_at) throw new Error("Selecione a empresa e informe o vencimento.");
      payload = { company_id: v.company_id, plate_id: v.plate_id || null, starts_at: v.starts_at, expires_at: v.expires_at, amount: Math.max(0, Number(v.amount)), status: v.status };
    } else if (data.entity === "payments") {
      payload = { company_id: v.company_id || null, subscription_id: v.subscription_id || null, sale_id: v.sale_id || null, kind: v.kind, amount: Math.max(0, Number(v.amount)), status: v.status, stripe_reference: v.stripe_reference || null, paid_at: v.status === "paid" ? (v.paid_at || new Date().toISOString()) : null };
    } else {
      if (!v.seller_id) throw new Error("Selecione o vendedor.");
      const base = Math.max(0, Number(v.base_amount));
      const percent = Math.min(100, Math.max(0, Number(v.percent)));
      payload = { seller_id: v.seller_id, kind: v.kind, sale_id: v.sale_id || null, subscription_id: v.subscription_id || null, base_amount: base, percent, amount: Math.max(0, Number(v.amount ?? (base * percent) / 100)), status: v.status, paid_at: v.status === "paid" ? (v.paid_at || new Date().toISOString()) : null };
    }
    let id = data.id ?? null;
    if (id) {
      const { error } = await db.from(data.entity).update(payload).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await db.from(data.entity).insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      id = row.id;
    }
    await audit(db, context.userId, `${data.entity}.${data.id ? "update" : "create"}`, data.entity, id);
    return { ok: true, id };
  });

export const listSales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: sales }, { data: companies }, { data: sellers }, { data: plates }] = await Promise.all([
      db.from("sales").select("*").order("sold_at", { ascending: false }).limit(300),
      db.from("companies").select("id, name"),
      db.from("sellers").select("id, name"),
      db.from("plates").select("id, qr_code"),
    ]);
    const cm = Object.fromEntries((companies ?? []).map((c: any) => [c.id, c.name]));
    const sm = Object.fromEntries((sellers ?? []).map((s: any) => [s.id, s.name]));
    const pm = Object.fromEntries((plates ?? []).map((p: any) => [p.id, p.qr_code]));
    return (sales ?? []).map((s: any) => ({
      ...s,
      company_name: cm[s.company_id] ?? "—",
      seller_name: s.seller_id ? sm[s.seller_id] ?? "—" : "—",
      qr_code: pm[s.plate_id] ?? "—",
    }));
  });

export const listSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: subs }, { data: companies }] = await Promise.all([
      db.from("subscriptions").select("*").order("expires_at", { ascending: true }).limit(300),
      db.from("companies").select("id, name"),
    ]);
    const cm = Object.fromEntries((companies ?? []).map((c: any) => [c.id, c.name]));
    return (subs ?? []).map((s: any) => ({
      ...s,
      company_name: cm[s.company_id] ?? "—",
      active: new Date(s.expires_at).getTime() > Date.now(),
    }));
  });

export const listPayments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: payments }, { data: companies }] = await Promise.all([
      db.from("payments").select("*").order("created_at", { ascending: false }).limit(300),
      db.from("companies").select("id, name"),
    ]);
    const cm = Object.fromEntries((companies ?? []).map((c: any) => [c.id, c.name]));
    return (payments ?? []).map((p: any) => ({ ...p, company_name: p.company_id ? cm[p.company_id] ?? "—" : "—" }));
  });

/** Manual confirmation: renews the subscription for 12 months and creates the renewal commission. */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { data: payment } = await db.from("payments").select("*").eq("id", data.paymentId).maybeSingle();
    if (!payment) throw new Error("Pagamento não encontrado.");
    if (payment.status === "paid") return { ok: true, already: true };

    await db.from("payments").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payment.id);

    if ((payment.kind === "renewal" || payment.kind === "subscription") && payment.company_id) {
      const { data: sub } = await db
        .from("subscriptions")
        .select("*")
        .eq("company_id", payment.company_id)
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const base = sub && new Date(sub.expires_at).getTime() > Date.now() ? new Date(sub.expires_at) : new Date();
      const expires = new Date(base);
      expires.setFullYear(expires.getFullYear() + 1);
      if (sub) {
        await db.from("subscriptions").update({ expires_at: expires.toISOString(), status: "active" }).eq("id", sub.id);
      }

      const { data: settings } = await db.from("settings").select("*").eq("id", true).maybeSingle();
      const percent = Number(settings?.commission_renewal_percent ?? 0);
      const { data: plate } = await db
        .from("plates")
        .select("seller_id")
        .eq("company_id", payment.company_id)
        .not("seller_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (plate?.seller_id && percent > 0) {
        await db.from("commissions").insert({
          seller_id: plate.seller_id,
          kind: "renewal",
          subscription_id: sub?.id ?? null,
          base_amount: Number(payment.amount),
          percent,
          amount: Number(((Number(payment.amount) * percent) / 100).toFixed(2)),
          status: "pending",
        });
      }
    }

    if (payment.kind === "plate" && payment.sale_id) {
      await db.from("sales").update({ payment_status: "paid" }).eq("id", payment.sale_id);
    }

    await audit(db, context.userId, "payment.confirm", "payments", payment.id, { amount: payment.amount });
    return { ok: true, already: false };
  });

export const listCommissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: commissions }, { data: sellers }] = await Promise.all([
      db.from("commissions").select("*").order("created_at", { ascending: false }).limit(300),
      db.from("sellers").select("id, name"),
    ]);
    const sm = Object.fromEntries((sellers ?? []).map((s: any) => [s.id, s.name]));
    return (commissions ?? []).map((c: any) => ({ ...c, seller_name: sm[c.seller_id] ?? "—" }));
  });

export const payCommission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db
      .from("commissions")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "commission.pay", "commissions", data.id);
    return { ok: true };
  });

export const getSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const { data } = await db.from("settings").select("*").eq("id", true).maybeSingle();
    return data;
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    plate_price: number;
    plate_cost: number;
    subscription_price: number;
    commission_sale_percent: number;
    commission_renewal_percent: number;
  }) => data)
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    const { error } = await db.from("settings").update({ ...data }).eq("id", true);
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "settings.update", "settings", null, data);
    return { ok: true };
  });

export const resetSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const defaults = { id: true, plate_price: 80, plate_cost: 20, subscription_price: 99, commission_sale_percent: 10, commission_renewal_percent: 5 };
    const { error } = await db.from("settings").upsert(defaults, { onConflict: "id" });
    if (error) throw new Error(error.message);
    await audit(db, context.userId, "settings.reset", "settings", null, defaults);
    return defaults;
  });

export const listAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context);
    const [{ data: logs }, { data: profiles }] = await Promise.all([
      db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200),
      db.from("profiles").select("id, email, full_name"),
    ]);
    const pm = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.email ?? p.full_name]));
    return (logs ?? []).map((l: any) => ({ ...l, user_label: l.user_id ? pm[l.user_id] ?? l.user_id : "sistema" }));
  });

export const saveAuditNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string | null; note: string }) => ({ id: data.id ?? null, note: data.note.trim() }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context);
    if (!data.note) throw new Error("Escreva a observação.");
    if (data.id) {
      const { data: existing } = await db.from("audit_logs").select("action").eq("id", data.id).maybeSingle();
      if (existing?.action !== "admin.note") throw new Error("Somente observações manuais podem ser alteradas.");
      const { error } = await db.from("audit_logs").update({ details: { note: data.note } }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await db.from("audit_logs").insert({ user_id: context.userId, action: "admin.note", entity: "audit_logs", details: { note: data.note } }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });
