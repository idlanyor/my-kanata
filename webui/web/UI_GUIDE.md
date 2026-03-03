# UI Guide

## Tujuan
Panduan ini jadi standar komponen UI agar halaman baru/lama konsisten secara visual dan perilaku.

## Komponen Inti
- `Button` (`web/src/components/ui/Button.jsx`)
- `Card`, `CardHeader`, `CardBody`, `CardFooter` (`web/src/components/ui/Card.jsx`)
- `Pill` (`web/src/components/ui/Pill.jsx`)
- `Table`, `TableWrap`, `THead`, `TBody`, `Th`, `Td` (`web/src/components/ui/Table.jsx`)
- `FormField`, `Input` (`web/src/components/ui/FormField.jsx`)
- `FlashMessage` (`web/src/components/ui/FlashMessage.jsx`)

Import cepat:
```js
import { Button, Card, Input, Table, TableWrap, THead, TBody, Th, Td } from '../components/ui';
```

## Aturan Pemakaian
- Gunakan `Button` untuk seluruh tombol aksi utama; hindari class tombol manual jika bukan kasus khusus.
- Gunakan `Card` untuk section container; gunakan `CardFooter` untuk pagination atau actions bawah.
- Gunakan `Pill` untuk status/label ringkas (`success`, `warning`, `danger`, `neutral`).
- Gunakan primitives `Table*` agar style tabel konsisten.
- Gunakan `FormField` + `Input` untuk input dasar.

## Feedback & Modal
- Gunakan hook `useModalFeedback` (`web/src/hooks/useModalFeedback.js`) untuk state notice + confirm.
- Gunakan `NoticeModal` dan `ConfirmModal` untuk notifikasi/konfirmasi.
- Hindari `alert`, `confirm`, `prompt` native browser.

## Styling Rules
- Selalu pakai CSS vars tema: `--bg-main`, `--bg-card`, `--text-primary`, `--text-secondary`, `--border-color`.
- Hindari hardcoded warna kecuali status semantics (success/warning/danger) yang sudah ada pola.
- Pertahankan ukuran teks utilitas:
  - heading helper: `heading-primary`, `heading-secondary`
  - metadata kecil: `text-[10px]` atau `text-[11px]`

## Rollout Checklist
Saat migrasi halaman:
1. Ganti tombol ke `Button`.
2. Ganti container section ke `Card`.
3. Ganti tabel ke `Table*` primitives.
4. Ganti input ke `FormField/Input`.
5. Pastikan tidak ada `alert/confirm/prompt`.
6. Pastikan feedback pakai `NoticeModal/ConfirmModal`.
