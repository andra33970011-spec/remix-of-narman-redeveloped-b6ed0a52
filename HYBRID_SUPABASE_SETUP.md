# Hybrid Supabase Setup

Aplikasi ini dirancang untuk berjalan **dual-mode** tanpa perubahan kode:

| Lingkungan | Sumber Supabase | Cara override |
|---|---|---|
| **Lovable preview / editor** | Supabase internal Lovable Cloud | Otomatis (file `.env` dikelola Lovable) |
| **Cloudflare (deploy via GitHub)** | Supabase pribadi Anda | Diset di GitHub Actions secrets + Cloudflare Worker secrets |

Mekanismenya sudah ditangani di `src/integrations/supabase/client.ts` dan `client.server.ts`:
- Browser membaca `import.meta.env.VITE_SUPABASE_*` (di-inject saat **build**).
- Server (Worker) membaca `process.env.SUPABASE_*` (di-inject saat **runtime**).

Jadi cukup mengatur env yang benar di setiap lingkungan — tidak ada kode yang perlu diedit.

---

## 1. Lovable (internal) — sudah aktif

`.env` di sandbox Lovable berisi key proyek Supabase internal Lovable Cloud:

```
VITE_SUPABASE_URL=https://sbimaqyofzlozyfeoros.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
SUPABASE_URL=https://sbimaqyofzlozyfeoros.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=...
```

Jangan diubah. File ini dikelola otomatis oleh Lovable.

---

## 2. Cloudflare via GitHub — pakai Supabase pribadi

### 2a. Jalankan migrasi ke Supabase pribadi
Buka SQL Editor di dashboard Supabase pribadi Anda → tempel isi
`/mnt/documents/supabase_full_migration.sql` → **Run**.

### 2b. Tambahkan GitHub Actions secrets (build-time, untuk browser)
Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Nama | Nilai |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref-anda>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key Supabase pribadi |
| `VITE_SUPABASE_PROJECT_ID` | `<project-ref-anda>` |

Pastikan workflow GitHub mengekspornya sebagai `env:` saat menjalankan `bun run build`.

### 2c. Tambahkan Cloudflare Worker secrets (runtime, untuk server functions)
Via `wrangler` CLI di repo lokal (atau dashboard Cloudflare → Workers → Settings → Variables):

```bash
wrangler secret put SUPABASE_URL                  # https://<ref>.supabase.co
wrangler secret put SUPABASE_PUBLISHABLE_KEY      # anon key
wrangler secret put SUPABASE_SERVICE_ROLE_KEY     # service-role key (rahasia!)
```

Pastikan **3 secret** tersebut terisi — kalau tidak, `createServerFn` yang
butuh admin client akan gagal saat dipanggil.

### 2d. Buat superadmin pertama di Supabase pribadi
Setelah deploy, daftarkan akun via halaman Login → lalu di SQL Editor Supabase
pribadi jalankan:

```sql
-- ganti <USER_ID> dengan id user hasil signup (lihat Auth → Users)
INSERT INTO public.user_roles (user_id, role) VALUES ('<USER_ID>','super_admin');
UPDATE public.profiles SET verified_at = now() WHERE id = '<USER_ID>';
```

---

## Verifikasi cepat

- Buka aplikasi yang sudah dideploy → DevTools → Network → tab Fetch
- Login dan amati URL request ke Supabase — host harus
  `https://<project-ref-anda>.supabase.co` (bukan `sbimaqyofzlozyfeoros`).

Jika masih menunjuk ke project Lovable: artinya `VITE_*` belum di-inject saat
build di GitHub Actions. Cek workflow YAML — secrets harus dipetakan ke
`env:` di step `build`.
