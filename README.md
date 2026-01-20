# WAG - WhatsApp Gateway

WAG adalah aplikasi gateway WhatsApp yang memungkinkan kamu untuk menghubungkan beberapa akun WhatsApp sekaligus dan mengelolanya melalui REST API. Aplikasi ini dibangun menggunakan Bun runtime dengan framework Elysia.js untuk performa yang optimal.

## Fitur Utama

- **Multi-sesi WhatsApp** - Hubungkan beberapa akun WhatsApp dalam satu aplikasi
- **Autentikasi fleksibel** - Mendukung QR Code dan Pairing Code
- **Webhook notifikasi** - Terima notifikasi real-time untuk setiap event
- **REST API lengkap** - Kelola koneksi dan kirim pesan melalui API
- **Penyimpanan lokal** - Data sesi tersimpan dengan SQLite

## Teknologi yang Digunakan

- [Bun](https://bun.sh/) v1.2+ - Runtime JavaScript
- [Elysia.js](https://elysiajs.com/) - Framework web
- [Baileys](https://github.com/WhiskeySockets/Baileys) - Library WhatsApp Web API

## Instalasi

Download file executable sesuai sistem operasi kamu dari [halaman releases](https://github.com/vermaysha/wag/releases):

| Sistem Operasi | File                        |
| -------------- | --------------------------- |
| Windows x64    | `wag-windows-{version}.exe` |
| Linux x64      | `wag-linux-{version}`       |
| macOS ARM64    | `wag-macos-{version}`       |

### Windows

1. Download `wag-windows-{version}.exe`
2. Jalankan file executable

```cmd
wag-windows-{version}.exe
```

### Linux

1. Download `wag-linux-{version}`
2. Beri permission executable

```bash
chmod +x wag-linux-{version}
```

1. Jalankan aplikasi

```bash
./wag-linux-{version}
```

### macOS (Apple Silicon)

1. Download `wag-macos-{version}`
2. Beri permission executable

```bash
chmod +x wag-macos-{version}
```

1. Jalankan aplikasi

```bash
./wag-macos-{version}
```

Aplikasi akan berjalan di `http://localhost:3000` (atau port yang dikonfigurasi).

## Konfigurasi

Konfigurasi dilakukan melalui environment variable:

| Variable | Deskripsi   | Default |
| -------- | ----------- | ------- |
| `PORT`   | Port server | `3000`  |

---

## Dokumentasi API

Semua endpoint menggunakan format JSON untuk request dan response.

### Connections

Endpoint untuk mengelola koneksi WhatsApp.

#### Daftar Semua Koneksi

Mendapatkan daftar semua sesi WhatsApp yang tersimpan.

```
GET /connections
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "device-001",
      "phoneNumber": "6281234567890",
      "webhookUrl": "https://example.com/webhook",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### Detail Koneksi

Mendapatkan detail koneksi berdasarkan ID.

```
GET /connections/:id
```

**Parameter:**

- `id` (path) - ID device/sesi

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "device-001",
    "phoneNumber": "6281234567890",
    "webhookUrl": "https://example.com/webhook",
    "isActive": true,
    "currentStatus": {
      "connectionState": "open",
      "isLoggedIn": true
    }
  }
}
```

#### Memulai Koneksi

Membuat dan memulai koneksi WhatsApp baru.

```
POST /connections/start
```

**Request Body:**

| Field         | Tipe   | Wajib | Deskripsi                                                |
| ------------- | ------ | ----- | -------------------------------------------------------- |
| `deviceId`    | string | Ya    | ID unik untuk device/sesi                                |
| `phoneNumber` | string | Tidak | Nomor telepon untuk pairing code (format: 6281234567890) |
| `webhookUrl`  | string | Tidak | URL webhook untuk menerima notifikasi                    |
| `name`        | string | Tidak | Nama untuk identifikasi koneksi                          |

**Contoh Request:**

```bash
curl -X POST http://localhost:3000/connections/start \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "phoneNumber": "6281234567890",
    "webhookUrl": "https://example.com/webhook"
  }'
```

**Response:**

```json
{
  "success": true,
  "message": "Connection started successfully",
  "data": {
    "connectionState": "connecting",
    "isLoggedIn": false
  }
}
```

**Catatan:**

- Jika `phoneNumber` disertakan, sistem akan otomatis generate pairing code selain QR code
- Jika `webhookUrl` disertakan, sistem akan memvalidasi URL dengan mengirim event `ping` terlebih dahulu
- Webhook harus mengembalikan HTTP status 200 agar validasi berhasil

#### Mendapatkan QR Code / Pairing Code

Mengambil QR code atau pairing code untuk autentikasi.

```
GET /connections/qr-code?deviceId=device-001
```

**Query Parameter:**

- `deviceId` (required) - ID device/sesi

**Response:**

```json
{
  "success": true,
  "data": {
    "qrCode": "2@abc123...",
    "pairingCode": "ABCD-EFGH",
    "hasQrCode": true,
    "hasPairingCode": true
  }
}
```

**Catatan:**

- `qrCode` berisi string yang bisa di-render menjadi QR code image
- `pairingCode` hanya tersedia jika `phoneNumber` disertakan saat memulai koneksi

#### Menghentikan Koneksi

Menghentikan koneksi WhatsApp tanpa menghapus data sesi.

```
POST /connections/stop
```

**Request Body:**

```json
{
  "deviceId": "device-001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Connection stopped successfully"
}
```

#### Logout dan Hapus Sesi

Logout dari WhatsApp dan menghapus semua data sesi.

```
POST /connections/logout
```

**Request Body:**

```json
{
  "deviceId": "device-001"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Session logged out and deleted"
}
```

**Catatan:** Setelah logout, kamu perlu scan QR code atau pairing code lagi untuk menghubungkan ulang.

#### Mengatur Status Online

Mengatur status online/offline di WhatsApp.

```
POST /connections/set-online
```

**Request Body:**

```json
{
  "deviceId": "device-001",
  "online": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "Presence set to online"
}
```

---

### Messages

Endpoint untuk mengirim pesan.

#### Kirim Pesan Teks

Mengirim pesan teks ke kontak atau grup WhatsApp.

```
POST /messages/send-text-message
```

**Request Body:**

| Field       | Tipe   | Wajib | Deskripsi                                                    |
| ----------- | ------ | ----- | ------------------------------------------------------------ |
| `deviceId`  | string | Ya    | ID device yang digunakan untuk mengirim                      |
| `recipient` | string | Ya    | JID penerima (lihat format di bawah)                         |
| `message`   | string | Ya    | Isi pesan (maksimal 4096 karakter)                           |
| `id`        | string | Tidak | ID pesan kustom (otomatis di-generate jika tidak disertakan) |

**Format JID Penerima:**

| Tipe            | Format                   | Contoh                         |
| --------------- | ------------------------ | ------------------------------ |
| Kontak personal | `{nomor}@s.whatsapp.net` | `6281234567890@s.whatsapp.net` |
| Grup            | `{groupId}@g.us`         | `120363123456789@g.us`         |
| LID (Linked ID) | `{lid}@lid`              | `123456789@lid`                |

**Contoh Request:**

```bash
curl -X POST http://localhost:3000/messages/send-text-message \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-001",
    "recipient": "6281234567890@s.whatsapp.net",
    "message": "Halo dari WAG!"
  }'
```

**Response:**

```json
{
  "success": true
}
```

**Catatan:**

- Pesan dikirim secara asinkron untuk menghindari rate limiting
- Sistem menambahkan delay otomatis antar pesan untuk mencegah pemblokiran
- Status pengiriman pesan dikirim melalui webhook (`message_sent` atau `message_error`)

---

## Dokumentasi Webhook

Webhook memungkinkan aplikasi kamu menerima notifikasi real-time tentang berbagai event yang terjadi di WhatsApp.

### Pengaturan Webhook

Saat memulai koneksi dengan `POST /connections/start`, sertakan parameter `webhookUrl`:

```json
{
  "deviceId": "device-001",
  "webhookUrl": "https://example.com/webhook"
}
```

Sistem akan memvalidasi webhook dengan mengirim request `ping`. Pastikan endpoint webhook kamu mengembalikan HTTP status 200.

### Format Request Webhook

Setiap notifikasi webhook dikirim dengan format:

```
POST {webhookUrl}
Content-Type: application/json
User-Agent: WAG-WhatsAppSession/{sessionId}
X-Session-ID: {sessionId}
X-Event: {eventName}
X-Timestamp: {isoTimestamp}

{
  "event": "{eventName}",
  "data": { ... }
}
```

### Daftar Event Webhook

#### ping

Dikirim saat validasi webhook URL.

```json
{
  "event": "ping",
  "data": {
    "deviceId": "device-001"
  }
}
```

**Response yang diharapkan:** HTTP 200

---

#### auth

Dikirim saat QR code atau pairing code tersedia untuk autentikasi.

**QR Code:**

```json
{
  "event": "auth",
  "data": {
    "auth": {
      "via": "qr_code",
      "data": "2@abc123..."
    }
  }
}
```

**Pairing Code:**

```json
{
  "event": "auth",
  "data": {
    "auth": {
      "via": "pair_code",
      "data": "ABCD-EFGH"
    }
  }
}
```

---

#### connecting

Dikirim saat proses koneksi ke WhatsApp dimulai.

```json
{
  "event": "connecting",
  "data": {}
}
```

---

#### ready

Dikirim saat koneksi berhasil terhubung dan siap digunakan.

```json
{
  "event": "ready",
  "data": {}
}
```

---

#### state

Dikirim saat status koneksi berubah. Field `data` berisi string status koneksi.

```json
{
  "event": "state",
  "data": "open"
}
```

**Kemungkinan nilai:**

- `connecting` - Sedang menghubungkan
- `open` - Terhubung dan siap
- `close` - Koneksi tertutup

---

#### close

Dikirim saat koneksi tertutup. Berisi informasi alasan dan apakah akan reconnect otomatis.

```json
{
  "event": "close",
  "data": {
    "reason": "Connection closed, reconnecting....",
    "isRestart": true
  }
}
```

**Kemungkinan alasan:**

| Reason                          | isRestart | Deskripsi                                       |
| ------------------------------- | --------- | ----------------------------------------------- |
| WhatsApp Service is Unavailable | `true`    | Layanan WhatsApp tidak tersedia, akan reconnect |
| Connection Forbidden            | `false`   | Kredensial tidak valid, perlu login ulang       |
| Bad Session File                | `false`   | File sesi rusak, perlu scan ulang               |
| Connection closed               | `true`    | Koneksi tertutup, akan reconnect                |
| Connection Lost from Server     | `true`    | Koneksi terputus dari server, akan reconnect    |
| Connection Replaced             | `false`   | Sesi digantikan sesi baru, perlu login ulang    |
| Device Logged Out               | `false`   | Perangkat logout, perlu scan ulang              |
| Restart Required                | `true`    | Perlu restart, akan reconnect                   |
| Multi-device Mismatch           | `false`   | Konflik multi-device, perlu scan ulang          |
| Session disconnected by user    | `false`   | Diputus oleh user                               |
| Process timeout reached         | `false`   | Timeout karena tidak ada aktivitas              |

---

#### message_sent

Dikirim saat pesan berhasil terkirim.

```json
{
  "event": "message_sent",
  "data": {
    "id": "msg-uuid-001",
    "deviceId": "device-001",
    "message": "Halo dari WAG!",
    "recipient": "6281234567890@s.whatsapp.net"
  }
}
```

---

#### message_error

Dikirim saat terjadi error saat mengirim pesan.

```json
{
  "event": "message_error",
  "data": {
    "id": "msg-uuid-001",
    "deviceId": "device-001",
    "message": "Halo dari WAG!",
    "recipient": "6281234567890@s.whatsapp.net",
    "error": "Socket not connected"
  }
}
```

---

### Contoh Implementasi Webhook Server

Berikut contoh sederhana webhook server menggunakan Express.js:

```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook', (req, res) => {
  const { event, data } = req.body;
  const sessionId = req.headers['x-session-id'];

  console.log(`[${sessionId}] Event: ${event}`);
  console.log('Data:', JSON.stringify(data, null, 2));

  switch (event) {
    case 'ping':
      console.log('Webhook validation received');
      break;
    case 'auth':
      if (data.auth.via === 'qr_code') {
        console.log('QR Code tersedia, silakan scan');
      } else if (data.auth.via === 'pair_code') {
        console.log('Pairing code:', data.auth.data);
      }
      break;
    case 'connecting':
      console.log('Menghubungkan ke WhatsApp...');
      break;
    case 'ready':
      console.log('WhatsApp siap digunakan!');
      break;
    case 'state':
      console.log(`Status koneksi: ${data}`);
      break;
    case 'message_sent':
      console.log(`Pesan terkirim ke ${data.recipient}`);
      break;
    case 'message_error':
      console.log(`Gagal kirim pesan: ${data.error}`);
      break;
    case 'close':
      console.log(`Koneksi tertutup: ${data.reason}`);
      if (data.isRestart) {
        console.log('Akan reconnect otomatis...');
      }
      break;
  }

  res.status(200).json({ received: true });
});

app.listen(3001, () => {
  console.log('Webhook server berjalan di port 3001');
});
```

---

## Struktur Direktori

```
src/
├── config.ts           # Konfigurasi aplikasi
├── db.ts               # Koneksi database
├── index.ts            # Entry point aplikasi
├── logger.ts           # Konfigurasi logging
├── shutdown.ts         # Graceful shutdown handler
├── server/
│   ├── index.ts        # Setup server Elysia
│   ├── connections/    # Endpoint manajemen koneksi
│   └── messages/       # Endpoint pengiriman pesan
└── whatsapp/
    ├── session-manager.ts    # Manajemen sesi WhatsApp
    ├── whatsapp-session.ts   # Class sesi WhatsApp
    ├── sqlite-auth-state.ts  # Penyimpanan state autentikasi
    └── ...
```

## Lisensi

Proyek ini bersifat privat dan proprietary. Semua hak dilindungi.
