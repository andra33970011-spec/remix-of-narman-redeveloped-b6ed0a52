import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/site/PageShell";
import { fetchDesaList, type Desa } from "@/lib/site-settings";
import { applyStaffRegistration, listOpdPublic } from "@/lib/registration.functions";

type AuthSearch = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    redirect:
      typeof search.redirect === "string"
        && search.redirect.startsWith("/")
        && !search.redirect.startsWith("//")
        && !search.redirect.startsWith("/\\")
        ? search.redirect
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Masuk / Daftar — Portal Buton Selatan" },
      { name: "description", content: "Masuk atau daftar akun (warga, Admin Desa, Admin OPD, ASN) untuk layanan publik Kabupaten Buton Selatan." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type RoleTab = "warga" | "admin_desa" | "admin_opd" | "asn";

const ROLE_LABEL: Record<RoleTab, string> = {
  warga: "Warga",
  admin_desa: "Admin Desa",
  admin_opd: "Admin OPD",
  asn: "ASN",
};

const baseSignIn = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

const baseSignUp = baseSignIn.extend({
  nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  no_hp: z.string().trim().regex(/^(\+62|62|0)8\d{7,12}$/, "Nomor HP tidak valid"),
});

type Opd = { id: string; nama: string; singkatan: string };

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [roleTab, setRoleTab] = useState<RoleTab>("warga");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    nama_lengkap: "",
    nik: "",
    no_hp: "",
    desa: "",
    opd_id: "",
    nip: "",
    jabatan: "",
  });
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [opdList, setOpdList] = useState<Opd[]>([]);

  useEffect(() => { fetchDesaList(true).then(setDesaList).catch(() => {}); }, []);
  useEffect(() => {
    listOpdPublic().then((r) => setOpdList(r.rows as Opd[])).catch(() => {});
  }, []);

  const goAfterAuth = () => {
    if (redirect) window.location.assign(redirect);
    else navigate({ to: "/" });
  };

  useEffect(() => {
    if (!loading && user && mode === "signin") goAfterAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = baseSignIn.parse({ email: form.email, password: form.password });
        const { error } = await supabase.auth.signInWithPassword(parsed);
        if (error) throw error;
        toast.success("Berhasil masuk");
        goAfterAuth();
        return;
      }
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Email reset password telah dikirim.");
        setMode("signin");
        return;
      }

      // ===== SIGNUP =====
      const base = baseSignUp.parse({
        email: form.email,
        password: form.password,
        nama_lengkap: form.nama_lengkap,
        no_hp: form.no_hp,
      });

      // Validasi per role
      if (roleTab === "warga") {
        if (!/^\d{16}$/.test(form.nik)) throw new Error("NIK harus 16 digit angka");
        if (!form.desa) throw new Error("Desa wajib dipilih");
      }
      if (roleTab === "admin_desa") {
        if (!form.desa) throw new Error("Desa yang Anda kelola wajib dipilih");
      }
      if (roleTab === "admin_opd") {
        if (!form.opd_id) throw new Error("OPD wajib dipilih");
      }
      if (roleTab === "asn") {
        if (!form.opd_id) throw new Error("OPD/Instansi wajib dipilih");
        if (!/^\d{8,20}$/.test(form.nip)) throw new Error("NIP harus 8-20 digit angka");
        if (!form.jabatan.trim()) throw new Error("Jabatan wajib diisi");
      }

      const { error: serr } = await supabase.auth.signUp({
        email: base.email,
        password: base.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nama_lengkap: base.nama_lengkap,
            no_hp: base.no_hp,
            nik: roleTab === "warga" ? form.nik : null,
            desa: roleTab === "warga" || roleTab === "admin_desa" ? form.desa : null,
          },
        },
      });
      if (serr) throw serr;

      // Jika daftar sebagai staf, panggil server function untuk request role.
      if (roleTab !== "warga") {
        try {
          await applyStaffRegistration({
            data: {
              requested_role: roleTab,
              opd_id: roleTab === "admin_opd" || roleTab === "asn" ? form.opd_id : null,
              desa: roleTab === "admin_desa" ? form.desa : null,
              nip: roleTab === "asn" ? form.nip : null,
              jabatan: roleTab === "asn" ? form.jabatan : null,
            },
          });
          toast.success("Pendaftaran berhasil. Akun menunggu verifikasi Super Admin.");
        } catch (err) {
          toast.error("Akun dibuat, namun gagal menyimpan data peran: " + (err as Error).message);
        }
      } else {
        toast.success("Akun warga dibuat.");
      }
      goAfterAuth();
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  const showSignupExtras = mode === "signup";

  return (
    <PageShell>
      <section className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 shadow-soft">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {mode === "signin" && "Masuk Akun"}
            {mode === "signup" && "Daftar Akun Baru"}
            {mode === "forgot" && "Reset Password"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Portal layanan Kabupaten Buton Selatan.
          </p>

          {showSignupExtras && (
            <div className="mt-5">
              <div className="mb-1 text-xs font-medium text-muted-foreground">Daftar sebagai</div>
              <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1 sm:grid-cols-4">
                {(Object.keys(ROLE_LABEL) as RoleTab[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleTab(r)}
                    className={`h-9 rounded-md text-xs font-semibold transition ${
                      roleTab === r
                        ? "bg-gradient-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:bg-background"
                    }`}
                  >
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              {roleTab !== "warga" && (
                <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  Akun <b>{ROLE_LABEL[roleTab]}</b> memerlukan verifikasi Super Admin sebelum dapat digunakan secara penuh.
                </p>
              )}
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {showSignupExtras && (
              <>
                <Field label="Nama Lengkap" required>
                  <input
                    required
                    value={form.nama_lengkap}
                    onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="Nomor HP" required>
                  <input
                    required
                    inputMode="tel"
                    value={form.no_hp}
                    onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                    className="input"
                    placeholder="08xxxxxxxxxx"
                  />
                </Field>

                {/* Field per role */}
                {roleTab === "warga" && (
                  <>
                    <Field label="NIK" required>
                      <input
                        required
                        inputMode="numeric"
                        pattern="\d{16}"
                        maxLength={16}
                        value={form.nik}
                        onChange={(e) => setForm({ ...form, nik: e.target.value.replace(/\D/g, "") })}
                        className="input"
                        placeholder="16 digit NIK"
                      />
                    </Field>
                    <DesaSelect form={form} setForm={setForm} desaList={desaList} label="Desa / Kelurahan" />
                  </>
                )}
                {roleTab === "admin_desa" && (
                  <DesaSelect form={form} setForm={setForm} desaList={desaList} label="Desa / Kelurahan yang Anda Kelola" />
                )}
                {roleTab === "admin_opd" && (
                  <OpdSelect form={form} setForm={setForm} opdList={opdList} label="OPD yang Anda Kelola" />
                )}
                {roleTab === "asn" && (
                  <>
                    <OpdSelect form={form} setForm={setForm} opdList={opdList} label="OPD / Instansi Penugasan" />
                    <Field label="NIP" required>
                      <input
                        required
                        inputMode="numeric"
                        value={form.nip}
                        onChange={(e) => setForm({ ...form, nip: e.target.value.replace(/\D/g, "") })}
                        className="input"
                        placeholder="Nomor Induk Pegawai"
                      />
                    </Field>
                    <Field label="Jabatan" required>
                      <input
                        required
                        value={form.jabatan}
                        onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                        className="input"
                        placeholder="contoh: Analis Kepegawaian"
                      />
                    </Field>
                  </>
                )}
              </>
            )}

            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </Field>
            {mode !== "forgot" && (
              <Field label="Password" required>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input"
                  minLength={6}
                />
              </Field>
            )}

            <button
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 disabled:opacity-60"
            >
              {busy
                ? "Memproses…"
                : mode === "signin"
                ? "Masuk"
                : mode === "signup"
                ? `Daftar ${ROLE_LABEL[roleTab]}`
                : "Kirim Email Reset"}
            </button>
          </form>

          <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            {mode === "signin" && (
              <>
                <button onClick={() => setMode("signup")} className="text-primary hover:underline text-left">
                  Belum punya akun? Daftar di sini
                </button>
                <button onClick={() => setMode("forgot")} className="text-primary hover:underline text-left">
                  Lupa password?
                </button>
              </>
            )}
            {mode !== "signin" && (
              <button onClick={() => setMode("signin")} className="text-primary hover:underline text-left">
                ← Kembali ke Masuk
              </button>
            )}
            <Link to="/" className="hover:underline">← Kembali ke Beranda</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function DesaSelect({
  form, setForm, desaList, label,
}: { form: { desa: string }; setForm: (v: never) => void; desaList: Desa[]; label: string }) {
  return (
    <Field label={label} required>
      <select
        required
        value={form.desa}
        onChange={(e) => setForm({ ...form, desa: e.target.value } as never)}
        className="input"
      >
        <option value="">— Pilih desa —</option>
        {desaList.map((d) => (
          <option key={d.id} value={d.nama}>
            {d.nama}{d.kecamatan ? ` (${d.kecamatan})` : ""}
          </option>
        ))}
      </select>
      {desaList.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Daftar desa belum tersedia. Hubungi admin.</p>
      )}
    </Field>
  );
}

function OpdSelect({
  form, setForm, opdList, label,
}: { form: { opd_id: string }; setForm: (v: never) => void; opdList: Opd[]; label: string }) {
  return (
    <Field label={label} required>
      <select
        required
        value={form.opd_id}
        onChange={(e) => setForm({ ...form, opd_id: e.target.value } as never)}
        className="input"
      >
        <option value="">— Pilih OPD/Instansi —</option>
        {opdList.map((o) => (
          <option key={o.id} value={o.id}>
            {o.singkatan} — {o.nama}
          </option>
        ))}
      </select>
      {opdList.length === 0 && (
        <p className="mt-1 text-xs text-muted-foreground">Daftar OPD belum tersedia.</p>
      )}
    </Field>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}
