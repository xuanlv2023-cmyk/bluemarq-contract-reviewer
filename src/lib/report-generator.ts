import { saveAs } from 'file-saver';
import { FindingToApply } from './docx-track-changes';

export interface AuditReportData {
  contractName: string;
  reviewerName: string;
  reviewDate: string;
  baseDocuments: { title: string; fileName: string; type: string }[];
  findings: FindingToApply[];
  approvalNote?: string;
}

export function generateAuditReportHtml(data: AuditReportData): string {
  const { contractName, reviewerName, reviewDate, baseDocuments, findings, approvalNote } = data;

  const highRisks = findings.filter(f => f.severity === 'high');
  const mediumRisks = findings.filter(f => f.severity === 'medium');
  const lowRisks = findings.filter(f => f.severity === 'low');
  const trackCount = findings.filter(f => f.actionType !== 'comment_only').length;
  const commentCount = findings.filter(f => f.actionType === 'comment_only').length;

  // Thống kê theo 5 phòng ban
  const legalFindings = findings.filter(f => (f.department || 'legal') === 'legal');
  const accountingFindings = findings.filter(f => f.department === 'accounting');
  const costFindings = findings.filter(f => f.department === 'cost_qs');
  const procurementFindings = findings.filter(f => f.department === 'procurement');
  const pmFindings = findings.filter(f => f.department === 'pm_site');

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const docCode = `TTR-${year.toString().slice(2)}${month}${day}${String(Math.floor(1000 + Math.random() * 9000))}`;
  const docNumber = `${Math.floor(100000 + Math.random() * 900000)}/${year}`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phiếu Soát Xét Hợp Đồng / Văn Bản - BLUEMARQ GROUP - ${contractName}</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 15mm 18mm 15mm; }
    body { font-family: 'Times New Roman', Times, serif; line-height: 1.45; color: #111; margin: 0; padding: 25px; background: #fff; font-size: 13.5px; }
    .top-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 2px solid #0B1A2D; padding-bottom: 12px; }
    .top-left { width: 45%; }
    .company-name { font-weight: bold; font-size: 15px; color: #0B1A2D; text-transform: uppercase; letter-spacing: 0.5px; }
    .company-sub { font-size: 11.5px; color: #C5A059; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    .doc-meta { font-size: 12px; color: #333; margin-top: 3px; }
    .top-right { width: 52%; text-align: center; }
    .national-title { font-weight: bold; font-size: 13.5px; text-transform: uppercase; }
    .national-motto { font-weight: bold; font-size: 12.5px; font-style: italic; margin-top: 2px; }
    .date-line { font-size: 12px; font-style: italic; margin-top: 5px; color: #444; }
    
    .title-banner { text-align: center; margin: 18px 0 15px 0; }
    .main-title { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #0B1A2D; margin-bottom: 4px; }
    .sub-title { font-size: 12.5px; font-style: italic; color: #555; }

    .summary-box { border: 1px solid #0B1A2D; margin-bottom: 18px; background: #fbfbfb; }
    .summary-row { display: flex; border-bottom: 1px solid #ddd; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { width: 22%; font-weight: bold; padding: 7px 10px; background: #f0f4f8; border-right: 1px solid #ddd; color: #0B1A2D; font-size: 13px; }
    .summary-value { width: 78%; padding: 7px 10px; font-size: 13px; }

    .section-header { font-weight: bold; font-size: 14px; text-transform: uppercase; color: #0B1A2D; margin-top: 20px; margin-bottom: 8px; border-left: 4px solid #C5A059; padding-left: 8px; display: flex; justify-content: space-between; align-items: center; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 14px; font-size: 12.5px; }
    th, td { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    th { background-color: #0E1F35; color: #fff; font-weight: bold; text-align: center; font-size: 12.5px; }
    
    .status-badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
    .status-ok { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .status-adjust { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    
    .tag-track { display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-weight: bold; font-size: 10.5px; background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
    .tag-comment { display: inline-block; padding: 1.5px 5px; border-radius: 3px; font-weight: bold; font-size: 10.5px; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
    
    .orig-text { text-decoration: line-through; color: #b91c1c; font-style: italic; background: #fff1f2; padding: 3px; border-radius: 2px; }
    .sugg-text { color: #15803d; font-weight: bold; background: #f0fdf4; padding: 3px; border-radius: 2px; }
    
    .badge-high { color: #dc2626; font-weight: bold; }
    .badge-medium { color: #d97706; font-weight: bold; }
    .badge-low { color: #2563eb; }

    .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 30px; page-break-inside: avoid; }
    .sig-card { border: 1px solid #ccc; padding: 10px; text-align: center; background: #fafafa; border-radius: 4px; }
    .sig-role { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #0B1A2D; margin-bottom: 4px; }
    .sig-dept { font-size: 11px; color: #666; font-style: italic; margin-bottom: 40px; }
    .sig-name { font-weight: bold; font-size: 12.5px; color: #111; }

    .final-approval { margin-top: 25px; border: 2px solid #C5A059; padding: 12px; text-align: center; background: #fffcf2; border-radius: 6px; page-break-inside: avoid; }
    .final-title { font-weight: bold; font-size: 13.5px; text-transform: uppercase; color: #0B1A2D; margin-bottom: 40px; }
    
    @media print {
      body { margin: 0; padding: 0; font-size: 12px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- NÚT IN TIỆN LỢI TRÊN TRÌNH DUYỆT -->
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #C5A059; color: #0B1A2D; border: none; padding: 8px 18px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
      🖨️ In Phiếu Soát Xét / Lưu PDF
    </button>
  </div>

  <!-- PHẦN HEADER CHUẨN BLUEMARQ GROUP -->
  <div class="top-header">
    <div class="top-left">
      <div class="company-name">BLUEMARQ GROUP</div>
      <div class="company-sub">Hệ Thống Kiểm Soát Hợp Đồng Tập Đoàn</div>
      <div class="doc-meta"><strong>Số:</strong> ${docNumber}</div>
      <div class="doc-meta"><strong>Mã phiếu:</strong> ${docCode}</div>
    </div>
    <div class="top-right">
      <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="national-motto">Độc lập – Tự do – Hạnh phúc</div>
      <div class="date-line">Hồ Chí Minh, ngày ${day} tháng ${month} năm ${year}</div>
    </div>
  </div>

  <!-- TIÊU ĐỀ CHÍNH -->
  <div class="title-banner">
    <div class="main-title">PHIẾU SOÁT XÉT HỢP ĐỒNG / VĂN BẢN</div>
    <div class="sub-title">(Biên bản đối chiếu ma trận đa phòng ban trước khi ký phát hành)</div>
  </div>

  <!-- KHỐI THÔNG TIN DỰ ÁN & HỒ SƠ TRÌNH KÝ -->
  <div class="summary-box">
    <div class="summary-row">
      <div class="summary-label">Bản thảo Hợp đồng</div>
      <div class="summary-value"><strong>${contractName}</strong></div>
    </div>
    <div class="summary-row">
      <div class="summary-label">Nội dung trình duyệt</div>
      <div class="summary-value">Rà soát ma trận điều khoản, đối chiếu tính tương thích giữa Tờ trình phê duyệt, ĐKKD 2 bên, Giấy ủy quyền, BOQ dự toán và các văn bản điều chỉnh.</div>
    </div>
    <div class="summary-row">
      <div class="summary-label">Người thực hiện rà soát</div>
      <div class="summary-value"><strong>${reviewerName || 'Ban Pháp Chế'}</strong> — Thời điểm: ${reviewDate}</div>
    </div>
    <div class="summary-row">
      <div class="summary-label">Kết luận sơ bộ</div>
      <div class="summary-value">
        Tổng số phát hiện: <strong>${findings.length}</strong> điểm 
        (Gồm: <span class="badge-high">${highRisks.length} Nghiêm trọng</span>, <span class="badge-medium">${mediumRisks.length} Cần lưu ý</span>, <span class="badge-low">${lowRisks.length} Lỗi nhỏ</span>) 
        — Phân loại: <strong>${trackCount} điểm gạch sửa trực tiếp (Track Changes)</strong> và <strong>${commentCount} ý kiến đề xuất (Comments)</strong>.
      </div>
    </div>
  </div>

  <!-- I. DANH MỤC HỒ SƠ CĂN CỨ ĐẦU VÀO -->
  <div class="section-header">
    <span>I. HỒ SƠ & TÀI LIỆU CĂN CỨ ĐỐI CHIẾU</span>
    <span style="font-size: 11px; font-weight: normal; text-transform: none; color: #555;">(Hồ sơ chuẩn đầu vào)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 35%;">Danh mục Hồ sơ Căn cứ</th>
        <th style="width: 45%;">Tên tệp tin đã nạp</th>
        <th style="width: 15%;">Định dạng</th>
      </tr>
    </thead>
    <tbody>
      ${baseDocuments.map((d, i) => `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${d.title}</strong></td>
          <td>${d.fileName}</td>
          <td style="text-align: center; text-transform: uppercase;">${d.type}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- II. MA TRẬN ĐÁNH GIÁ 5 PHÒNG BAN CHUYÊN MÔN BLUEMARQ -->
  <div class="section-header">
    <span>II. ĐÁNH GIÁ TÍNH PHÙ HỢP CỦA CÁC BAN / PHÒNG BAN</span>
    <span style="font-size: 11px; font-weight: normal; text-transform: none; color: #555;">(Theo quy trình kiểm soát BLUEMARQ)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 30%;">Phòng Ban Soát Xét</th>
        <th style="width: 25%;">Trọng tâm kiểm soát</th>
        <th style="width: 18%;">Đánh giá tính phù hợp</th>
        <th style="width: 22%;">Ý kiến kết luận</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td><strong>Ban Chọn thầu - Cung ứng</strong></td>
        <td>13 tiêu chí: Mẫu HĐ, đối tượng, chủng loại vật tư, điều kiện thương mại</td>
        <td style="text-align: center;">
          <span class="status-badge ${procurementFindings.length === 0 ? 'status-ok' : 'status-adjust'}">
            ${procurementFindings.length === 0 ? 'Phù hợp' : 'Cần điều chỉnh (' + procurementFindings.length + ')'}
          </span>
        </td>
        <td>${procurementFindings.length === 0 ? 'Đồng ý nội dung HĐ/VB' : 'Hoàn thiện theo file đính kèm'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">2</td>
        <td><strong>Phòng Quản lý Chi phí & Khối lượng</strong></td>
        <td>13 tiêu chí: BOQ dự toán, đơn giá, tiến độ thi công, bảo lãnh tạm ứng</td>
        <td style="text-align: center;">
          <span class="status-badge ${costFindings.length === 0 ? 'status-ok' : 'status-adjust'}">
            ${costFindings.length === 0 ? 'Phù hợp' : 'Cần điều chỉnh (' + costFindings.length + ')'}
          </span>
        </td>
        <td>${costFindings.length === 0 ? 'Đồng ý nội dung HĐ/VB' : 'Vui lòng làm rõ các ý kiến tại file đính kèm'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">3</td>
        <td><strong>Ban Điều hành Dự án</strong></td>
        <td>Kỹ thuật, hiện trường, an toàn lao động, sản phẩm bàn giao</td>
        <td style="text-align: center;">
          <span class="status-badge ${pmFindings.length === 0 ? 'status-ok' : 'status-adjust'}">
            ${pmFindings.length === 0 ? 'Phù hợp' : 'Cần điều chỉnh (' + pmFindings.length + ')'}
          </span>
        </td>
        <td>${pmFindings.length === 0 ? 'Đồng ý. Phù hợp yêu cầu mời thầu' : 'Chỉnh sửa theo ý kiến dự án'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">4</td>
        <td><strong>Phòng Kế toán</strong></td>
        <td>6 tiêu chí: Bản chất tạm ứng/tiền cọc, hóa đơn VAT, đồng tiền, tiến độ thanh toán</td>
        <td style="text-align: center;">
          <span class="status-badge ${accountingFindings.length === 0 ? 'status-ok' : 'status-adjust'}">
            ${accountingFindings.length === 0 ? 'Phù hợp' : 'Cần điều chỉnh (' + accountingFindings.length + ')'}
          </span>
        </td>
        <td>${accountingFindings.length === 0 ? 'Đồng ý nội dung HĐ/VB' : 'Chỉ đồng ý sau khi các vấn đề thuế/tạm ứng được xử lý'}</td>
      </tr>
      <tr>
        <td style="text-align: center;">5</td>
        <td><strong>Phòng Pháp chế</strong></td>
        <td>14 tiêu chí: ĐKKD 2 bên, ủy quyền, thẩm quyền, phạt 8%, tranh chấp, bảo mật</td>
        <td style="text-align: center;">
          <span class="status-badge ${legalFindings.length === 0 ? 'status-ok' : 'status-adjust'}">
            ${legalFindings.length === 0 ? 'Phù hợp' : 'Cần điều chỉnh (' + legalFindings.length + ')'}
          </span>
        </td>
        <td>${legalFindings.length === 0 ? 'Đồng ý nội dung HĐ/VB' : 'Đề nghị kiểm tra hoàn thiện các ý kiến tại HĐ đính kèm'}</td>
      </tr>
    </tbody>
  </table>

  <!-- III. BẢNG CHI TIẾT CÁC ĐIỂM KIẾN NGHỊ ĐIỀU CHỈNH -->
  <div class="section-header">
    <span>III. BẢNG CHI TIẾT CÁC NỘI DUNG YÊU CẦU ĐIỀU CHỈNH & TRACK CHANGES</span>
    <span style="font-size: 11px; font-weight: normal; text-transform: none; color: #555;">(Chi tiết từng điều khoản)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width: 4%;">STT</th>
        <th style="width: 14%;">Bộ phận & Tiêu chí</th>
        <th style="width: 10%;">Hình thức</th>
        <th style="width: 26%;">Đoạn trong Bản thảo gốc</th>
        <th style="width: 26%;">Nội dung Sửa đổi / Đề xuất</th>
        <th style="width: 20%;">Căn cứ tài liệu & Lý do</th>
      </tr>
    </thead>
    <tbody>
      ${findings.map((f, i) => {
        const isComment = f.actionType === 'comment_only';
        const deptLabel = f.departmentName || 'Ban Pháp Chế';
        const critLabel = f.criterion || 'Kiểm tra ma trận';

        return `
        <tr>
          <td style="text-align: center; font-weight: bold;">${i + 1}</td>
          <td>
            <div style="font-weight: bold; color: #0B1A2D; font-size: 12px;">${deptLabel}</div>
            <div style="font-size: 11px; color: #555; margin-top: 2px;">Tiêu chí: <em>${critLabel}</em></div>
            ${f.page ? `<div style="font-size: 11px; color: #b45309; font-weight: bold; margin-top: 3px;">📍 Trang ${f.page} ${f.clause ? `(${f.clause})` : ''}</div>` : ''}
            <div style="margin-top: 4px;">
              <span class="${f.severity === 'high' ? 'badge-high' : f.severity === 'medium' ? 'badge-medium' : 'badge-low'}">
                [${f.severity === 'high' ? 'NGHIÊM TRỌNG' : f.severity === 'medium' ? 'CẦN LƯU Ý' : 'LỖI NHỎ'}]
              </span>
            </div>
          </td>
          <td style="text-align: center;">
            <span class="${isComment ? 'tag-comment' : 'tag-track'}">
              ${isComment ? '💬 Chỉ Comment' : '✍️ Track Change'}
            </span>
          </td>
          <td>
            <div class="orig-text">${f.original}</div>
          </td>
          <td>
            <div class="sugg-text">${f.suggestion}</div>
          </td>
          <td style="font-size: 11.5px; color: #333;">
            <strong>${f.issue}:</strong><br>
            ${f.reason}
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- IV. Ý KIẾN PHÊ DUYỆT & KẾT LUẬN CỦA NGƯỜI SOÁT XÉT -->
  <div class="section-header">
    <span>IV. Ý KIẾN PHÊ DUYỆT & KẾT LUẬN CỦA NGƯỜI SOÁT XÉT</span>
  </div>
  <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; font-size: 13px; line-height: 1.6; color: #1e293b; margin-bottom: 22px; white-space: pre-wrap; font-family: 'Times New Roman', serif;">${approvalNote || '- Vui lòng kiểm tra và điều chỉnh theo ý kiến của BP.QLHĐ tại file đính kèm và các phòng ban khác trước khi phát hành.\n- Đồng ý.'}</div>

  <!-- V. KHU VỰC KÝ DUYỆT 5 PHÒNG BAN CHUYÊN MÔN -->
  <div class="section-header">
    <span>V. XÁC NHẬN CỦA CÁC BỘ PHẬN SOÁT XÉT</span>
  </div>
  
  <div class="signatures-grid">
    <div class="sig-card">
      <div class="sig-role">Ban Chọn Thầu - Cung Ứng</div>
      <div class="sig-dept">Người soát xét</div>
      <div class="sig-name">(Ký & ghi rõ họ tên)</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Phòng QL Chi Phí & Khối Lượng</div>
      <div class="sig-dept">Chuyên viên QLHĐ / QS</div>
      <div class="sig-name">(Ký & ghi rõ họ tên)</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Ban Điều Hành Dự Án</div>
      <div class="sig-dept">Giám đốc Điều hành Dự án</div>
      <div class="sig-name">(Ký & ghi rõ họ tên)</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Phòng Kế Toán</div>
      <div class="sig-dept">Kế toán trưởng / Kế toán viên</div>
      <div class="sig-name">(Ký & ghi rõ họ tên)</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Phòng Pháp Chế</div>
      <div class="sig-dept">Giám sát Pháp chế / Luật sư nội bộ</div>
      <div class="sig-name">${reviewerName || 'Ban Pháp Chế'}</div>
    </div>
    <div class="sig-card">
      <div class="sig-role">Ban Soạn Thảo Hợp Đồng</div>
      <div class="sig-dept">Cán bộ phụ trách gói thầu</div>
      <div class="sig-name">(Ký & ghi rõ họ tên)</div>
    </div>
  </div>

  <!-- V. PHÊ DUYỆT CỦA BAN TỔNG GIÁM ĐỐC -->
  <div class="final-approval">
    <div class="final-title">PHÊ DUYỆT CỦA PHÓ TỔNG GIÁM ĐỐC / TỔNG GIÁM ĐỐC TẬP ĐOÀN BLUEMARQ</div>
    <div style="font-weight: bold; font-size: 13px; color: #111;">
      (Ký duyệt phát hành Hợp đồng chính thức)
    </div>
  </div>

</body>
</html>`;
}

export function downloadAuditReport(data: AuditReportData, fileName: string = 'Phieu_Soat_Xet_Hop_Dong_BLUEMARQ.html') {
  const html = generateAuditReportHtml(data);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, fileName);
}
