# 🏛️ BLUEMARQ GROUP - HỆ THỐNG TRÍ TUỆ NHÂN TẠO SOÁT XÉT HỢP ĐỒNG ONLINE
> **Hệ thống Pháp chế AI & Đối chiếu Ma trận Đa tài liệu 5 Phòng ban chuyên môn | Tự động xuất Microsoft Word Track Changes & Comments chuẩn ECMA-376**

---

## 🌟 TỔNG QUAN HỆ THỐNG

Ứng dụng web cấp doanh nghiệp được phát triển riêng cho **Tập đoàn BLUEMARQ (BLUEMARQ GROUP)**, hỗ trợ Hội đồng Soát xét và các Ban chuyên môn đối chiếu ma trận tài liệu căn cứ với bản thảo hợp đồng kinh tế trước khi trình Ban Tổng Giám đốc phê duyệt và ký phát hành.

---

## 🚀 CÁC TÍNH NĂNG VƯỢT TRỘI ĐÃ HOÀN THIỆN

### 1. Ma Trận Đối Chiếu 5 Phòng Ban Chuyên Môn BLUEMARQ
Hệ thống tự động phân loại, đánh giá và gom nhóm toàn bộ các điều khoản sai lệch theo đúng thẩm quyền và trách nhiệm của 5 Ban/Phòng ban trực thuộc:
* 🏛️ **Ban Pháp Chế (14 tiêu chí):** Tư cách chủ thể ký kết (ĐKKD 2 bên), thẩm quyền đại diện theo ủy quyền, chế tài phạt vi phạm (tối đa 8% theo Luật Thương mại), giải quyết tranh chấp tại Tòa án/Trọng tài, điều khoản bảo mật và chấm dứt hợp đồng.
* 💰 **Phòng Kế Toán (6 tiêu chí):** Bản chất tiền tạm ứng vs tiền cọc (bắt buộc xuất hóa đơn VAT theo luật thuế dịch vụ), điều kiện giải ngân từng đợt, hóa đơn chứng từ hợp lệ, tài khoản ngân hàng thụ hưởng.
* 📊 **Phòng Quản Lý Chi Phí & Khối Lượng (QS - 13 tiêu chí):** Đối chiếu bảng khối lượng BOQ/Dự toán Excel (.xlsx), đơn giá cố định/đơn giá điều chỉnh, tiến độ thi công chi tiết, bảo lãnh tạm ứng và bảo lãnh thực hiện hợp đồng.
* 📦 **Ban Chọn Thầu - Cung Ứng (13 tiêu chí):** Đúng biểu mẫu hợp đồng được phê duyệt, đối tượng gói thầu, chủng loại vật tư thiết bị, bảo hành nhà sản xuất và điều kiện thương mại Incoterms.
* 🏗️ **Ban Điều Hành Dự Án (Site PM):** Phù hợp mặt bằng hiện trường, an toàn lao động vệ sinh môi trường (HSE), mốc tiến độ bàn giao và tiêu chuẩn kỹ thuật nghiệm thu sản phẩm.

### 2. Xuất File Word (.docx) Tự Động Phân Quyền Theo Phòng Ban
* **Công nghệ:** Chuẩn Microsoft OpenXML ECMA-376 nguyên bản.
* **Tác giả chuẩn xác:** Hiển thị rõ họ tên và phòng ban người soát xét (VD: `Nguyễn Văn A (Ban Pháp Chế)`).
* **Hai hình thức tác động linh hoạt:**
  * **Track Changes (Sửa trực tiếp):** Gạch đỏ xóa chữ cũ (`<w:del>`) và chèn chữ xanh mới (`<w:ins>`) vào đúng vị trí văn bản.
  * **Comments (Bong bóng ý kiến bên lề):** Giữ nguyên 100% văn bản gốc, gắn bong bóng Comment giải trình căn cứ sai lệch so với Tờ trình/ĐKKD/BOQ để Người ký phê duyệt.
* **Tùy chọn xuất file:**
  * **Xuất Word theo phòng ban của mình:** Chỉ tải về các điểm sửa đổi và nhận xét thuộc thẩm quyền của phòng ban người đang soát xét.
  * **Xuất Word Tổng Hợp:** Tải về toàn bộ nhận xét của cả 5 phòng ban phục vụ họp giao ban rà soát chung.

### 3. Động Cơ AI Tự Động Thông Minh (Multi-AI Engine & Key Pool)
* **Chế độ mặc định:** `⚡ Tự động (Tự xoay nền tảng & Key)` — Người dùng không cần bận tâm về việc chọn mô hình hay cấu hình kỹ thuật phức tạp.
* **Tự động xoay nền tảng (Platform Fallback):**
  1. Ưu tiên 1: **Google Gemini** (tối ưu xử lý văn bản dài, đọc trực tiếp PDF scan và tài liệu ảnh).
  2. Ưu tiên 2: Tự động chuyển tiếp sang **OpenAI ChatGPT** nếu cụm máy chủ Google quá tải.
  3. Ưu tiên 3: Tự động chuyển tiếp sang **Anthropic Claude** nếu ChatGPT bận.
