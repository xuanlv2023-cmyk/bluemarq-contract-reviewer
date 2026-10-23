import JSZip from 'jszip';
import { parseExcelBoq } from './excel-parser';

export interface ProcessedDoc {
  fileName: string;
  fileType: 'docx' | 'pdf' | 'excel' | 'image' | 'text' | 'unknown';
  textContent?: string;
  base64Data?: string;
  mimeType?: string;
  summary?: string;
}

/**
 * Trích xuất toàn bộ text từ file DOCX giữ nguyên cấu trúc dòng và bảng
 */
export async function extractDocxText(file: File): Promise<string> {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(file);
    const documentXml = await loadedZip.file('word/document.xml')?.async('string');
    if (!documentXml) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(documentXml, 'application/xml');

    // Quét từng đoạn văn (w:p) và từng ô bảng (w:tc) có nhận diện số trang
    const paragraphs = doc.querySelectorAll('w\\:p, p');
    const resultLines: string[] = [];
    let currentPage = 1;
    let hasRenderedPageBreaks = false;

    // Kiểm tra xem file có thẻ ngắt trang in của Word không
    if (documentXml.includes('lastRenderedPageBreak') || documentXml.includes('w:type="page"')) {
      hasRenderedPageBreaks = true;
    }

    let lineIndex = 0;
    paragraphs.forEach((p) => {
      // Đếm số lần ngắt trang trong đoạn này (Word tự ghi nhận khi soạn thảo)
      if (hasRenderedPageBreaks) {
        const pageBreaks = p.querySelectorAll('w\\:lastRenderedPageBreak, lastRenderedPageBreak, w\\:br[w\\:type="page"], br[type="page"]');
        if (pageBreaks.length > 0) {
          currentPage += pageBreaks.length;
        }
      }

      // Lấy toàn bộ w:t trong đoạn
      const textNodes = p.querySelectorAll('w\\:t, t');
      let pText = '';
      textNodes.forEach((t) => {
        pText += t.textContent || '';
      });
      const trimmed = pText.trim();
      if (trimmed) {
        lineIndex++;
        // Nếu không có thẻ ngắt trang của Word thì ước tính ~32 đoạn văn bản mỗi trang
        const displayPage = hasRenderedPageBreaks ? currentPage : Math.max(1, Math.ceil(lineIndex / 32));
        resultLines.push(`[Trang ${displayPage}] ${trimmed}`);
      }
    });

    return resultLines.join('\n');
  } catch (err) {
    console.error('Lỗi khi đọc file DOCX:', err);
    throw new Error(`Không thể giải mã file Word (${file.name}): ${String(err)}`);
  }
}

/**
 * Chuyển đổi File sang Base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Bỏ phần header "data:...;base64,"
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Xử lý tài liệu đa định dạng (DOCX, PDF, XLSX, Ảnh scan, TXT)
 */
export async function processFile(file: File): Promise<ProcessedDoc> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  // 1. File Word
  if (ext === 'docx') {
    const text = await extractDocxText(file);
    return {
      fileName: file.name,
      fileType: 'docx',
      textContent: text,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      summary: `File Word: ${text.length} ký tự, khoảng ${Math.ceil(text.length / 1500)} trang`,
    };
  }

  // 2. File Excel BOQ
  if (ext === 'xlsx') {
    const boqData = await parseExcelBoq(file);
    return {
      fileName: file.name,
      fileType: 'excel',
      textContent: boqData.summaryText,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      summary: `Bảng BOQ Excel: ${boqData.totalRows} dòng dữ liệu. ${boqData.estimatedGrandTotal || ''}`,
    };
  }

  // 3. File PDF (Tờ trình, ĐKKD, Giấy ủy quyền)
  if (ext === 'pdf') {
    const base64 = await fileToBase64(file);
    return {
      fileName: file.name,
      fileType: 'pdf',
      base64Data: base64,
      mimeType: 'application/pdf',
      summary: `File PDF: ${(file.size / 1024 / 1024).toFixed(2)} MB (Xử lý trực tiếp qua Gemini Multimodal Vision)`,
    };
  }

  // 4. File Hình ảnh (Ảnh chụp / scan ĐKKD, Giấy ủy quyền)
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    const base64 = await fileToBase64(file);
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return {
      fileName: file.name,
      fileType: 'image',
      base64Data: base64,
      mimeType: mime,
      summary: `Ảnh scan: ${(file.size / 1024).toFixed(0)} KB (Gemini OCR)`,
    };
  }

  // 5. File Text thuần
  if (ext === 'txt') {
    const text = await file.text();
    return {
      fileName: file.name,
      fileType: 'text',
      textContent: text,
      mimeType: 'text/plain',
      summary: `File văn bản text: ${text.length} ký tự`,
    };
  }

  // Mặc định thử đọc text
  try {
    const text = await file.text();
    return {
      fileName: file.name,
      fileType: 'unknown',
      textContent: text,
      summary: `Tài liệu: ${file.name}`,
    };
  } catch {
    return {
      fileName: file.name,
      fileType: 'unknown',
      summary: `Tài liệu không xác định: ${file.name}`,
    };
  }
}
