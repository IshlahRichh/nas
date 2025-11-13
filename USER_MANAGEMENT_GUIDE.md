# User Management - Excel Import Guide

## 📥 Cara Import User dari Excel

### 1. Download Template Excel
- Klik tombol **"Download Template"** di User Management page
- File `user_import_template.xlsx` akan terdownload
- Template berisi contoh format yang benar

### 2. Format Excel yang Diperlukan

File Excel harus memiliki kolom berikut:

| Column   | Type   | Required | Description                    | Example              |
|----------|--------|----------|--------------------------------|----------------------|
| name     | Text   | ✅ Yes   | Nama lengkap user              | John Doe             |
| email    | Email  | ✅ Yes   | Email address (harus unik)     | john@example.com     |
| password | Text   | ✅ Yes   | Password (minimum 6 karakter)  | password123          |
| role     | Text   | ❌ No    | Role: 'user' atau 'admin'      | user                 |

### 3. Contoh Data Excel

```
| name        | email              | password    | role  |
|-------------|-------------------|-------------|-------|
| John Doe    | john@example.com  | pass123456  | user  |
| Jane Admin  | jane@example.com  | admin123    | admin |
| Bob Smith   | bob@example.com   | password    | user  |
```

### 4. Langkah Import

1. **Siapkan file Excel** dengan format yang benar
2. Klik tombol **"Import Excel"** 
3. Pilih file Excel (.xlsx atau .xls)
4. **Preview data** akan ditampilkan
5. Periksa apakah semua data valid (✓ Valid / ❌ Invalid)
6. Klik tombol **"Import Users"**
7. Tunggu proses selesai
8. Cek **Import Results** untuk melihat summary:
   - ✓ Success: Jumlah user berhasil diimport
   - ❌ Failed: Jumlah user gagal diimport
9. Lihat detail error untuk user yang gagal

### 5. Validasi Data

Sistem akan otomatis validasi:
- ✅ Email format harus valid (xxx@xxx.xxx)
- ✅ Password minimal 6 karakter
- ✅ Email tidak boleh duplicate
- ✅ Name, email, password harus diisi
- ✅ Role default 'user' jika tidak diisi

### 6. Error Handling

Jika import gagal:
- Periksa format email
- Pastikan password minimal 6 karakter
- Cek duplicate email di database
- Pastikan semua required field terisi

### 7. Tips

- **Backup data** sebelum bulk import
- **Test dengan 1-2 user** dulu sebelum import banyak
- **Hapus header row** jika ada multiple header
- **Gunakan Sheet pertama** di Excel file
- **Role case-insensitive**: 'admin', 'Admin', 'ADMIN' semua valid

## 🔐 Assign Folders ke User

### 1. Cara Assign Folders

1. Klik icon **folder (🗂️)** pada kolom Action di user yang dipilih
2. Modal akan muncul menampilkan daftar semua folder
3. **Centang folder** yang ingin di-assign ke user
4. Klik **"Assign Folders"**
5. User sekarang punya akses ke folder yang dipilih

### 2. Permission Type

Saat ini permission default adalah **'read'**. 
Di masa depan bisa dikembangkan:
- read: Hanya baca
- write: Baca dan tulis
- admin: Full control

### 3. Unassign Folders

- Buka modal assign folders
- **Uncheck** folder yang ingin dihapus aksesnya
- Klik "Assign Folders"
- Folder permissions akan di-update

## 📊 Database Schema

### Users Table
```sql
CREATE TABLE Users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### Folders Table
```sql
CREATE TABLE Folders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  folder_name VARCHAR(255) NOT NULL,
  path VARCHAR(255) UNIQUE NOT NULL,
  owner_id INT NOT NULL,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES Users(id)
);
```

### Permissions Table (Junction Table)
```sql
CREATE TABLE Permissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  folder_id INT NOT NULL,
  permission_type VARCHAR(50) DEFAULT 'read',
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (folder_id) REFERENCES Folders(id)
);
```

## 🔌 API Endpoints

### User Management

```bash
# Get all active users
GET /api/users

# Get all users (including inactive)
GET /api/users/all

# Get single user
GET /api/users/:id

# Create user
POST /api/users
Body: { name, email, password, role }

# Update user
PUT /api/users/:id
Body: { name, email, password?, role }

# Delete user (soft delete)
DELETE /api/users/:id

# Restore user
PATCH /api/users/:id/restore

# Bulk import users
POST /api/users/bulk-import
Body: { users: [{ name, email, password, role }] }

# Get user's folders
GET /api/users/:userId/folders

# Assign folders to user
POST /api/users/:userId/folders
Body: { folderIds: [1, 2, 3] }
```

### Folder Management

```bash
# Get all folders
GET /api/folders

# Get single folder
GET /api/folders/:id

# Create folder
POST /api/folders
Body: { folder_name, path, owner_id? }

# Update folder
PUT /api/folders/:id
Body: { folder_name, path, owner_id }

# Delete folder
DELETE /api/folders/:id
```

## 🚀 Features

✅ **User Management CRUD**
- Create, Read, Update, Delete users
- Soft delete (is_active column)
- Role-based access (admin/user)

✅ **Bulk Import dari Excel**
- Download template Excel
- Import multiple users sekaligus
- Validation otomatis
- Error reporting detail

✅ **Folder Permissions**
- Assign multiple folders ke user
- Many-to-many relationship
- Unassign folders

✅ **Statistics Dashboard**
- Total users
- Admin vs regular users
- Total folders
- User activity

✅ **Search & Filter**
- Search by name, email, role
- Sort by any column
- Pagination

## 🎨 UI Components

- **Mantine DataTable**: Advanced table dengan sorting, pagination
- **Modal dialogs**: Add/Edit user, Assign folders, Import preview
- **File upload**: Drag & drop Excel files
- **Statistics cards**: Visual metrics
- **Tooltips**: Action button hints

## 🔒 Security

- JWT authentication required untuk semua endpoints
- Admin-only access untuk user management
- Password hashing dengan bcrypt (10 rounds)
- Email uniqueness validation
- Session timeout (2 hours)
- Soft delete untuk data integrity

---

**Developed for NAS System**
Version: 1.0.0
