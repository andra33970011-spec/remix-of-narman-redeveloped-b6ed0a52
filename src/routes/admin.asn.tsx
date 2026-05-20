// Dashboard ASN super admin: Kantor & QR, Absensi, Aset, Riwayat Aset.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, RefreshCw, Download, Plus, Trash2, QrCode } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { listKantorQR, regenerateKantorQR, listAbsensiAdmin } from "@/lib/asn.functions";
import { listAset, upsertAset, deleteAset, listAsetRiwayat } from "@/lib/aset.functions";
import { QrImage, downloadQrPng } from "@/components/asn/QrPrintable";

export const Route = createFileRoute("/admin/asn")({
  head: () => ({ meta: [{ title: "Modul ASN — Admin" }, { name: "robots", content: "noindex" }] }),
  component: () => (<AdminGuard><Page /></AdminGuard>),
});

type Opd = { id: string; nama: string; singkatan: string };
type Tab = "kantor" | "absensi" | "aset" | "riwayat";

function Page() {
  const { isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("kantor");
  const [opds, setOpds] = useState<Opd[]>([]);
  useEffect(() => { supabase.from("opd").select("id,nama,singkatan").order("nama").then(({ data }) => setOpds((data ?? []) as Opd[])); }, []);

  if (!isSuperAdmin) {
    return <AdminShell breadcrumb={[{ label: "Modul ASN" }]}><div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">Hanya Super Admin.</div></AdminShell>;
  }

  return (
    <AdminShell breadcrumb={[{ label: "Modul ASN" }]}>
      <h1 className="font-display text-2xl font-bold">Modul ASN</h1>
      <p className="text-sm text-muted-foreground">Pengaturan QR kantor, monitoring absensi ASN, dan tracking aset Pemda.</p>
      <div className="mt-4 inline-flex flex-wrap rounded-lg border border-border bg-surface p-1">
        {(["kantor", "absensi", "aset", "riwayat"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-md text-sm font-semibold ${tab === t ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {t === "kantor" ? "Kantor & QR" : t === "absensi" ? "Absensi" : t === "aset" ? "Aset" : "Riwayat Aset"}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "kantor" && <KantorTab opds={opds} />}
        {tab === "absensi" && <AbsensiTab opds={opds} />}
        {tab === "aset" && <AsetTab opds={opds} />}
        {tab === "riwayat" && <RiwayatTab />}
      </div>
    </AdminShell>
  );
}

type Qr = { id: string; opd_id: string; token: string; label: string | null; lokasi: string | null; aktif: boolean; opd: { nama: string; singkatan: string } | null };

function KantorTab({ opds }: { opds: Opd[] }) {
  const [rows, setRows] = useState<Qr[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  async function reload() { const r = await listKantorQR(); setRows((r as { rows: Qr[] }).rows); }
  useEffect(() => { reload().catch(() => {}); }, []);
  async function regen(opd_id: string, label?: string, lokasi?: string) {
    setBusyId(opd_id);
    try { await regenerateKantorQR({ data: { opd_id, label, lokasi } }); toast.success("QR diperbarui"); await reload(); }
    catch (e) { toast.error((e as Error).message); } finally { setBusyId(null); }
  }
  const byOpd = new Map(rows.map((r) => [r.opd_id, r]));
  return (
    <div className="space-y-3">
      {opds.map((o) => {
        const q = byOpd.get(o.id);
        const url = q ? `${typeof window !== "undefined" ? window.location.origin : ""}/asn/scan/${q.token}` : "";
        return (
          <div key={o.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold">{o.nama}</div>
              <div className="text-xs text-muted-foreground">{o.singkatan}</div>
              {q && <div className="mt-1 text-xs text-muted-foreground break-all">URL: {url}</div>}
            </div>
            {q ? <QrImage value={url} size={120} /> : <div className="text-sm text-muted-foreground">Belum ada QR</div>}
            <div className="flex flex-col gap-2">
              <button onClick={() => regen(o.id)} disabled={busyId === o.id} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
                {busyId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} {q ? "Rotasi QR" : "Generate QR"}
              </button>
              {q && <button onClick={() => downloadQrPng(url, `qr-${o.singkatan}.png`)} className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-xs"><Download className="h-3 w-3" /> Unduh PNG</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type AbsRow = { id: string; tipe: string; waktu: string; opd: { nama: string; singkatan: string } | null; profile: { nama_lengkap: string; nip: string | null; jabatan: string | null } | null };
function AbsensiTab({ opds }: { opds: Opd[] }) {
  const [rows, setRows] = useState<AbsRow[]>([]);
  const [opdId, setOpdId] = useState<string>("");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  async function reload() {
    const r = await listAbsensiAdmin({ data: { opd_id: opdId || null, from: from ? new Date(from).toISOString() : null, to: to ? new Date(to).toISOString() : null } });
    setRows((r as { rows: AbsRow[] }).rows);
  }
  useEffect(() => { reload().catch(() => {}); }, []);

  function exportCsv() {
    const header = "Nama,NIP,Jabatan,OPD,Tipe,Waktu\n";
    const body = rows.map((r) => `"${r.profile?.nama_lengkap ?? ""}","${r.profile?.nip ?? ""}","${r.profile?.jabatan ?? ""}","${r.opd?.singkatan ?? ""}",${r.tipe},${new Date(r.waktu).toISOString()}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `absensi-${Date.now()}.csv`; a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <select value={opdId} onChange={(e) => setOpdId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm"><option value="">Semua OPD</option>{opds.map((o) => <option key={o.id} value={o.id}>{o.singkatan}</option>)}</select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" />
        <button onClick={reload} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">Terapkan</button>
        <button onClick={exportCsv} className="h-9 rounded-md border border-border px-3 text-xs">Export CSV</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Pegawai</th><th className="px-3 py-2">OPD</th><th className="px-3 py-2">Tipe</th><th className="px-3 py-2">Waktu</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Tidak ada data.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2"><div className="font-medium">{r.profile?.nama_lengkap ?? "-"}</div><div className="text-xs text-muted-foreground">{r.profile?.nip ?? ""} {r.profile?.jabatan ? `· ${r.profile.jabatan}` : ""}</div></td>
                <td className="px-3 py-2">{r.opd?.singkatan ?? "-"}</td>
                <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${r.tipe === "masuk" ? "bg-success/15 text-success" : "bg-accent/20 text-accent"}`}>{r.tipe.toUpperCase()}</span></td>
                <td className="px-3 py-2 text-xs">{new Date(r.waktu).toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type AsetRow = { id: string; kode: string; nama: string; kategori: string; opd_id: string | null; pemegang_user_id: string | null; lokasi_terkini: string | null; status: string; opd: { nama: string; singkatan: string } | null; pemegang: { nama_lengkap: string; nip: string | null } | null };

function AsetTab({ opds }: { opds: Opd[] }) {
  const [rows, setRows] = useState<AsetRow[]>([]);
  const [form, setForm] = useState<{ nama: string; kategori: "kendaraan" | "elektronik" | "lainnya"; merk: string; nomor_seri: string; opd_id: string }>({ nama: "", kategori: "kendaraan", merk: "", nomor_seri: "", opd_id: "" });
  const [busy, setBusy] = useState(false);

  async function reload() { const r = await listAset({ data: {} }); setRows((r as { rows: AsetRow[] }).rows); }
  useEffect(() => { reload().catch(() => {}); }, []);

  async function create() {
    if (!form.nama || !form.opd_id) { toast.error("Nama & OPD wajib"); return; }
    setBusy(true);
    try {
      await upsertAset({ data: { nama: form.nama, kategori: form.kategori, merk: form.merk || null, nomor_seri: form.nomor_seri || null, opd_id: form.opd_id, status: "aktif" } });
      toast.success("Aset ditambahkan"); setForm({ nama: "", kategori: "kendaraan", merk: "", nomor_seri: "", opd_id: "" }); await reload();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  async function hapus(id: string) {
    if (!confirm("Hapus aset ini?")) return;
    try { await deleteAset({ data: { id } }); toast.success("Aset dihapus"); await reload(); } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-2">Tambah Aset</h3>
        <div className="grid gap-2 sm:grid-cols-5">
          <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama aset" className="input h-9" />
          <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value as typeof form.kategori })} className="input h-9">
            <option value="kendaraan">Kendaraan</option><option value="elektronik">Elektronik</option><option value="lainnya">Lainnya</option>
          </select>
          <input value={form.merk} onChange={(e) => setForm({ ...form, merk: e.target.value })} placeholder="Merk" className="input h-9" />
          <input value={form.nomor_seri} onChange={(e) => setForm({ ...form, nomor_seri: e.target.value })} placeholder="No. Seri / Plat" className="input h-9" />
          <select value={form.opd_id} onChange={(e) => setForm({ ...form, opd_id: e.target.value })} className="input h-9"><option value="">— OPD —</option>{opds.map((o) => <option key={o.id} value={o.id}>{o.singkatan}</option>)}</select>
        </div>
        <button disabled={busy} onClick={create} className="mt-2 inline-flex h-9 items-center gap-1 rounded-md bg-gradient-primary px-3 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /> Tambah</button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2">Aset</th><th className="px-3 py-2">OPD</th><th className="px-3 py-2">Pemegang</th><th className="px-3 py-2">Lokasi</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">QR</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Belum ada aset.</td></tr>}
            {rows.map((r) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/asn/aset?kode=${r.kode}`;
              return (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="px-3 py-2"><div className="font-medium">{r.nama}</div><div className="text-xs text-muted-foreground">{r.kode} · {r.kategori}</div></td>
                  <td className="px-3 py-2 text-xs">{r.opd?.singkatan ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.pemegang?.nama_lengkap ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.lokasi_terkini ?? "-"}</td>
                  <td className="px-3 py-2 text-xs">{r.status}</td>
                  <td className="px-3 py-2"><button onClick={() => downloadQrPng(url, `aset-${r.kode}.png`)} className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs"><QrCode className="h-3 w-3" /> Unduh</button></td>
                  <td className="px-3 py-2"><button onClick={() => hapus(r.id)} className="inline-flex h-8 items-center gap-1 rounded-md border border-destructive/40 px-2 text-xs text-destructive"><Trash2 className="h-3 w-3" /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Riwayat = { id: string; aksi: string; catatan: string | null; lokasi_text: string | null; created_at: string; oleh_profile: { nama_lengkap: string } | null };
function RiwayatTab() {
  const [asetId, setAsetId] = useState("");
  const [rows, setRows] = useState<Riwayat[]>([]);
  const [list, setList] = useState<{ id: string; kode: string; nama: string }[]>([]);
  useEffect(() => { listAset({ data: {} }).then((r) => setList((r as { rows: { id: string; kode: string; nama: string }[] }).rows.map((x) => ({ id: x.id, kode: x.kode, nama: x.nama })))).catch(() => {}); }, []);
  async function load() { if (!asetId) return; const r = await listAsetRiwayat({ data: { aset_id: asetId } }); setRows((r as { rows: Riwayat[] }).rows); }
  useEffect(() => { load().catch(() => {}); }, [asetId]);
  const selected = useMemo(() => list.find((a) => a.id === asetId), [list, asetId]);
  return (
    <div className="space-y-3">
      <select value={asetId} onChange={(e) => setAsetId(e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm">
        <option value="">— Pilih aset —</option>
        {list.map((a) => <option key={a.id} value={a.id}>{a.nama} ({a.kode})</option>)}
      </select>
      {selected && <div className="text-xs text-muted-foreground">Riwayat aset: <b>{selected.nama}</b></div>}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Pilih aset untuk melihat riwayat.</div>}
        {rows.map((r) => (
          <div key={r.id} className="p-3 text-sm">
            <div className="flex items-center justify-between"><span className="font-semibold">{r.aksi}</span><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("id-ID")}</span></div>
            <div className="text-xs text-muted-foreground">Oleh: {r.oleh_profile?.nama_lengkap ?? "-"}</div>
            {r.lokasi_text && <div className="text-xs">📍 {r.lokasi_text}</div>}
            {r.catatan && <div className="text-xs">{r.catatan}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
