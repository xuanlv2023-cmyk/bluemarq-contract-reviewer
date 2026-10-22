import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface FindingToApply {
  id: number;
  issue: string;
  original: string;
  suggestion: string;
  reason: string;
  severity: 'high' | 'medium' | 'low';
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

/**
 * Tạo danh tính viết tắt initials từ tên người dùng
 * Ví dụ: "Nguyễn Văn An" -> "NVA"
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return parts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 3);
}

/**
 * Áp dụng Track Changes và Comments vào file Word (.docx) theo chuẩn OpenXML ECMA-376
 */
export async function applyTrackChangesToDocx(
  originalDocxFile: File,
  findings: FindingToApply[],
  reviewerName: string = 'Ban Pháp Chế'
): Promise<{ successCount: number; blob: Blob }> {
  const author = reviewerName.trim() || 'Ban Pháp Chế AI';
  const initials = getInitials(author);
  const dateStr = new Date().toISOString();

  // Chỉ lấy những finding được người dùng chấp nhận (hoặc mặc định lấy hết nếu không có cờ accepted)
  const activeFindings = findings.filter(f => f.accepted !== false && f.original && f.suggestion);
  if (activeFindings.length === 0) {
    throw new Error('Không có điều khoản nào được chọn để áp dụng Track Changes.');
  }

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(originalDocxFile);

  // 1. Đọc word/document.xml
  let documentXml = await loadedZip.file('word/document.xml')?.async('string');
  if (!documentXml) {
    throw new Error('File không hợp lệ: Không tìm thấy word/document.xml bên trong file DOCX');
  }

  // 2. Chuẩn bị word/comments.xml
  let commentsXml = await loadedZip.file('word/comments.xml')?.async('string');
  let commentEntries: string[] = [];
  let maxCommentId = 1;

  if (commentsXml) {
    // Tìm max comment ID hiện có
    const idMatches = commentsXml.match(/w:id="(\d+)"/g);
    if (idMatches) {
      idMatches.forEach(m => {
        const num = parseInt(m.replace(/\D/g, ''), 10);
        if (num > maxCommentId) maxCommentId = num;
      });
    }
  } else {
    // Tạo cấu trúc comments.xml mới nếu chưa có
    commentsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" 
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
</w:comments>`;
  }

  // 3. Đảm bảo [Content_Types].xml có đăng ký comments
  let contentTypesXml = await loadedZip.file('[Content_Types].xml')?.async('string');
  if (contentTypesXml && !contentTypesXml.includes('wordprocessingml.comments+xml')) {
    const overrideEntry = `<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>`;
    contentTypesXml = contentTypesXml.replace('</Types>', `${overrideEntry}</Types>`);
    loadedZip.file('[Content_Types].xml', contentTypesXml);
  }

  // 4. Đảm bảo word/_rels/document.xml.rels có liên kết đến comments.xml
  let relsXml = await loadedZip.file('word/_rels/document.xml.rels')?.async('string');
  if (relsXml && !relsXml.includes('relationships/comments')) {
    // Tìm ID quan hệ lớn nhất
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

  // 5. Quét và áp dụng từng finding
  activeFindings.forEach((finding, index) => {
    const commentId = maxCommentId + index + 1;
    const delId = currentChangeId++;
    const insId = currentChangeId++;

    const origTrimmed = finding.original.trim();
    const suggTrimmed = finding.suggestion.trim();
    const escapedOrig = escapeXml(origTrimmed);
    const escapedSugg = escapeXml(suggTrimmed);
    const escapedReason = escapeXml(finding.reason || 'Sai lệch đối chiếu với tài liệu căn cứ.');

    const severityLabel = finding.severity === 'high' 
      ? 'RỦI RO CAO' 
      : finding.severity === 'medium' 
        ? 'CẦN LƯU Ý' 
        : 'LỖI THỂ THỨC';

    // Tạo khối Track Change + Comment Reference chuẩn OpenXML
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

    // Tạo thẻ Comment trong comments.xml
    const commentTag = 
      `<w:comment w:id="${commentId}" w:author="${escapeXml(author)}" w:date="${dateStr}" w:initials="${escapeXml(initials)}">` +
        `<w:p>` +
          `<w:pPr><w:pStyle w:val="CommentText"/></w:pPr>` +
          `<w:r>` +
            `<w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>` +
            `<w:annotationRef/>` +
          `</w:r>` +
          `<w:r>` +
            `<w:rPr><w:b/><w:color w:val="C5A059"/></w:rPr>` +
            `<w:t xml:space="preserve">[${severityLabel}] ${escapeXml(finding.issue)}: </w:t>` +
          `</w:r>` +
          `<w:r>` +
            `<w:t xml:space="preserve">${escapedReason}</w:t>` +
          `</w:r>` +
        `</w:p>` +
      `</w:comment>`;

    let replaced = false;

    // CHIẾN THUẬT 1: Tìm exact trong thẻ <w:t>...</w:t>
    // Xử lý cả trường hợp text có khoảng trắng hoặc ký tự đặc biệt
    if (documentXml.includes(escapedOrig)) {
      // Tìm vị trí thẻ <w:r> hoặc <w:t> bao quanh
      documentXml = documentXml.replace(escapedOrig, trackChangeReplacement);
      replaced = true;
    } else if (documentXml.includes(origTrimmed)) {
      documentXml = documentXml.replace(origTrimmed, trackChangeReplacement);
      replaced = true;
    }

    // CHIẾN THUẬT 2: Nếu câu bị ngắt qua nhiều thẻ <w:t> trong một paragraph <w:p>
    if (!replaced) {
      // Tìm paragraph chứa các từ khóa quan trọng của original
      const words = origTrimmed.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 2) {
        // Tìm paragraph có chứa cả từ đầu và từ cuối
        const firstWord = escapeXml(words[0]);
        const lastWord = escapeXml(words[words.length - 1]);
        
        // Match từng đoạn <w:p>...</w:p>
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        let match: RegExpExecArray | null;

        while ((match = pRegex.exec(documentXml)) !== null) {
          const pContent = match[0];
          // Trích xuất toàn bộ text của đoạn này
          const plainText = pContent.replace(/<[^>]+>/g, '');
          
          if (plainText.includes(origTrimmed) || (pContent.includes(firstWord) && pContent.includes(lastWord))) {
            // Thay thế bằng cách chèn Track Change vào vị trí thích hợp trong Paragraph
            // Chèn sau thẻ <w:pPr>...</w:pPr> nếu có
            let updatedP = pContent;
            if (updatedP.includes('</w:pPr>')) {
              updatedP = updatedP.replace('</w:pPr>', `</w:pPr>${trackChangeReplacement}`);
            } else {
              updatedP = updatedP.replace(/<w:p\b[^>]*>/, `$&${trackChangeReplacement}`);
            }
            documentXml = documentXml.replace(pContent, updatedP);
            replaced = true;
            break;
          }
        }
      }
    }

    if (replaced) {
      commentEntries.push(commentTag);
      successCount++;
    }
  });

  // 6. Ghi nội dung comments mới vào comments.xml
  if (commentEntries.length > 0) {
    commentsXml = commentsXml.replace('</w:comments>', `${commentEntries.join('\n')}\n</w:comments>`);
    loadedZip.file('word/comments.xml', commentsXml);
  }

  // 7. Cập nhật word/document.xml
  loadedZip.file('word/document.xml', documentXml);

  // 8. Xuất file DOCX hoàn chỉnh
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
  outputFileName: string = 'Hop_dong_Da_Soat_Xet_TrackChanges.docx'
): Promise<number> {
  const { successCount, blob } = await applyTrackChangesToDocx(originalDocxFile, findings, reviewerName);
  saveAs(blob, outputFileName);
  return successCount;
}
