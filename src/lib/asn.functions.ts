// Modul ASN: Kantor QR + Absensi.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { checkRateLimit } from "@/integrations/supabase/rate-limit.server";

function randomToken(bytes = 24) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function userRolesAndOpd(userId: string) {
  const [{ data: roles }, { data: prof }] = await Promise.all([
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
    supabaseAdmin.from("profiles").select("opd_id").eq("id", userId).maybeSingle(),
  ]);
  const r = (roles ?? []).map((x) => x.role);
  return {
    isSuper: r.includes("super_admin"),
    isAdminOpd: r.includes("admin_opd"),
    isAsn: r.includes("asn"),
    opdId: (prof?.opd_id as string | null) ?? null,
  };
}

// ============= GENERATE / ROTATE QR KANTOR =============
export const regenerateKantorQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ opd_id: z.string().uuid(), label: z.string().max(120).optional(), lokasi: z.string().max(255).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const ctx = await userRolesAndOpd(userId);
    if (!(ctx.isSuper || (ctx.isAdminOpd && ctx.opdId === data.opd_id))) {
      throw new Error("Forbidden");
    }
    const rl = await checkRateLimit(userId, "qr_regen", 20, 60);
    if (!rl.ok) throw new Error("Terlalu banyak permintaan");

    const token = randomToken(24);
    const { data: existing } = await supabaseAdmin
      .from("kantor_qr").select("id").eq("opd_id", data.opd_id).maybeSingle();
    if (existing) {
      const { error } = await supabaseAdmin.from("kantor_qr").update({
        token, label: data.label ?? null, lokasi: data.lokasi ?? null, aktif: true,
      }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("kantor_qr").insert({
        opd_id: data.opd_id, token, label: data.label ?? null, lokasi: data.lokasi ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true, token };
  });

// ============= LIST KANTOR QR (super admin) =============
export const listKantorQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await userRolesAndOpd(context.userId);
    if (!ctx.isSuper) throw new Error("Forbidden");
    const { data, error } = await supabaseAdmin
      .from("kantor_qr")
      .select("id,opd_id,token,label,lokasi,aktif,updated_at, opd:opd!opd_id(nama,singkatan)");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

// ============= RESOLVE QR TOKEN =============
export const resolveKantorQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ token: z.string().min(8).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("kantor_qr")
      .select("id,opd_id,label,lokasi,aktif, opd:opd!opd_id(nama,singkatan)")
      .eq("token", data.token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || !row.aktif) throw new Error("QR tidak valid / nonaktif");
    return row;
  });

// ============= SUBMIT ABSENSI =============
export const submitAbsensi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      token: z.string().min(8).max(80),
      tipe: z.enum(["masuk", "pulang"]),
      lat: z.number().optional().nullable(),
      lng: z.number().optional().nullable(),
      device_info: z.string().max(200).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const rl = await checkRateLimit(userId, "absensi", 10, 60);
    if (!rl.ok) throw new Error("Terlalu banyak percobaan absen");

    const ctx = await userRolesAndOpd(userId);
    if (!ctx.isAsn) throw new Error("Hanya ASN terdaftar yang dapat absen");
    if (!ctx.opdId) throw new Error("Profil Anda belum terhubung ke OPD");

    const { data: qr, error: qErr } = await supabaseAdmin
      .from("kantor_qr").select("opd_id,aktif").eq("token", data.token).maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!qr || !qr.aktif) throw new Error("QR tidak valid");
    if (qr.opd_id !== ctx.opdId) throw new Error("QR ini bukan untuk kantor OPD Anda");

    // Cegah duplikat masuk/pulang di hari yang sama (UTC date)
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const { data: dup } = await supabaseAdmin
      .from("absensi_asn").select("id")
      .eq("user_id", userId).eq("opd_id", qr.opd_id).eq("tipe", data.tipe)
      .gte("waktu", today.toISOString()).maybeSingle();
    if (dup) throw new Error(`Anda sudah absen ${data.tipe} hari ini`);

    const { error: insErr } = await supabaseAdmin.from("absensi_asn").insert({
      user_id: userId,
      opd_id: qr.opd_id,
      tipe: data.tipe,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      device_info: data.device_info ?? null,
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

// ============= LIST ABSENSI =============
export const listAbsensiSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("absensi_asn")
      .select("id,tipe,waktu,opd:opd!opd_id(nama,singkatan)")
      .eq("user_id", context.userId)
      .order("waktu", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const listAbsensiAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      opd_id: z.string().uuid().optional().nullable(),
      from: z.string().optional().nullable(),
      to: z.string().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const ctx = await userRolesAndOpd(context.userId);
    if (!ctx.isSuper && !ctx.isAdminOpd) throw new Error("Forbidden");
    let q = supabaseAdmin
      .from("absensi_asn")
      .select("id,user_id,tipe,waktu,opd_id, opd:opd!opd_id(nama,singkatan), profile:profiles!user_id(nama_lengkap,nip,jabatan)")
      .order("waktu", { ascending: false })
      .limit(500);
    const filterOpd = ctx.isSuper ? (data.opd_id ?? null) : ctx.opdId;
    if (filterOpd) q = q.eq("opd_id", filterOpd);
    if (data.from) q = q.gte("waktu", data.from);
    if (data.to) q = q.lte("waktu", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });
