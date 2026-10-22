import { saveAs } from 'file-saver';
import { FindingToApply } from './docx-track-changes';

export interface AuditReportData {
  contractName: string;
  reviewerName: string;
  reviewDate: string;
  baseDocuments: { title: string; fileName: string; type: string }[];
  findings: FindingToApply[];
}

export function generateAuditReportHtml(data: AuditReportData): string {
  const { contractName, reviewerName, reviewDate, baseDocuments, findings } = data;

  const highRisks = findings.filter(f => f.severity === 'high');
  const mediumRisks = findings.filter(f => f.severity === 'medium');
  const lowRisks = findings.filter(f => f.severity === 'low');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên Bản Soát Xét Hợp Đồng - ${contractName}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; line-height: 1.6; color: #111; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company { font-weight: bold; font-size: 16px; text-transform: uppercase; color: #0B1A2D; }
    .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin-top: 15px; color: #9A7B38; }
    .meta { margin-bottom: 25px; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
    .section-title { font-weight: bold; font-size: 16px; margin-top: 25px; margin-bottom: 10px; color: #0B1A2D; border-left: 4px solid #C5A059; padding-left: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th, td { border: 1px solid #aaa; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background-color: #f2f5f9; font-weight: bold; color: #0B1A2D; }
    .badge-high { color: #d9534f; font-weight: bold; }
    .badge-medium { color: #f0ad4e; font-weight: bold; }
    .badge-low { color: #5bc0de; }
    .orig-text { text-decoration: line-through; color: #a94442; font-style: italic; }
    .sugg-text { color: #3c763d; font-weight: bold; }
    .footer { margin-top: 50px; display: flex; justify-content: space-between; }
    .signature-block { width: 45%; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">TẬP ĐOÀN BLUEMARQ GROUP — BAN PHÁP CHẾ & QUẢN TRỊ RỦI RO</div>
    <div class="title">BÁO CÁO KẾT QUẢ ĐỐI CHIẾU & SOÁT XÉT HỢP ĐỒNG</div>
    <div>(Phục vụ công tác thẩm duyệt trước khi ký phát hành)</div>
  </div>

  <div class="meta">
    <p><strong>Bản thảo Hợp đồng soát xét:</strong> ${contractName}</p>
    <p><strong>Cán bộ Pháp chế / Người rà soát:</strong> ${reviewerName || 'Ban Pháp Chế'}</p>
    <p><strong>Thời gian thực hiện:</strong> ${reviewDate}</p>
    <p><strong>Kết luận sơ bộ:</strong> Phát hiện tổng cộng <strong>${findings.length}</strong> điểm sai lệch/rủi ro (Trong đó: <span class="badge-high">${highRisks.length} Nghiêm trọng</span>, <span class="badge-medium">${mediumRisks.length} Cần lưu ý</span>, <span class="badge-low">${lowRisks.length} Lỗi nhỏ</span>).</p>
  </div>

  <div class="section-title">I. DANH MỤC HỒ SƠ & TÀI LIỆU CĂN CỨ ĐỐI CHIẾU</div>
  <ul>
    ${baseDocuments.map(d => `<li><strong>${d.title}:</strong> ${d.fileName} <em>(${d.type})</em></li>`).join('')}
  </ul>

  <div class="section-title">II. BẢNG CHI TIẾT CÁC SAI LỆCH VÀ ĐỀ XUẤT SỬA ĐỔI</div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 15%;">Vấn đề / Mức độ</th>
        <th style="width: 12%;">Hình thức</th>
        <th style="width: 25%;">Nguyên văn Bản thảo gốc</th>
        <th style="width: 25%;">Nội dung Sửa đổi / Đề xuất</th>
        <th style="width: 18%;">Căn cứ tài liệu</th>
      </tr>
    </thead>
    <tbody>
      ${findings.map((f, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td>
            <strong>${f.issue}</strong><br>
            <span class="${f.severity === 'high' ? 'badge-high' : f.severity === 'medium' ? 'badge-medium' : 'badge-low'}">
              [${f.severity === 'high' ? 'NGHIÊM TRỌNG' : f.severity === 'medium' ? 'CẦN LƯU Ý' : 'LỖI THỂ THỨC'}]
            </span>
          </td>
          <td>
            ${f.actionType === 'comment_only' 
              ? '<span style="color: #b45309; font-weight: bold; font-size: 12px;">💬 Chỉ Comment (Ý kiến tư vấn)</span>' 
              : '<span style="color: #15803d; font-weight: bold; font-size: 12px;">✍️ Track Change (Sửa trực tiếp)</span>'}
          </td>
          <td class="orig-text">${f.original}</td>
          <td class="sugg-text">${f.suggestion}</td>
          <td>${f.reason}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title">III. KIẾN NGHỊ VÀ ĐỀ XUẤT CỦA CÁN BỘ PHÁP CHẾ</div>
  <p>1. Yêu cầu Ban Soạn thảo tiếp thu và cập nhật đầy đủ các điểm đề xuất sửa đổi nêu trên vào bản thảo Hợp đồng cuối cùng.</p>
  <p>2. Chỉ trình Lãnh đạo ký duyệt sau khi các bên đã thống nhất khớp 100% các điều khoản Giá trị, Tạm ứng, Bảo lãnh và Thông tin đại diện theo Giấy ủy quyền.</p>

  <div class="footer">
    <div class="signature-block">
      <p><strong>BAN SOẠN THẢO HỢP ĐỒNG</strong></p>
      <br><br><br>
      <p><em>(Ký & ghi rõ họ tên)</em></p>
    </div>
    <div class="signature-block">
      <p><strong>NGƯỜI SOÁT XÉT PHÁP CHẾ</strong></p>
      <br><br><br>
      <p><strong>${reviewerName || 'Ban Pháp Chế'}</strong></p>
    </div>
  </div>
</body>
</html>`;
}

export function downloadAuditReport(data: AuditReportData, fileName: string = 'Bao_cao_Soat_xet_Hop_dong.html') {
  const html = generateAuditReportHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, fileName);
}
