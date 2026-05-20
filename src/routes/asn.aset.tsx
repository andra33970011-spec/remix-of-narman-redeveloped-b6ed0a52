import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { QrScanner } from "@/components/asn/QrScanner";
import { useAuth } from "@/lib/auth-context";
import { resolveAsetByKode, scanAset, listAset } from "@/lib/aset.functions";

export const Route = createFileRoute("/asn/aset")({
  head: () => ({ meta: [{ title: "Tracking Aset — Scan QR" }, { name: "robots", content: "noindex" }] }),
  component: AsetPage,
});

type Aset = {
  id: string; kode: string; nama: string; kategori: string;
  lokasi_terkini: string | null; status: string;
  opd: { nama: string; singkatan: string } | null;
  pemegang: { nama_lengkap: string } | null;
};

function AsetPage() {
  const { user, loading } = useAuth();
  const [scanned, setScanned] = useState<Aset | null>(null);
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [lokasiText, setLokasiText] = useState("");
  const [mine, setMine] = useState<Aset[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {}, { enableHighAccuracy: true, timeout: 5000 });
  }, []);
  useEffect(() => {
    if (user) listAset({ data: { mine: true } }).then((r) => setMine((r as { rows: Aset[] }).rows)).catch(() => {});
  }, [user]);

  function extractKode(text: string): string | null {
    try {
      if (text.startsWith("http")) { const u = new URL(text); const k = u.searchParams.get("kode"); if (k) return k; }
    } catch { /* noop */ }
    if (/^AST-[A-Z0-9-]+$/i.test(text)) return text.toUpperCase();
    return text.trim() || null;
  }

  async function onScan(text: string) {
    const k = extractKode(text); if (!k) { toast.error("QR tidak dikenali"); return; }
    try { const a = await resolveAsetByKode({ data: { kode: k } }); setScanned(a as Aset); }
    catch (e) { toast.error((e as Error).message); }
  }

  async function submitScan() {
    if (!scanned) return; setBusy(true);
    try {
      await scanAset({ data: { kode: scanned.kode, lat: coords?.lat ?? null, lng: coords?.lng ?? null, lokasi_text: lokasiText || null, catatan: catatan || null } });
      toast.success("Lokasi & log scan tersimpan");
      setScanned(null); setCatatan(""); setLokasiText("");
      const r = await listAset({ data: { mine: true } }); setMine((r as { rows: Aset[] }).rows);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  if (loading) return <PageShell><div className="container-page py-10">Memuat…</div></PageShell>;
  if (!user) return <PageShell><div className="container-page py-10">Silakan <Link to="/auth" className="text-primary underline">masuk</Link> untuk scan aset.</div></PageShell>;

  return (
    <PageShell>
      <section className="container-page py-8">
        <h1 className="font-display text-2xl font-bold">Tracking Aset Pemda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scan QR pada aset (kendaraan dinas, peralatan) untuk mencatat lokasi & kondisi terkini.</p>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            {!scanned ? (
              <QrScanner onResult={onScan} />
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Aset</div>
                  <div className="font-display text-lg font-bold">{scanned.nama}</div>
                  <div className="text-xs text-muted-foreground">{scanned.kode} · {scanned.kategori} · Status: {scanned.status}</div>
                  <div className="text-xs text-muted-foreground">OPD: {scanned.opd?.nama ?? "-"} · Pemegang: {scanned.pemegang?.nama_lengkap ?? "-"}</div>
                  {scanned.lokasi_terkini && <div className="text-xs text-muted-foreground">Lokasi sebelumnya: {scanned.lokasi_terkini}</div>}
                </div>
                <input value={lokasiText} onChange={(e) => setLokasiText(e.target.value)} placeholder="Deskripsi lokasi (opsional)" className="input h-9" />
                <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan kondisi (opsional)" className="input min-h-20" />
                {coords && <p className="text-xs text-muted-foreground">GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</p>}
                <div className="flex gap-2">
                  <button disabled={busy} onClick={submitScan} className="h-10 rounded-md bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground">{busy ? "Menyimpan…" : "Simpan Scan"}</button>
                  <button onClick={() => setScanned(null)} className="h-10 rounded-md border border-border px-4 text-sm">Batal</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">Aset yang Anda Pegang</h2>
            <div className="mt-2 space-y-2">
              {mine.length === 0 && <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Belum ada aset yang ditugaskan kepada Anda.</div>}
              {mine.map((a) => (
                <div key={a.id} className="rounded-md border border-border bg-card p-3 text-sm">
                  <div className="font-semibold">{a.nama}</div>
                  <div className="text-xs text-muted-foreground">{a.kode} · {a.kategori} · {a.status}</div>
                  {a.lokasi_terkini && <div className="text-xs text-muted-foreground">📍 {a.lokasi_terkini}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
