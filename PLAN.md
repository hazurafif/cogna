# Cogna — Riset & Rencana Fitur

> Dokumen ini hasil audit codebase (backend Go + app Expo RN) dan riset kompetitor
> (Strava, Forest, Study Bunny, YPT, habit tracker: Strides, qbito, Habitwill).
> Tujuan: daftar fitur yang **perlu dibikin**, diurutkan berdasarkan prioritas.

---

## 1. Kondisi saat ini (audit v1)

**Backend (Go/chi/SQLite/JWT) — sudah ada:**

| Area | Status |
|---|---|
| Auth (register, login, JWT, `/me`) | ✅ |
| Katalog subjek tetap (11 subjek global, icon) | ✅ |
| Sessions CRUD (`GET/POST/PUT/DELETE`, filter `from/to/subject_id`) | ✅ |
| Stats summary (`total`, `week`, `streak_days`, `per_subject`) | ✅ |

**App (Expo RN + expo-router) — sudah ada:**

| Area | Status |
|---|---|
| Login/Register | ✅ |
| Home: greeting, progress goal harian, bar mingguan, history per hari | ✅ |
| Record: timer + log manual + haptics | ✅ (tanpa pause) |
| You: streak, heatmap 6 bulan, ringkasan 8 minggu, breakdown subjek | ✅ |
| Detail/edit/hapus session, dark & light theme | ✅ |

**Gap yang terlihat langsung dari code:**

- `DAILY_GOAL_MINUTES = 120` **hardcoded** di `app/src/utils/daily.ts` — tidak bisa diatur user.
- Timer tidak bisa pause/resume.
- Tidak ada search & pagination di daftar session.
- Tidak ada notifikasi/reminder.
- Tidak ada profil (avatar = inisial email, tanpa nama).
- Tidak ada gamifikasi di luar streak; tidak ada sosial.

---

## 2. Insight riset

### Dari Strava (pola engagement yang membuat adiktif)
1. **Segment** → kompetisi dipecah jadi konteks kecil (per subjek/minggu), bukan leaderboard global yang tidak relevan. → *Untuk Cogna: leaderboard & challenge per subjek/per minggu.*
2. **Kudos** → validasi sosial satu-tap. Riset menunjukkan kudos meningkatkan frekuensi aktivitas. → *Untuk Cogna: kudos antar teman.*
3. **Challenge** → target berjangka (mis. "8 jam minggu ini"). → *Untuk Cogna: weekly challenge.*
4. **Flywheel sosial** → makin banyak teman, makin sering balik ke app. Ini kunci retention Strava, tapi butuh fitur sosial penuh (mahal).

### Dari study tracker (Forest, Study Bunny, YPT, Athenify)
- **Reward/koin + item** (Study Bunny) → gamifikasi ringan, terbukti dipakai.
- **Pause timer** (Study Bunny) → kebutuhan dasar yang belum ada di Cogna.
- **Planner / to-do + review harian 10 menit** (YPT) → pelengkap tracking.
- **Study group** (YPT) → versi sosial yang lebih ringan dari follow.

### Dari habit tracker (Strides, qbito, Habitwill, Metamorphic)
- **Reminder yang adaptif** (qbito: reminder kedua 2 jam setelah reminder utama saat streak ≥ 7 hari = "streak protection").
- **Goal yang bisa dikonfigurasi** (harian/mingguan/bulanan, per habit).
- **Analytics/chart** sebagai alasan balik ke app ("insight yang bantu pahami pola").
- **Widget home screen** untuk logging super cepat.

### Kesimpulan riset
Urutan nilai vs biaya untuk Cogna (tracker solo → sosial bertahap):
1. **Konfigurasi goal + pause timer + search/pagination** = menyempurnakan inti (murah, high value).
2. **Reminder/streak protection + achievements + weekly challenge + chart** = retention & gamification (sedang, high value) — ini "Strava-like" tanpa butuh sosial.
3. **Follow/kudos/leaderboard + share card** = sosial (mahal, nilai besar tapi setelah inti & gamification solid).

---

## 3. Roadmap fitur

### 🔴 P0 — Sempurnakan inti (harus sebelum yang lain)

> ✅ **SELESAI (Sprint 1)** — lihat commit "feat: P0"

| # | Fitur | Kenapa | Backend | App | Effort |
|---|---|---|---|---|---|
| 1 | **Goal harian/ mingguan yang bisa diatur** | `DAILY_GOAL_MINUTES` hardcoded 120; habit tracker mana pun punya goal configurable | Tabel `settings` (user_id, daily_goal_min, weekly_goal_min) + `GET/PUT /api/v1/settings`; ikutkan `daily_goal` di `/stats/summary` | Screen Settings (ganti hardcoded di `daily.ts` jadi dari API); edit goal dari Home | 2–3 hari |
| 2 | **Timer pause/resume** | Kebutuhan dasar study timer (Study Bunny punya); sekarang stop = save | Tidak perlu (state client-side) — tapi pertimbangkan `running_session` di DB agar tahan app di-kill | RecordScreen: state `paused`, elapsed tersimpan; haptics saat pause | 1–2 hari |
| 3 | **Search + pagination sessions** | `GET /sessions` sudah punya filter from/to/subject; belum ada search note & pagination — history bakal panjang | Tambah param `q` (LIKE pada note), `limit/offset` atau cursor; pastikan total/next di response | Home history: search bar + infinite scroll / load more | 2–3 hari |
| 4 | **Profil: display name** | Avatar = inisial email; identitas dasar sebelum fitur sosial | Kolom `name` di users + `PATCH /api/v1/me` | YouScreen: edit nama, avatar = inisial nama | 1–2 hari |

