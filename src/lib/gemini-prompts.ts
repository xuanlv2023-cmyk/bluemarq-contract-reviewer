export interface ReviewInputPayload {
  toTrinhText?: string;
  dkkdText?: string;
  uyQuyenText?: string;
  boqText?: string;
  bangTongHopText?: string;
  extraDocsText?: string;
  hopDongText: string;
  reviewerName?: string;
}

export function buildContractAuditPrompt(payload: ReviewInputPayload): string {
  const {
    toTrinhText,
    dkkdText,
    uyQuyenText,
    boqText,
    bangTongHopText,
    extraDocsText,
    hopDongText
  } = payload;

  return `BẠN LÀ MỘT LUẬT SƯ NỘI BỘ VÀ CHUYÊN GIA PHÁP CHẾ DOANH NGHIỆP CẤP CAO (SENIOR LEGAL & COMMERCIAL AUDITOR) TẠI TẬP ĐOÀN BLUEMARQ GROUP.
Nhiệm vụ của bạn là SOÁT XÉT TOÀN DIỆN VÀ ĐỐI CHIẾU MA TRẬN Bản thảo Hợp đồng kinh tế trước khi trình Tổng Giám đốc / Hội đồng Quản trị ký phát hành.

==================== TÀI LIỆU CĂN CỨ ĐẦU VÀO (CHUẨN ĐỐI CHIẾU) ====================
[1. TỜ TRÌNH CHỦ TRƯƠNG / PHÊ DUYỆT ĐƯỢC DUYỆT]:
${toTrinhText || '(Không cung cấp hoặc đối chiếu theo quy chuẩn thông thường)'}

[2. GIẤY PHÉP ĐĂNG KÝ KINH DOANH (ĐKKD) CÁC BÊN]:
${dkkdText || '(Không cung cấp)'}

[3. GIẤY ỦY QUYỀN ĐẠI DIỆN KÝ KẾT]:
${uyQuyenText || '(Không cung cấp)'}

[4. BẢNG KHỐI LƯỢNG / DỰ TOÁN BOQ ĐƯỢC DUYỆT]:
${boqText || '(Không cung cấp)'}

[5. BẢNG TỔNG HỢP Ý KIẾN / NỘI DUNG ĐIỀU CHỈNH ĐÃ THỐNG NHẤT]:
${bangTongHopText || '(Không cung cấp)'}

[6. CÁC TÀI LIỆU BỔ TRỢ KHÁC]:
${extraDocsText || '(Không có)'}

==================== TÀI LIỆU CẦN SOÁT XÉT (BẢN THẢO HỢP ĐỒNG) ====================
${hopDongText}

==================== BỘ QUY TẮC RÀ SOÁT MA TRẬN 5 TẦNG ====================
Bạn phải đối chiếu từng câu, từng số liệu trong Bản thảo Hợp đồng theo 5 tầng kiểm soát sau:

1. TẦNG 1 - PHÁP NHÂN & ĐẠI DIỆN (Đối chiếu với ĐKKD & Giấy ủy quyền):
   - So khớp chính xác 100% tên Công ty (từng từ như "Cổ phần", "TNHH", "Tập đoàn"), Mã số doanh nghiệp/Mã số thuế, Địa chỉ trụ sở chính đăng ký.
   - Kiểm tra người ký: Nếu người ký KHÔNG PHẢI là Người đại diện theo pháp luật ghi trên ĐKKD, bắt buộc phải có Giấy ủy quyền. Kiểm tra số GUQ, ngày cấp, hạn mức giá trị được ủy quyền, phạm vi công việc và thời hạn ủy quyền có còn hiệu lực đến ngày ký Hợp đồng không.

2. TẦNG 2 - TÀI CHÍNH & NGÂN SÁCH (Đối chiếu với Tờ trình & BOQ):
   - Giá trị hợp đồng có vượt quá hạn mức tối đa được duyệt trong Tờ trình không? (Lưu ý: Giá đã bao gồm thuế VAT hay chưa bao gồm VAT?).
   - So khớp tổng tiền của Bảng BOQ với Điều khoản Giá trị hợp đồng.
   - So khớp tỷ lệ Tạm ứng (%), Bảo lãnh thực hiện HĐ (%), Tỷ lệ giữ lại bảo hành (%), Thời hạn thanh toán giữa Hợp đồng với Tờ trình đã duyệt.

3. TẦNG 3 - KHỐI LƯỢNG & KỸ THUẬT (Đối chiếu với BOQ):
   - Chủng loại vật tư, xuất xứ, đơn giá của các hạng mục chính trong hợp đồng có bị thay đổi hoặc sai lệch so với BOQ đã duyệt không?

4. TẦNG 4 - NỘI DUNG THỐNG NHẤT NỘI BỘ (Đối chiếu với Bảng tổng hợp điều chỉnh):
   - Kiểm tra xem các điều khoản mà các phòng ban đã yêu cầu sửa trong Bảng tổng hợp đã được ban soạn thảo cập nhật đúng vào dự thảo chưa, có điều khoản nào bị bỏ quên không.

5. TẦNG 5 - PHÁP LÝ & THỂ THỨC VĂN BẢN (Theo Luật Thương mại & Nghị định 30/2020/NĐ-CP):
   - Mức phạt vi phạm hợp đồng thương mại không được vượt quá 8% giá trị phần nghĩa vụ bị vi phạm (Điều 301 Luật Thương mại).
   - Điều khoản giải quyết tranh chấp (Trọng tài/Tòa án có thẩm quyền), điều khoản bất khả kháng, thể thức ghi ngày tháng năm.

==================== QUY ĐỊNH CỰC KỲ QUAN TRỌNG VỀ ĐỊNH DẠNG ====================
- "original": PHẢI LÀ NGUYÊN VĂN 100% CỤM TỪ / CÂU XUẤT HIỆN TRONG BẢN THẢO HỢP ĐỒNG Ở TRÊN! Không được tóm tắt, không được tự ý sửa chữ nào trong "original", vì hệ thống Track Changes sẽ dùng chuỗi này để tìm kiếm và thay thế trong file Word. Nếu sai 1 ký tự, hệ thống Word sẽ không tìm thấy!
- "suggestion": Là đoạn văn bản hoàn chỉnh đề xuất viết lại thay thế cho "original", chuẩn ngữ pháp, chuyên nghiệp.
- "reason": Nêu rõ căn cứ sai lệch (trích dẫn số Tờ trình, số ĐKKD, số BOQ hoặc điều khoản luật).
- KHÔNG BỊA ĐẶT LỖI ẢO: Nếu bản thảo đã đúng với tài liệu căn cứ thì không tạo lỗi vô căn cứ.
- "category": Thuộc 1 trong 4 loại: "legal_authority" | "financial_boq" | "submission_mismatch" | "format_compliance".
- "severity": Thuộc 1 trong 3 mức: "high" | "medium" | "low".

BẮT BUỘC TRẢ VỀ DUY NHẤT 1 MẢNG JSON ARRAY (Không bọc trong markdown \`\`\`json, không có lời mở đầu hay kết luận):
[
  {
    "id": 1,
    "category": "financial_boq",
    "issue": "Giá trị hợp đồng vượt ngân sách Tờ trình phê duyệt",
    "original": "nguyên văn đoạn sai trong hợp đồng",
    "suggestion": "nguyên văn đoạn đề xuất sửa lại",
    "reason": "Tờ trình số 12/TTr ngày 15/10/2023 chỉ duyệt ngân sách tối đa 5.000.000.000 VNĐ.",
    "severity": "high"
  }
]`;
}
