# User Dashboard - File Management Guide

## 📁 Fitur User Dashboard

User Dashboard adalah halaman untuk user biasa (non-admin) yang mirip dengan **Google Drive**, di mana user bisa:

- ✅ Melihat folder yang sudah di-assign oleh admin
- ✅ Upload file ke folder tersebut
- ✅ Download file
- ✅ Buat subfolder baru
- ✅ Rename file/folder
- ✅ Delete file/folder
- ✅ Navigasi subfolder
- ✅ Grid view atau List view
- ✅ Read-only mode untuk folder tertentu

---

## 🎯 Cara Menggunakan

### 1. **Login sebagai User**
- Login dengan akun user yang sudah dibuat admin
- Setelah login, klik menu **"My Files"** di sidebar

### 2. **Memilih Folder**
- Di bagian atas, akan terlihat tombol-tombol folder yang sudah di-assign ke user Anda
- Klik folder yang ingin diakses
- Jika folder bertulisan **(Read Only)**, Anda hanya bisa melihat dan download, tidak bisa upload/edit

### 3. **Navigasi Folder**
- Klik icon **Home** untuk kembali ke root folder
- Klik tombol **← Back** untuk kembali ke folder sebelumnya
- Klik folder untuk masuk ke subfolder
- Path saat ini ditampilkan: `Nama Folder / subfolder1 / subfolder2`

### 4. **Upload File**
- Klik tombol **"Upload File"** (hijau)
- Pilih file dari komputer Anda
- Progress upload akan ditampilkan
- Maksimal ukuran file: **5GB**
- File akan diupload ke folder/subfolder yang sedang aktif

### 5. **Buat Folder Baru**
- Klik tombol **"New Folder"** (biru)
- Masukkan nama folder
- Folder baru akan dibuat di lokasi saat ini

### 6. **Download File**
- Klik icon **Download** (↓) pada file yang ingin didownload
- File akan didownload ke komputer Anda

### 7. **Rename File/Folder**
- Klik icon **Edit** (pensil) pada file/folder
- Masukkan nama baru
- Tekan OK untuk menyimpan

### 8. **Delete File/Folder**
- Klik icon **Trash** (tempat sampah) pada file/folder
- Konfirmasi delete
- **Hati-hati**: Delete bersifat permanen!

### 9. **Ganti View Mode**
- **Grid View**: Tampilan kotak-kotak (default)
- **List View**: Tampilan tabel dengan detail file
- Klik icon di kanan atas untuk toggle

---

## 🔒 Permission Levels

### **Read Only**
- ✅ Lihat file dan folder
- ✅ Download file
- ❌ Upload file
- ❌ Buat folder
- ❌ Edit/Delete file
- ❌ Rename

### **Read/Write** (Full Access)
- ✅ Semua fitur Read Only
- ✅ Upload file
- ✅ Buat subfolder
- ✅ Rename file/folder
- ✅ Delete file/folder

---

## 📊 Informasi File

Dalam **Grid View**:
- Icon folder (kuning) atau file (biru)
- Nama file/folder
- Ukuran file (untuk file)

Dalam **List View**:
- Nama file/folder
- Type (file atau folder)
- Ukuran
- Tanggal modifikasi
- Action buttons

---

## 💡 Tips & Tricks

