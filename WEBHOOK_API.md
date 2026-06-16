# Webhook API Documentation

API ini memungkinkan layanan eksternal untuk mengirim pesan melalui bot WhatsApp secara programatik.

## Konfigurasi Server

API ini dikonfigurasi melalui variabel lingkungan (Environment Variables):

| Variabel                | Deskripsi                                  | Default       |
| ----------------------- | ------------------------------------------ | ------------- |
| `BOT_WEBHOOK_PORT`      | Port jalannya server API                   | `8787`        |
| `BOT_WEBHOOK_TOKEN`     | Token rahasia untuk autentikasi Bearer     | (Wajib diisi) |
| `BOT_WEBHOOK_ALLOWLIST` | Daftar IP yang diizinkan (dipisahkan koma) | (Semua IP)    |

## Keamanan

Semua endpoint (kecuali `/health`) memerlukan header Authorization:

```http
Authorization: Bearer YOUR_WEBHOOK_TOKEN
```

### Batasan (Limits)

- **Rate Limit**: 60 request per menit per IP/Token.
- **Payload Size**: Maksimal 256 KB.

---

## Endpoint API

### 1. Health Check

Mengecek apakah API sedang aktif.

- **URL**: `/health`
- **Method**: `GET`
- **Auth**: Tidak perlu.
- **Response**:
    ```json
    { "ok": true, "service": "webhook-api" }
    ```

### 2. Kirim Pesan Teks

Mengirim pesan teks ke pengguna atau grup.

- **URL**: `/api/webhook/send-text`
- **Method**: `POST`
- **Body (JSON)**:
  | Field | Tipe | Deskripsi |
  |-------|------|-----------|
  | `to` | `string` | Nomor tujuan (contoh: `62812xxx`) atau JID |
  | `text` | `string` | Isi pesan teks |

- **Contoh Request**:
    ```json
    {
        "to": "628123456789",
        "text": "Halo, ini pesan otomatis dari sistem."
    }
    ```

### 3. Kirim Dokumen

Mengirim file dokumen menggunakan data Base64.

- **URL**: `/api/webhook/send-document`
- **Method**: `POST`
- **Body (JSON)**:
  | Field | Tipe | Wajib | Deskripsi |
  |-------|------|-------|-----------|
  | `to` | `string` | Ya | Nomor tujuan atau JID |
  | `data` | `string` | Ya | Data file dalam format Base64 |
  | `fileName`| `string` | Tidak | Nama file (default: `document.pdf`) |
  | `mimetype`| `string` | Tidak | Tipe MIME file (default: `application/pdf`) |
  | `caption` | `string` | Tidak | Keterangan di bawah dokumen |

- **Contoh Request**:
    ```json
    {
        "to": "628123456789",
        "data": "SGVsbG8gV29ybGQh",
        "fileName": "catatan.txt",
        "mimetype": "text/plain",
        "caption": "Berikut adalah filenya."
    }
    ```

---

## Finance API

### 1. Laporan Keuangan

Mengambil riwayat transaksi bulanan.

- **URL**: `/api/webhook/finance/report`
- **Method**: `GET`
- **Query Params**:
  | Field | Wajib | Deskripsi |
  |-------|-------|-----------|
  | `userId` | Ya | ID Pengguna (nomor WA) |
  | `month` | Tidak | Bulan (1-12), default bulan sekarang |
  | `year` | Tidak | Tahun (YYYY), default tahun sekarang |

### 2. Catat Transaksi

Mencatat transaksi baru, bisa secara manual atau via AI (teks/gambar/suara).

- **URL**: `/api/webhook/finance/catat`
- **Method**: `POST`
- **Body (JSON)**:
    - **Opsi A: Via AI**
      | Field | Tipe | Wajib | Deskripsi |
      |-------|------|-------|-----------|
      | `userId` | `string` | Ya | ID Pengguna |
      | `text` | `string` | Tidak* | Prompt teks transaksi |
      | `fileBase64` | `string` | Tidak* | Data gambar/suara Base64 |
      | `mimeType` | `string` | Tidak | MIME type file |
      _\*Salah satu dari text atau fileBase64 harus ada._

    - **Opsi B: Manual**
      | Field | Tipe | Wajib | Deskripsi |
      |-------|------|-------|-----------|
      | `userId` | `string` | Ya | ID Pengguna |
      | `type` | `string` | Ya | `income` atau `expense` |
      | `amount` | `number` | Ya | Nominal |
      | `description` | `string` | Ya | Keterangan |
      | `category` | `string` | Tidak | Kategori |

### 3. Hapus Transaksi

Menghapus transaksi berdasarkan ID atau transaksi terakhir.

- **URL**: `/api/webhook/finance/delete`
- **Method**: `DELETE`

- **Body (JSON)**:
  | Field | Tipe | Wajib | Deskripsi |
  |-------|------|-------|-----------|
  | `userId` | `string` | Ya | ID Pengguna |
  | `transactionId` | `string` | Tidak | ID Transaksi (jika kosong, hapus transaksi terakhir) |

---

## Response API

### Sukses (200 OK)

```json
{
    "ok": true,
    "data": {
        "to": "628123456789@s.whatsapp.net",
        "messageId": "BAE5D8E8F8E..."
    }
}
```

### Error

| Kode  | Makna                                       |
| ----- | ------------------------------------------- |
| `400` | Payload tidak lengkap atau JSON tidak valid |
| `401` | Token salah atau tidak disertakan           |
| `403` | IP Anda tidak terdaftar di allowlist        |
| `429` | Terlalu banyak request (Rate limit)         |
| `503` | Koneksi Bot WhatsApp terputus               |