* **Cơ chế Key Pool chống nghẽn (Zero-Downtime):** Tự động nhận diện nhiều API Key (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`,...) và luân chuyển key tức thời khi gặp lỗi quá tải 503 hoặc hết hạn ngạch 429.

### 4. Giao Diện Pinned Header & Tùy Chỉnh Tiêu Đề Hồ Sơ
* **Khối Người soát xét & Phòng ban:** Luôn ghim cố định trên đỉnh Cột Trái, không bị cuộn che khuất khi người dùng nạp nhiều hồ sơ.
* **Tài liệu bổ trợ linh hoạt:** Cho phép sửa đổi tiêu đề trực tiếp (ví dụ: *Tờ trình điều chỉnh số 26*, *Phụ lục kỹ thuật*, *Biên bản thỏa thuận*...). AI tự động phân tích đúng tên văn bản và áp dụng nguyên tắc ưu tiên văn bản phát hành sau.
* **Phiếu Soát Xét BLUEMARQ:** Xuất biên bản báo cáo pháp lý dạng HTML/In ấn phục vụ kẹp vào hồ sơ trình ký Ban Tổng Giám đốc.

---

## 🌐 HƯỚNG DẪN CẤU HÌNH BIẾN MÔI TRƯỜNG TRÊN VERCEL

Hệ thống được tối ưu hóa để vận hành 24/7 trên nền tảng đám mây **Vercel**. Bạn cấu hình các biến môi trường tại mục:  
👉 **Project Settings ➔ Environment Variables**:

| Tên biến trên Vercel | Mục đích | Hỗ trợ xoay Key |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Key chính Google Gemini AI Studio | Có thể dán nhiều key cách nhau bởi dấu phẩy `,` |
| `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`... | Danh sách từng key Google Gemini | Hệ thống tự động gom toàn bộ thành Key Pool |
| `OPENAI_API_KEY` *(hoặc `_1`, `_2`)* | Key OpenAI ChatGPT dự phòng | Tự động kích hoạt khi Gemini quá tải |
| `CLAUDE_API_KEY` *(hoặc `_1`, `_2`)* | Key Anthropic Claude dự phòng | Tự động kích hoạt khi các nền tảng trước bận |

> [!IMPORTANT]
> **Lưu ý trên Vercel:**  
> Đảm bảo tích chọn đủ 3 môi trường: **Production**, **Preview**, **Development**. Sau khi lưu biến môi trường, chỉ cần đẩy commit mới hoặc bấm **Redeploy** tại tab *Deployments* là máy chủ Vercel sẽ tự động nạp key.

---

## 💻 HƯỚNG DẪN PHÁT TRIỂN NỘI BỘ (LOCAL DEV)

Nếu bạn muốn chạy thử nghiệm trực tiếp trên máy tính cá nhân:
1. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
2. Khởi chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt truy cập: `http://localhost:3000`

---

## 📂 CẤU TRÚC THƯ MỤC DỰ ÁN

* `api/key.ts`: Endpoint Serverless Function tự động quét, tổng hợp và cấp phát Key Pool an toàn cho Client.
* `api/review.ts`: Endpoint xử lý phân tích dự phòng trên máy chủ Vercel.
* `src/components/ContractReviewer.tsx`: Giao diện chính người dùng chuẩn thương hiệu BLUEMARQ (Cột hồ sơ Pinned, bộ lọc 5 phòng ban, thanh cuộn độc lập).
* `src/lib/docx-track-changes.ts`: Động cơ xử lý file Word chèn Track Changes và Comments theo chuẩn OpenXML ECMA-376.
* `src/lib/gemini-service.ts`: Bộ điều phối AI Đa nền tảng (Gemini / ChatGPT / Claude) với thuật toán tự động xoay Key và Fallback Model.
* `src/lib/gemini-prompts.ts`: Khung Prompt ma trận đối chiếu 5 phòng ban của Tập đoàn BLUEMARQ.
* `src/lib/report-generator.ts`: Động cơ xuất Phiếu Soát Xét Hợp Đồng chuẩn doanh nghiệp.
* `src/lib/file-extractor.ts`: Bộ trích xuất dữ liệu đa định dạng (Word, Excel BOQ, PDF, Ảnh scan).
* `vercel.json`: Cấu hình định tuyến và tối ưu tài nguyên Serverless trên Vercel Cloud.

---

© 2026 **BLUEMARQ GROUP** — Hệ Thống Pháp Chế Trí Tuệ Nhân Tạo Doanh Nghiệp.