1. **Organisasi File**
   - Buat subfolder untuk mengorganisir file Anda
   - Gunakan nama yang jelas dan deskriptif
   - Hindari nama file dengan karakter khusus (`/`, `\`)

2. **Upload Besar**
   - Untuk file besar (>1GB), pastikan koneksi stabil
   - Progress upload akan ditampilkan
   - Jangan refresh page saat upload

3. **Backup**
   - Selalu backup file penting ke local
   - RAID tidak menggantikan backup
   - Download file penting secara berkala

4. **Navigation**
   - Gunakan breadcrumb (path) untuk tracking lokasi
   - Gunakan tombol Home untuk cepat ke root
   - Double click folder untuk masuk (Grid View)

5. **Search**
   - Browser search (Ctrl+F) bisa digunakan untuk cari file
   - Rename file dengan prefix untuk grouping (mis: `project-`)

---

## 🚫 Troubleshooting

### **Folder Kosong / No Folders Assigned**
**Problem**: Tidak ada folder yang muncul
**Solusi**: 
- Hubungi admin untuk assign folder ke akun Anda
- Admin bisa assign folder via User Management > Edit User > Assign Folders

### **Upload Gagal**
**Problem**: File tidak terupload
**Solusi**:
- Check koneksi internet
- Pastikan ukuran file < 5GB
- Pastikan Anda tidak dalam Read Only mode
- Check disk space di server (hubungi admin)

### **Access Denied**
**Problem**: Error "Access denied" atau "Read only"
**Solusi**:
- Folder dalam mode Read Only
- Hubungi admin untuk upgrade permission ke Read/Write

### **File Hilang**
**Problem**: File yang diupload tidak terlihat
**Solusi**:
- Refresh halaman (F5)
- Check apakah upload benar-benar selesai (100%)
- Pastikan berada di folder yang benar
- Hubungi admin jika masih hilang

### **Tidak Bisa Delete**
**Problem**: Tombol delete tidak berfungsi
**Solusi**:
- Pastikan file tidak sedang digunakan
- Pastikan bukan Read Only folder
- Hubungi admin jika file stuck

---

## 🔐 Keamanan

1. **Permissions**
   - Hanya folder yang di-assign yang bisa diakses
   - User tidak bisa akses folder user lain
   - Admin bisa lihat semua folder

2. **File Security**
   - Semua akses terautentikasi via JWT
   - Session timeout 2 jam
   - Path validation mencegah directory traversal

3. **Privacy**
   - File Anda hanya bisa dilihat oleh:
     - Anda sendiri
     - Admin
     - User lain yang punya akses ke folder yang sama

---

## 📱 Responsive Design

- ✅ Desktop: Full features
- ✅ Tablet: Optimized layout
- ✅ Mobile: Grid view recommended, swipe friendly

---

## 🎨 UI Components

### Grid View
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│ 📁      │ │ 📄      │ │ 📁      │
│ Folder  │ │ File.pdf│ │ Photos  │
│ ━ ✏ 🗑 │ │ ↓ ✏ 🗑 │ │ ━ ✏ 🗑 │
└─────────┘ └─────────┘ └─────────┘
```

### List View
```
Name         Type    Size    Modified           Actions
─────────────────────────────────────────────────────────
📁 Documents  Folder  -       2024-11-09 10:00   ━ ✏ 🗑
📄 Report.pdf File    2.5 MB  2024-11-09 09:30   ↓ ✏ 🗑
📁 Images     Folder  -       2024-11-08 15:20   ━ ✏ 🗑
```

---

## 🔗 Related Documentation

- [User Management Guide](USER_MANAGEMENT_GUIDE.md) - Untuk admin
- [Folder Management](FOLDER_MANAGEMENT_GUIDE.md) - Untuk admin (TBD)
- [RAID Configuration](RAID_CONFIGURATION_GUIDE.md) - Untuk admin

---

## 📞 Support

Jika mengalami masalah:
1. Check dokumentasi ini terlebih dahulu
2. Hubungi system administrator
3. Report bug dengan detail:
   - Apa yang dilakukan
   - Error message (jika ada)
   - Browser yang digunakan
   - Screenshot (jika mungkin)

---

## 🆕 Changelog

### Version 1.0.0 (Nov 2024)
- ✅ Initial release
- ✅ Grid & List view
- ✅ Upload/Download files
- ✅ Create/Delete folders
- ✅ Rename files/folders
- ✅ Permission-based access
- ✅ Subfolder navigation
- ✅ Progress indicator for uploads
- ✅ Read-only mode support

---

**Developed for NAS System**
Version: 1.0.0
