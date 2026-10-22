# ⚖️ BLUEMARQ - TRỢ LÝ SOÁT XÉT HỢP ĐỒNG AI (ENTERPRISE CONTRACT REVIEWER)

Ứng dụng web chuyên nghiệp hỗ trợ Ban Pháp chế, Ban Quản lý Dự án (PMO) và Ban Đấu thầu / Mua sắm đối chiếu ma trận tài liệu và soát xét hợp đồng kinh tế trước khi ký phát hành.

---

## 🌟 CÁC TÍNH NĂNG VƯỢT TRỘI ĐÃ HOÀN THIỆN

1. **Đối chiếu Ma trận Đa tài liệu 5 Tầng:**
   - **Tờ trình chủ trương / phê duyệt (PDF/Word):** Kiểm tra giá trị gói thầu, tỷ lệ tạm ứng, bảo lãnh thực hiện HĐ, tiến độ và điều kiện thanh toán.
   - **Giấy phép ĐKKD (PDF/Ảnh scan):** Kiểm tra từng ký tự tên công ty, mã số thuế, địa chỉ trụ sở chính, người đại diện theo pháp luật.
   - **Giấy ủy quyền (PDF/Ảnh scan):** Kiểm tra người ký có đúng thẩm quyền, số văn bản ủy quyền, hạn mức tiền tối đa và thời hạn hiệu lực.
   - **Bảng BOQ / Dự toán (Excel `.xlsx`):** Bóc tách tự động danh mục đơn giá, khối lượng và dòng tổng cộng để so khớp với Điều khoản Giá hợp đồng.
   - **Bảng tổng hợp điều chỉnh nội bộ:** Rà soát xem các nội dung các phòng ban đã chốt sửa đã được cập nhật vào bản thảo in chưa.
2. **Xuất File Word (.docx) Tự Động Track Changes & Comments:**
   - Sử dụng chuẩn Microsoft OpenXML ECMA-376.
   - Ghi nhận vết gạch đỏ (Deletion) và chèn chữ xanh (Insertion) mang **đúng tên người soát xét** (VD: *Nguyễn Văn A - Ban Pháp Chế*).
   - Tự động chèn **bong bóng Comment giải trình** bên lề phải văn bản nêu rõ căn cứ sai lệch so với Tờ trình/ĐKKD/BOQ.
   - Mở trên Microsoft Word, Office 365, WPS Office mượt mà, không bao giờ bị lỗi format hay hỏng file.
3. **Biên Bản Soát Xét Hợp Đồng (Executive Audit Report):**
   - Xuất biên bản tóm tắt pháp lý dạng bảng đối chiếu song song để kẹp vào hồ sơ trình ký Ban Lãnh đạo.
4. **Bảng Rà Soát Tương Tác (Interactive Matrix):**
   - Cho phép Cán bộ Pháp chế duyệt qua từng phát hiện, nhấn **Chấp nhận** hoặc **Bỏ qua** sửa đổi trước khi xuất file.
   - Bộ lọc thông minh theo mức độ rủi ro (Nghiêm trọng, Cần lưu ý, Lỗi nhỏ) và tìm kiếm từ khóa.

---

## 🚀 HƯỚNG DẪN ĐẨY LÊN GITHUB & DEPLOY ONLINE (CHẠY 24/7 MIỄN PHÍ)

### BƯỚC 1: Đẩy Dự Án Lên GitHub (Dễ nhất với GitHub Desktop)
Máy tính của bạn đã cài sẵn **GitHub Desktop**:
1. Mở phần mềm **GitHub Desktop**.
2. Chọn menu **File** ➔ **Add Local Repository...**
3. Trỏ tới thư mục dự án này:
   `c:\Users\Xuanlv\OneDrive - BLUEMARQ GROUP\XUANLV-KHONG XOA\1.TAI LIEU CA NHAN\6. AI\4. PM AI\contract-review-assistant-3-juin-2026-11-05-24`
4. Nếu GitHub Desktop thông báo *"This directory does not appear to be a Git repository"*, nhấn **create a repository** ➔ Đặt tên repo là `bluemarq-contract-reviewer` ➔ Nhấn **Create Repository**.
5. Nhấn nút **Publish repository** lên tài khoản GitHub của bạn (chọn Private hoặc Public tùy ý).

---

### BƯỚC 2: Triển Khai Miễn Phí Lên Render.com (Chỉ mất 2 phút)
1. Đăng nhập vào [https://render.com](https://render.com) (Đăng nhập bằng tài khoản GitHub).
2. Nhấn nút **New +** ở góc phải ➔ Chọn **Web Service**.
3. Chọn kho lưu trữ **`bluemarq-contract-reviewer`** vừa đẩy lên.
4. Điền các thông tin:
   - **Name:** `bluemarq-contract-reviewer` (hoặc tên tùy thích).
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
5. Cuộn xuống mục **Environment Variables** (Biến môi trường) ➔ Nhấn **Add Environment Variable**:
   - Key: `GEMINI_API_KEY`
   - Value: `(Dán API Key của bạn lấy tại https://aistudio.google.com/app/apikey)`
6. Nhấn **Deploy Web Service**.
7. Sau 2-3 phút, Render sẽ cấp cho bạn một đường link HTTPS trực tuyến (ví dụ: `https://bluemarq-contract-reviewer.onrender.com`). Bạn có thể chia sẻ link này cho toàn bộ nhân viên công ty sử dụng ngay trên trình duyệt máy tính hoặc điện thoại!

---

## 💻 HƯỚNG DẪN CHẠY THỬ NGHIỆM TẠI MÁY CÁ NHÂN (LOCAL DEV)

Nếu bạn muốn chạy trực tiếp trên máy tính Windows của bạn:
1. Cài đặt Node.js LTS (nếu máy chưa có) bằng lệnh PowerShell:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
2. Mở terminal tại thư mục dự án và chạy:
   ```bash
   npm install
   npm run dev
   ```
3. Mở trình duyệt truy cập: `http://localhost:3000`

---

## 📂 KIẾN TRÚC MÃ NGUỒN

- [server.ts](server.ts): Máy chủ Express backend tiếp nhận đa file, gọi Google Gemini 2.5 Pro với cơ chế tự động fallback khi nghẽn tải.
- [src/components/ContractReviewer.tsx](src/components/ContractReviewer.tsx): Giao diện người dùng chuẩn BLUEMARQ Group với đầy đủ tính năng tương tác.
- [src/lib/docx-track-changes.ts](src/lib/docx-track-changes.ts): Động cơ chèn Track Changes và Comments theo chuẩn Microsoft OpenXML ECMA-376.
- [src/lib/excel-parser.ts](src/lib/excel-parser.ts): Module bóc tách Bảng BOQ / Dự toán khối lượng từ file Excel (.xlsx).
- [src/lib/file-extractor.ts](src/lib/file-extractor.ts): Module xử lý thống nhất Word, PDF scan, Ảnh scan, Excel.
- [src/lib/gemini-prompts.ts](src/lib/gemini-prompts.ts): Bộ prompt đối chiếu ma trận 5 tầng chuyên sâu cho Luật sư Pháp chế.
- [src/lib/report-generator.ts](src/lib/report-generator.ts): Module xuất Biên bản Soát xét Hợp đồng chính thức.
- [Dockerfile](Dockerfile): Cấu hình Docker multi-stage tối ưu dung lượng sẵn sàng deploy lên Cloud.
- [render.yaml](render.yaml): Cấu hình tự động triển khai 1-click lên Render Cloud.