### 🟠 P1 — Retention & gamification (inti "Strava-like" tanpa sosial)

> ✅ **P1a SELESAI** — reminder + streak protection & achievements.
> ✅ **P1b SELESAI** — weekly challenge & charts + insight. **P1 tuntas.**
> ✅ **P2 SELESAI** — follow + feed + kudos, leaderboard teman, share session. **Roadmap inti tuntas.**

| # | Fitur | Kenapa | Backend | App | Effort |
|---|---|---|---|---|---|
| 5 | **Daily reminder + streak protection** | Insight qbito: reminder kedua 2 jam setelah reminder utama saat streak ≥ 7 hari; reminder adalah alasan balik ke app | Endpoint token expo push (atau mulai lokal dulu) + aturan kapan reminder dikirim; tabel `push_tokens` | `expo-notifications`: jadwal lokal harian; logic streak-protection dari `summary.streak_days` | 3–4 hari |
| 6 | **Achievements/badges** | Gamifikasi terbukti (Study Bunny, Duolingo); murah karena data sudah ada | Tabel `achievements` (kode, nama, deskripsi, kondisi) + `user_achievements`; evaluasi saat session dibuat; endpoint `GET /api/v1/achievements` | Screen badges + toast saat unlock; tampilkan di YouScreen | 3–4 hari |
| 7 | **Weekly challenge** | Pola Strava: konteks kompetisi kecil & berjangka | Tabel `challenges` + `challenge_progress` dihitung dari sessions; `GET /api/v1/challenges` (aktif + progress) | Banner challenge di Home + progress bar | 3–4 hari |
| 8 | **Charts & insight** | Analytics = alasan balik ke app (Metamorphic, Strides); `react-native-svg` sudah dipakai untuk ring timer | Endpoint baru `GET /api/v1/stats/trend?days=30` (per-hari/per-subjek), `longest_session`, `avg_per_day` | Line/bar chart per subjek & per bulan; kartu insight di YouScreen | 3–4 hari |

### 🟡 P2 — Sosial (flywheel Strava; baru setelah P0+P1 stabil)

| # | Fitur | Kenapa | Backend | App | Effort |
|---|---|---|---|---|---|
| 9 | **Follow + activity feed + kudos** | Inti retention Strava (riset: kudos meningkatkan frekuensi); tapi mahal — lakukan terakhir | Tabel `follows`, `kudos`; feed = sessions teman yang di-follow; `POST /api/v1/sessions/{id}/kudos` | Tab/feed baru, tombol kudos, daftar teman (cari by email) | 2–3 minggu |
| 10 | **Leaderboard teman (per minggu/subjek)** | Segment ala Strava: peringkat kecil yang relevan, bukan global | Agregasi dari sessions + follows; `GET /api/v1/leaderboard?scope=friends&period=week` | Tab leaderboard dengan filter subjek | 5–7 hari |
| 11 | **Share card** | Virality Strava: bagikan ringkasan aktivitas sebagai gambar | Tidak perlu (client-side) | Generate image (view-shot / canvas) + share sheet; QR/link ke profil | 3–5 hari |

### 🟢 P3 — Nice to have (setelah inti mantap)

| # | Fitur | Catatan | Effort |
|---|---|---|---|
| 12 | Export data (CSV/JSON) | Mudah; endpoint `GET /api/v1/export` | 1–2 hari |
| 13 | Widget home screen (iOS/Android) | Logging cepat; perlu expo-widgets (iOS) + plugin Android | 3–5 hari |
| 14 | i18n (ID/EN) | Pasar lokal; refactor semua string | 2–3 hari |
| 15 | Offline queue (mutasi pending) | Nilai besar tapi kompleks; cocok setelah ada stabil | 1 minggu |
| 16 | Pomodoro mode di timer | Mode 25/5 di RecordScreen | 2 hari |
| 17 | To-do/planner harian | Pola YPT; perlu desain dulu | 1 minggu |

### ❌ Jangan dibikin (dulu)
- **Flashcards** (Study Bunny) — di luar domain tracker; buang fokus.
- **Global leaderboard** — melawan insight Strava (kompetisi tanpa konteks = tidak relevan).
- **Chat/group messaging** — mahal, moderasi; YPT pakai ini tapi scope besar.

---

## 4. Urutan eksekusi yang disarankan

```
Sprint 1 (P0):  ✅ goal configurable → ✅ pause timer → ✅ search+pagination → ✅ display name
Sprint 2 (P1a): ✅ reminder + streak protection → ✅ achievements
Sprint 3 (P1b): ✅ weekly challenge → ✅ charts & insight
Sprint 4 (P2):  ✅ follow+feed+kudos → ✅ leaderboard teman → ✅ share card
Setelahnya:     P3 sesuai kebutuhan (export & i18n paling cepat menang)
```

**Aturan main:**
- Setiap fitur backend wajib test Go (gate coverage ≥ 80% sudah ada) + test app (`pnpm test`).
- Fitur sosial (P2) hanya dikerjakan setelah P0 & P1 selesai — dasar engagement solo harus kuat dulu (data, streak, goal, reminder) sebelum ada orang lain di dalamnya.
- Migrasi SQL bertahap (`0004_*.sql` dst), jangan ubah migrasi lama.
