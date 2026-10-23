import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface FindingToApply {
  id: number;
  issue: string;
  original: string;
  suggestion: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
  category?: 'legal_authority' | 'financial_boq' | 'submission_mismatch' | 'format_compliance';
  department?: 'legal' | 'accounting' | 'cost_qs' | 'procurement' | 'pm_site';
  departmentName?: string;
  criterion?: string;
  actionType?: 'track_change' | 'comment_only';
  accepted?: boolean;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return parts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 3);
}

export const DEPT_TITLE_MAP: Record<string, string> = {
  legal: 'Ban Pháp Chế',
  accounting: 'Phòng Kế Toán',
  cost_qs: 'Phòng QLCP & Khối Lượng',
  procurement: 'Ban Chọn Thầu - Cung Ứng',
  pm_site: 'Ban Điều Hành Dự Án',
};

/**
 * Áp dụng Track Changes và Comments vào file Word (.docx) theo chuẩn OpenXML ECMA-376
 * - Hỗ trợ lọc theo phòng ban người dùng lựa chọn hoặc xuất toàn bộ
 * - Cơ chế định vị chuẩn xác: triệt tiêu hoàn toàn lỗi track lung tung và trùng lặp
 */
export async function applyTrackChangesToDocx(
  originalDocxFile: File,
  findings: FindingToApply[],
  reviewerName: string = 'Ban Pháp Chế',
  reviewerDepartment?: string,
  scope: 'my_department' | 'all' = 'my_department'
): Promise<{ successCount: number; blob: Blob }> {
  const deptTitle = DEPT_TITLE_MAP[reviewerDepartment || ''] || '';
  const author = reviewerName.trim() + (deptTitle ? ` (${deptTitle})` : '');
  const initials = getInitials(reviewerName);
  const dateStr = new Date().toISOString();

  // 1. Lọc findings theo phạm vi xuất (theo phòng ban hoặc toàn bộ)
  let targetFindings = findings.filter(f => f.accepted !== false && f.original && f.original.trim());

  if (scope === 'my_department' && reviewerDepartment) {
    targetFindings = targetFindings.filter(f => (f.department || 'legal') === reviewerDepartment);
  }

  if (targetFindings.length === 0) {
    throw new Error(
      scope === 'my_department'
        ? `Không có nội dung rà soát nào thuộc [${deptTitle || 'Phòng ban đã chọn'}] được chọn để xuất file.`
        : 'Không có nội dung nào được chọn để áp dụng vào văn bản Word.'
    );
  }

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(originalDocxFile);

  // 2. Đọc word/document.xml
  let documentXml = await loadedZip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('File không hợp lệ: Không tìm thấy word/document.xml bên trong file DOCX');
  }

  // 3. Chuẩn bị word/comments.xml
  let commentsXml = await loadedZip.file('word/comments.xml')?.async('string');
  let commentEntries: string[] = [];
  let maxCommentId = 1;

  if (commentsXml) {
    const idMatches = commentsXml.match(/w:id="(\d+)"/g);
    if (idMatches) {
      idMatches.forEach(m => {
        const num = parseInt(m.replace(/\D/g, ''), 10);
        if (num > maxCommentId) maxCommentId = num;
      });
    }
  } else {
    commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
</w:comments>`;
  }

  // 4. Đảm bảo [Content_Types].xml có đăng ký comments
  let contentTypesXml = await loadedZip.file('[Content_Types].xml')?.async('string');
  if (contentTypesXml && !contentTypesXml.includes('wordprocessingml.comments+xml')) {
    const overrideEntry = `<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>`;
    contentTypesXml = contentTypesXml.replace('</Types>', `${overrideEntry}</Types>`);
    loadedZip.file('[Content_Types].xml', contentTypesXml);
  }

  // 5. Đảm bảo word/_rels/document.xml.rels có liên kết đến comments.xml
  let relsXml = await loadedZip.file('word/_rels/document.xml.rels')?.async('string');
  if (relsXml && !relsXml.includes('relationships/comments')) {
    let nextRelId = 99;
    const rIdMatches = relsXml.match(/Id="rId(\d+)"/g);
    if (rIdMatches) {
      rIdMatches.forEach(m => {
        const num = parseInt(m.replace(/\D/g, ''), 10);
        if (num >= nextRelId) nextRelId = num + 1;
      });
    }
    const commentRel = `<Relationship Id="rId${nextRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`;
    relsXml = relsXml.replace('</Relationships>', `${commentRel}</Relationships>`);
    loadedZip.file('word/_rels/document.xml.rels', relsXml);
  }

  let successCount = 0;
  let currentChangeId = maxCommentId + 10;

  // 6. Quét và áp dụng từng finding theo đúng loại xử lý
  targetFindings.forEach((finding, index) => {
    const commentId = maxCommentId + index + 1;
    const delId = currentChangeId++;
    const insId = currentChangeId++;

    const origTrimmed = finding.original.trim();
    const suggTrimmed = (finding.suggestion || '').trim();
    const escapedOrig = escapeXml(origTrimmed);
    const escapedSugg = escapeXml(suggTrimmed);
    const escapedReason = escapeXml(finding.reason || '');

    const isCommentOnly = finding.actionType === 'comment_only';

    const deptPrefix = finding.departmentName ? `[${finding.departmentName.toUpperCase()}] ` : '';
    const critPrefix = finding.criterion ? `[${finding.criterion}] ` : '';
    const statusPrefix = isCommentOnly ? '[ĐỀ XUẤT CÂN NHẮC]' : '[SAI LỆCH CĂN CỨ]';

    // A. Nội dung hiển thị trong Bong bóng Comment
    const commentTag = 
      `<w:comment w:id="${commentId}" w:author="${escapeXml(author)}" w:date="${dateStr}" w:initials="${escapeXml(initials)}">` +
        `<w:p>` +
          `<w:pPr><w:pStyle w:val="CommentText"/></w:pPr>` +
          `<w:r>` +
            `<w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>` +
            `<w:annotationRef/>` +
          `</w:r>` +
          `<w:r>` +
            `<w:rPr><w:b/><w:color w:val="${isCommentOnly ? 'D97706' : 'DC2626'}"/></w:rPr>` +
            `<w:t xml:space="preserve">${escapeXml(deptPrefix)}${escapeXml(critPrefix)}${statusPrefix} ${escapeXml(finding.issue)}: </w:t>` +
          `</w:r>` +
          (suggTrimmed ? (
            `<w:r>` +
              `<w:rPr><w:i/></w:rPr>` +
              `<w:t xml:space="preserve">Đề xuất sửa: "${escapedSugg}". </w:t>` +
            `</w:r>`
          ) : '') +
          `<w:r>` +
            `<w:t xml:space="preserve">Căn cứ: ${escapedReason}</w:t>` +
          `</w:r>` +
        `</w:p>` +
      `</w:comment>`;

    // B. Chuỗi thay thế Track Changes chuẩn OpenXML
    const trackChangeReplacement = 
      `<w:commentRangeStart w:id="${commentId}"/>` +
      `<w:del w:id="${delId}" w:author="${escapeXml(author)}" w:date="${dateStr}">` +
        `<w:r><w:delText xml:space="preserve">${escapedOrig}</w:delText></w:r>` +
      `</w:del>` +
      `<w:ins w:id="${insId}" w:author="${escapeXml(author)}" w:date="${dateStr}">` +
        `<w:r><w:t xml:space="preserve">${escapedSugg}</w:t></w:r>` +
      `</w:ins>` +
      `<w:commentRangeEnd w:id="${commentId}"/>` +
      `<w:r>` +
        `<w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>` +
        `<w:commentReference w:id="${commentId}"/>` +
      `</w:r>`;

    // C. Chuỗi thay thế Chỉ chèn Comment (Giữ nguyên văn bản gốc 100%)
    const commentOnlyReplacement = 
      `<w:commentRangeStart w:id="${commentId}"/>` +
      `<w:r><w:t xml:space="preserve">${escapedOrig}</w:t></w:r>` +
      `<w:commentRangeEnd w:id="${commentId}"/>` +
      `<w:r>` +
        `<w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>` +
        `<w:commentReference w:id="${commentId}"/>` +
      `</w:r>`;

    const targetReplacement = isCommentOnly ? commentOnlyReplacement : trackChangeReplacement;

    let replaced = false;

    // CHIẾN THUẬT 1: So khớp chính xác chuỗi trong XML
    if (documentXml.includes(escapedOrig)) {
      documentXml = documentXml.replace(escapedOrig, targetReplacement);
      replaced = true;
    } else if (documentXml.includes(origTrimmed)) {
      documentXml = documentXml.replace(origTrimmed, targetReplacement);
      replaced = true;
    }

    // CHIẾN THUẬT 2: So khớp đoạn văn bản <w:p>
    // Chỉ thay thế nếu plainText của paragraph chứa chính xác origTrimmed
    if (!replaced) {
      const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
      let match: RegExpExecArray | null;

      while ((match = pRegex.exec(documentXml)) !== null) {
        const pContent = match[0];
        const plainText = pContent.replace(/<[^>]+>/g, '');

        if (plainText.includes(origTrimmed)) {
          // Bọc an toàn: Gắn CommentRange vào cuối đoạn văn để người duyệt theo dõi,
          // TUYỆT ĐỐI không chèn đúp text vào cuối thẻ </w:p> làm xáo trộn văn bản
          const safeCommentAttachment = 
            `<w:commentRangeStart w:id="${commentId}"/><w:commentRangeEnd w:id="${commentId}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${commentId}"/></w:r></w:p>`;
          const updatedP = pContent.replace('</w:p>', safeCommentAttachment);
          documentXml = documentXml.replace(pContent, updatedP);
          replaced = true;
          break;
        }
      }
    }

    if (replaced) {
      commentEntries.push(commentTag);
      successCount++;
    }
  });

  // 7. Ghi nội dung comments mới vào comments.xml
  if (commentEntries.length > 0) {
    commentsXml = commentsXml.replace('</w:comments>', `${commentEntries.join('\n')}\n</w:comments>`);
    loadedZip.file('word/comments.xml', commentsXml);
  }

  // 8. Cập nhật word/document.xml
  loadedZip.file('word/document.xml', documentXml);

  // 9. Xuất file DOCX hoàn chỉnh
  const outputBlob = await loadedZip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { successCount, blob: outputBlob };
}

/**
 * Tải file đã áp dụng Track Changes về máy
 */
export async function downloadTrackedDocx(
  originalDocxFile: File,
  findings: FindingToApply[],
  reviewerName: string,
  reviewerDepartment?: string,
  scope: 'my_department' | 'all' = 'my_department',
  outputFileName: string = 'Hop_dong_Da_Soat_Xet_TrackChanges.docx'
): Promise<number> {
  const { successCount, blob } = await applyTrackChangesToDocx(
    originalDocxFile,
    findings,
    reviewerName,
    reviewerDepartment,
    scope
  );
  saveAs(blob, outputFileName);
  return successCount;
}
