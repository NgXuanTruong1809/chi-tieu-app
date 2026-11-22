# 💰 Chi Tiêu – App quản lý chi tiêu cá nhân (PWA)

Chạy trên **iPhone** và **Samsung/Android**, offline, miễn phí, không cần App Store.
Dữ liệu chỉ lưu trên điện thoại của bạn (không có server).

## Cấu trúc

```
chi-tieu-app/
├── index.html            # Giao diện
├── styles.css            # Style (tự sáng/tối theo điện thoại)
├── app.js                # Toàn bộ logic
├── sw.js                 # Service worker (chạy offline)
├── manifest.webmanifest  # Thông tin cài đặt PWA
└── icons/                # Icon app
```

## Chạy thử trên máy tính

```bash
npx serve .
```
Mở http://localhost:3000. Mẹo: bấm F12, chọn chế độ điện thoại để xem như trên mobile.

## Đưa lên mạng miễn phí (GitHub Pages)

1. Tạo tài khoản tại https://github.com (nếu chưa có).
2. Tạo repository mới, ví dụ `chi-tieu-app`, chọn **Public**.
3. Trong folder này, chạy:
   ```bash
   git init
   git add .
   git commit -m "Chi Tiêu app"
   git branch -M main
   git remote add origin https://github.com/<ten-github>/chi-tieu-app.git
   git push -u origin main
   ```
4. Trên GitHub, vào repo → **Settings → Pages** → Source: `Deploy from a branch` → Branch: `main` / `(root)` → **Save**.
5. Đợi 1–2 phút, app có tại: `https://<ten-github>.github.io/chi-tieu-app/`

> Code công khai nhưng **dữ liệu chi tiêu không bị lộ**, vì dữ liệu chỉ nằm trên điện thoại của bạn.

## Cài lên điện thoại

**iPhone:** mở link bằng **Safari** → nút **Chia sẻ** (⬆️) → **Thêm vào MH chính** → Thêm.

**Samsung:** mở link bằng **Chrome** hoặc **Samsung Internet** → menu ⋮ → **Cài đặt ứng dụng** / **Thêm vào màn hình chính**.

## Cập nhật app sau khi sửa code

1. Sửa code, rồi tăng `CACHE_VERSION` trong `sw.js` (ví dụ `chitieu-v2`).
2. `git add . && git commit -m "update" && git push`
3. Trên điện thoại: mở app khi có mạng, đóng hẳn rồi mở lại.

## ⚠️ Lưu ý về dữ liệu

- Dữ liệu nằm riêng trên **từng máy**. iPhone và Samsung là hai sổ độc lập.
- Chuyển dữ liệu giữa hai máy: **Cài đặt → Xuất file backup** ở máy này, gửi file sang máy kia (Zalo, Drive, email...), rồi **Nhập file backup**. Lưu ý: nhập sẽ thay thế toàn bộ dữ liệu cũ.
- **Xóa app khỏi màn hình chính hoặc xóa dữ liệu trình duyệt = mất dữ liệu.** Hãy xuất backup định kỳ.
- Trên iPhone, app cài ở màn hình chính và Safari có vùng dữ liệu riêng. Hãy luôn mở bằng icon ngoài màn hình chính.
