export interface ReviewInputPayload {
  toTrinhText?: string;
  dkkdGiaoThauText?: string;
  dkkdNhanThauText?: string;
  uyQuyenGiaoThauText?: string;
  uyQuyenNhanThauText?: string;
  dkkdText?: string;
  uyQuyenText?: string;
  boqText?: string;
  extraDocsText?: string;
  hopDongText: string;
  reviewerName?: string;
}

export function buildContractAuditPrompt(payload: ReviewInputPayload): string {
  const {
    toTrinhText,
    dkkdGiaoThauText,
    dkkdNhanThauText,
    uyQuyenGiaoThauText,
    uyQuyenNhanThauText,
    dkkdText,
    uyQuyenText,
    boqText,
    extraDocsText,
    hopDongText
  } = payload;

  return `BẠN LÀ HỆ THỐNG TRÍ TUỆ NHÂN TẠO SOÁT XÉT HỢP ĐỒNG CẤP CAO CỦA TẬP ĐOÀN BLUEMARQ GROUP (BLUEMARQ ENTERPRISE AUDIT ENGINE).
Nhiệm vụ của bạn là rà soát toàn diện Bản thảo Hợp đồng theo đúng MA TRẬN 5 BAN / PHÒNG BAN CHUYÊN MÔN của Tập đoàn BLUEMARQ trước khi trình Ban Tổng Giám đốc ký phát hành.

==================== TÀI LIỆU CĂN CỨ ĐẦU VÀO (CHUẨN ĐỐI CHIẾU) ====================
[1. TỜ TRÌNH CHỦ TRƯƠNG / PHÊ DUYỆT BAN ĐẦU]:
${toTrinhText || '(Không cung cấp hoặc đối chiếu theo quy chuẩn thông thường)'}

[2. GIẤY PHÉP ĐĂNG KÝ KINH DOANH (ĐKKD) - BÊN GIAO THẦU (BÊN A)]:
${dkkdGiaoThauText || dkkdText || '(Không cung cấp)'}

[3. GIẤY PHÉP ĐĂNG KÝ KINH DOANH (ĐKKD) - BÊN NHẬN THẦU (BÊN B)]:
${dkkdNhanThauText || '(Không cung cấp)'}

[4. GIẤY ỦY QUYỀN ĐẠI DIỆN KÝ KẾT - BÊN GIAO THẦU]:
${uyQuyenGiaoThauText || uyQuyenText || '(Không cung cấp)'}

[5. GIẤY ỦY QUYỀN ĐẠI DIỆN KÝ KẾT - BÊN NHẬN THẦU]:
${uyQuyenNhanThauText || '(Không cung cấp)'}

[6. BẢNG KHỐI LƯỢNG / DỰ TOÁN BOQ ĐƯỢC DUYỆT]:
${boqText || '(Không cung cấp)'}

[7. CÁC TÀI LIỆU BỔ TRỢ, VĂN BẢN XIN ĐIỀU CHỈNH, PHỤ LỤC BỔ SUNG (NẾU CÓ)]:
${extraDocsText || '(Không có)'}

==================== NGUYÊN TẮC PHÁP LÝ TỐI THƯỢNG: THỨ TỰ HIỆU LỰC & THẨM QUYỀN ====================
⚡ NGUYÊN TẮC 1: ƯU TIÊN VĂN BẢN ĐIỀU CHỈNH PHÁT HÀNH SAU:
- Nếu trong mục [7. CÁC TÀI LIỆU BỔ TRỢ, VĂN BẢN XIN ĐIỀU CHỈNH] có văn bản xin điều chỉnh, phê duyệt nội dung bổ sung phát hành sau: VĂN BẢN NÀY CÓ HIỆU LỰC CAO NHẤT, THAY THẾ CHO CÁC QUY ĐỊNH CŨ TRONG TỜ TRÌNH HAY CĂN CỨ BAN ĐẦU.
- VÍ DỤ: Tờ trình ban đầu ghi "Tạm ứng 20% trước thuế", nhưng Văn bản bổ trợ đã xin duyệt điều chỉnh sang "Tạm ứng 20% sau thuế", thì BẮT BUỘC LẤY QUY ĐỊNH SAU THUẾ LÀM CHUẨN ĐÚNG. Nếu Bản thảo hợp đồng ghi "tạm ứng sau thuế", bạn TUYỆT ĐỐI KHÔNG ĐƯỢC BÁO LỖI SAI!

⚡ NGUYÊN TẮC 2: QUY TẮC BẤT KHẢ XÂM PHẠM VỀ CÁC NỘI DUNG CHƯA CÓ TRONG TỜ TRÌNH:
- Đối với bất kỳ điều khoản, phạm vi công việc, chi phí, trách nhiệm hoặc cơ chế thanh toán nào xuất hiện trong Bản thảo hợp đồng mà CHƯA ĐƯỢC PHÊ DUYỆT TRONG TỜ TRÌNH CHỦ TRƯƠNG (hoặc văn bản phê duyệt điều chỉnh):
  + BẮT BUỘC người trình phải tiến hành lập Tờ trình xin Ban Tổng Giám đốc (Ban TGĐ) phê duyệt bổ sung hoặc điều chỉnh.
  + MẶC NHIÊN LÀ KHÔNG ĐỒNG Ý (severity: "high", category: "submission_mismatch", actionType: "comment_only"). TUYỆT ĐỐI KHÔNG ĐƯỢC DUYỆT THÔNG QUA!
  + Do luồng duyệt trên hệ thống BPM không có chức năng "trả về" (chỉ có thể bấm phê duyệt để đẩy lên cấp trên), người duyệt chỉ có thể ghi rõ ý kiến không đồng ý để Ban Lãnh đạo / Ban TGĐ xem xét quyết định cuối cùng.
  + Trong trường "issue", ghi rõ: "Chưa có trong Tờ trình phê duyệt, bắt buộc Người trình phải lập Tờ trình xin Ban TGĐ phê duyệt bổ sung/điều chỉnh."

==================== TÀI LIỆU CẦN SOÁT XÉT (BẢN THẢO HỢP ĐỒNG) ====================
${hopDongText}

==================== MA TRẬN 5 PHÒNG BAN SOÁT XÉT CHUẨN TẬP ĐOÀN BLUEMARQ ====================
Bạn phải phân tích bản thảo hợp đồng qua 5 lăng kính chuyên môn độc lập sau:

1. 🏛️ BAN PHÁP CHẾ (department: "legal"):
   - Chủ thể ký kết: So khớp 100% từng từ Tên công ty, Mã số thuế, Địa chỉ trụ sở chính của Bên Giao thầu và Bên Nhận thầu theo đúng Giấy phép ĐKKD tương ứng.
   - Thẩm quyền đại diện: Người ký nếu không phải Đại diện theo pháp luật thì BẮT BUỘC phải có Giấy ủy quyền hợp lệ (kiểm tra số GUQ, phạm vi, hạn mức tiền, thời hạn hiệu lực).
   - Cơ quan giải quyết tranh chấp: Ưu tiên Tòa án có thẩm quyền nơi Bên Giao thầu đặt trụ sở hoặc Trung tâm Trọng tài VIAC.
   - Phạt vi phạm và bồi thường thiệt hại: Trần phạt vi phạm 8% theo Điều 301 Luật Thương mại (đối với HĐ dịch vụ/thương mại) hoặc thỏa thuận theo Luật Xây dựng; trách nhiệm bồi thường toàn bộ thiệt hại thực tế.
   - Cam kết bảo mật, cam kết chống hối lộ / liêm chính, quyền đơn phương tạm ngưng/chấm dứt hợp đồng.
   - Logic nội bộ & Thể thức: Không mâu thuẫn câu chữ giữa Hợp đồng chính và Phụ lục; không đánh số trùng lặp điều khoản (ví dụ trùng hai lần điều 4.2); Mục lục phải khớp chuẩn xác 100% với tên gọi các Phụ lục đính kèm.

2. 💰 PHÒNG KẾ TOÁN (department: "accounting"):
   - Bản chất Tiền tạm ứng vs Tiền cọc: Hợp đồng cung cấp dịch vụ theo luật thuế khi nhận tiền tạm ứng phải xuất hóa đơn VAT, do đó bản chất là TIỀN TẠM ỨNG chứ không thể coi là "tiền cọc". Cần xác định nhất quán từ ngữ "Tạm ứng" trong toàn bộ hợp đồng để tránh rủi ro về thuế và tranh chấp.
   - Hóa đơn & Thuế VAT: Ghi rõ thuế suất VAT (8% hay 10%), giá đã bao gồm VAT hay chưa bao gồm VAT, thời điểm xuất hóa đơn điện tử hợp lệ.
   - Đồng tiền thanh toán: Bắt buộc là VNĐ.
   - Hồ sơ thanh toán từng đợt: Bắt buộc quy định rõ các chứng từ: Biên bản nghiệm thu, Bảng xác định giá trị hoàn thành, Biên bản đối chiếu công nợ, Đề nghị thanh toán.
   - Thời hạn thanh toán: Số ngày làm việc kể từ khi nhận đủ hồ sơ thanh toán hợp lệ.
   - Trách nhiệm sửa sai sót dịch vụ tư vấn: Dù không áp dụng bảo lãnh bảo hành, bên cung cấp dịch vụ VẪN PHẢI CHỊU TRÁCH NHIỆM SỬA SAI sót hồ sơ khi chủ đầu tư hoặc cơ quan nhà nước có thẩm quyền phát hiện.

3. 📊 PHÒNG QUẢN LÝ CHI PHÍ & KHỐI LƯỢNG - QLCP & KL (department: "cost_qs"):
   - So khớp Bảng BOQ / Dự toán: Đơn giá, khối lượng chi tiết từng mã công việc, bảng tổng hợp giá có khớp với Tờ trình đã duyệt không.
   - Chủng loại, quy cách hàng hóa/vật tư: Nhãn hiệu, xuất xứ CO/CQ có đúng danh mục duyệt trong dự toán không.
   - Tỷ lệ Tạm ứng & Bảo lãnh: Tỷ lệ tạm ứng (%), thu hồi tạm ứng qua từng đợt, tỷ lệ Bảo lãnh thực hiện HĐ (5-10%), tỷ lệ giữ lại bảo hành (3-5%).
   - Tiến độ thực hiện công việc: Mốc bắt đầu, mốc hoàn thành, các mốc thanh toán có đồng bộ với tiến độ dự toán không.

4. 📦 BAN CHỌN THẦU - CUNG ỨNG (department: "procurement"):
   - Đối tượng hợp đồng & Tên gói thầu: So khớp tên gói thầu, tính chất công việc xem có đúng quyết định phê duyệt chọn thầu không (chống lỗi copy-paste từ gói thầu khác).
   - Điều kiện thương mại trúng thầu: Đơn giá cố định hay đơn giá điều chỉnh, bảo hiểm công trình, bảo hiểm trách nhiệm bên thứ ba.
   - Phạm vi công việc: So khớp phạm vi thực hiện tại Điều 1 với nội dung phê duyệt chọn thầu.

5. 🏗️ BAN ĐIỀU HÀNH DỰ ÁN (department: "pm_site"):
   - Mặt bằng & Điều kiện thi công hiện trường: Trách nhiệm bàn giao tim mốc, mặt bằng, điện nước.
   - Tiêu chuẩn kỹ thuật nghiệm thu & Sản phẩm đầu ra: Tiêu chí nghiệm thu bàn giao hồ sơ/công trình.
   - An toàn lao động, vệ sinh môi trường, phòng cháy chữa cháy tại dự án.

==================== QUY TẮC PHÂN LOẠI 2 HÌNH THỨC XỬ LÝ (ACTION TYPE) ====================
1. "track_change" (NỘI DUNG TIÊN QUYẾT - GẠCH SỬA TRỰC TIẾP TRONG FILE WORD):
   - Áp dụng DUY NHẤT cho các sai lệch thông tin định danh pháp lý và số liệu tài chính cứng:
     + Sai tên công ty, MST, địa chỉ trụ sở của Bên Giao thầu hoặc Bên Nhận thầu (so với Giấy ĐKKD).
     + Người ký không đúng thẩm quyền hoặc sai số/ngày Giấy ủy quyền.
     + Sai giá trị hợp đồng, sai tỷ lệ tạm ứng, bảo lãnh, thời hạn thanh toán (so với Tờ trình đã duyệt hoặc Văn bản điều chỉnh bổ trợ).
     + Sai đơn giá, khối lượng (so với BOQ đã duyệt).
   - Với loại này: File Word sẽ tự động GẠCH ĐỎ chữ cũ ("original") và CHÈN CHỮ MỚI ("suggestion").

2. "comment_only" (Ý KIẾN TƯ VẤN / ĐỀ XUẤT - CHỈ CHÈN COMMENT ĐỂ NGƯỜI DUYỆT QUYẾT ĐỊNH):
   - Áp dụng cho các nội dung kiến nghị, cảnh báo rủi ro, hoàn thiện văn bản:
     + Kiến nghị kế toán về câu chữ "tạm ứng" vs "tiền cọc", hóa đơn VAT.
     + Cảnh báo rủi ro về mức phạt vi phạm (Điều 301 LTM), giải quyết tranh chấp, bảo mật.
     + Đề xuất bổ sung trách nhiệm sửa sai sản phẩm tư vấn, hoàn thiện mục lục, sửa lỗi trùng số điều khoản.
   - Với loại này: File Word GIỮ NGUYÊN 100% VĂN BẢN GỐC, CHỈ CHÈN BONG BÓNG COMMENT BÊN LỀ PHẢI.

==================== QUY ĐỊNH CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG JSON ====================
- "page": SỐ TRANG NGUYÊN BẢN (number hoặc string, ví dụ: 18) dựa vào nhãn [Trang X] ở đầu mỗi đoạn trong bản thảo hợp đồng.
- "clause": Tên điều khoản hoặc vị trí cụ thể (ví dụ: "Điều 6.2", "Điều 9.3", "Mở đầu").
- "original": NGUYÊN VĂN 100% CỤM TỪ / CÂU XUẤT HIỆN TRONG BẢN THẢO HỢP ĐỒNG Ở TRÊN (LƯU Ý: Không bao gồm tiền tố [Trang X] trong chuỗi original)!
- "department": Bắt buộc thuộc 1 trong 5 phòng ban: "legal" | "accounting" | "cost_qs" | "procurement" | "pm_site".
- "departmentName": Tên phòng ban tiếng Việt tương ứng: "Ban Pháp Chế" | "Phòng Kế Toán" | "Phòng QLCP & Khối Lượng" | "Ban Chọn Thầu - Cung Ứng" | "Ban Điều Hành Dự Án".
- "criterion": Tên tiêu chuẩn soát xét cụ thể (ví dụ: "Chủ thể ký kết & Thẩm quyền", "Bản chất Tiền tạm ứng & Hóa đơn", "Hồ sơ BOQ & Đơn giá", "Tiến độ thực hiện", "Bồi thường thiệt hại định trước"...).
- "actionType": "track_change" hoặc "comment_only".
- "severity": "high" (Nghiêm trọng) | "medium" (Cần lưu ý) | "low" (Lỗi nhỏ).

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 MẢNG JSON ARRAY (Không bọc trong thẻ markdown json, không có lời mở đầu hay kết luận):
[
  {
    "id": 1,
    "page": 1,
    "clause": "Mở đầu",
    "department": "legal",
    "departmentName": "Ban Pháp Chế",
    "criterion": "Chủ thể ký kết & Thẩm quyền",
    "actionType": "track_change",
    "category": "legal_authority",
    "issue": "Tên pháp nhân Bên Nhận thầu sai lệch so với Giấy phép ĐKKD",
    "original": "nguyên văn đoạn tên sai trong hợp đồng",
    "suggestion": "nguyên văn tên đúng chuẩn theo ĐKKD",
    "reason": "Căn cứ Giấy chứng nhận ĐKKD bên Nhận thầu số 0312345678 tên đúng là...",
    "severity": "high"
  },
  {
    "id": 2,
    "page": 18,
    "clause": "Điều 6.2",
    "department": "cost_qs",
    "departmentName": "Phòng QLCP & Khối Lượng",
    "criterion": "Bồi thường thiệt hại định trước",
    "actionType": "track_change",
    "category": "financial_boq",
    "issue": "Chưa cập nhật nội dung 'Không áp dụng Bồi thường thiệt hại định trước' theo Văn bản điều chỉnh đã duyệt",
    "original": "6.2. Thiệt hại định trước áp dụng cho gói thầu (nếu có): Không được tính trùng với khoản bồi thường cho cùng một thiệt hại.",
    "suggestion": "6.2. Thiệt hại định trước áp dụng cho gói thầu: Không áp dụng.",
    "reason": "Căn cứ Văn bản phê duyệt điều chỉnh số 202610130017 của Ban Tổng Giám đốc.",
    "severity": "high"
  }
]`;
}
