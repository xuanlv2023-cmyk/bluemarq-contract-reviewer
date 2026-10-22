import JSZip from 'jszip';

export interface BoqRow {
  rowNumber: number;
  stt?: string;
  itemCode?: string;
  description: string;
  unit?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalAmount?: number | string;
  notes?: string;
  rawCells: string[];
}

export interface ParsedBoqResult {
  fileName: string;
  sheetName: string;
  totalRows: number;
  headers: string[];
  rows: BoqRow[];
  summaryText: string;
  estimatedGrandTotal?: string;
}

/**
 * Trích xuất dữ liệu bảng BOQ từ file Excel (.xlsx) bằng JSZip
 */
export async function parseExcelBoq(file: File): Promise<ParsedBoqResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);

  // 1. Đọc sharedStrings.xml
  const sharedStrings: string[] = [];
  const sstFile = loadedZip.file('xl/sharedStrings.xml');
  if (sstFile) {
    const sstXml = await sstFile.async('string');
    const parser = new DOMParser();
    const doc = parser.parseFromString(sstXml, 'application/xml');
    const siElements = doc.querySelectorAll('si');
    siElements.forEach((si) => {
      // Một số si có nhiều text run <t>
      const tElements = si.querySelectorAll('t');
      let text = '';
      tElements.forEach((t) => {
        text += t.textContent || '';
      });
      sharedStrings.push(text.trim());
    });
  }

  // 2. Tìm worksheet đầu tiên
  let sheetFileName = 'xl/worksheets/sheet1.xml';
  if (!loadedZip.file(sheetFileName)) {
    // Tìm file sheet bất kỳ
    const files = Object.keys(loadedZip.files);
    const found = files.find(f => f.startsWith('xl/worksheets/sheet') && f.endsWith('.xml'));
    if (found) sheetFileName = found;
  }

  const sheetFile = loadedZip.file(sheetFileName);
  if (!sheetFile) {
    throw new Error('Không tìm thấy dữ liệu Sheet trong file Excel (.xlsx)');
  }

  const sheetXml = await sheetFile.async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(sheetXml, 'application/xml');
  const rowElements = doc.querySelectorAll('sheetData > row');

  const tableData: string[][] = [];

  rowElements.forEach((row) => {
    const cells = row.querySelectorAll('c');
    const rowValues: string[] = [];
    cells.forEach((cell) => {
      const type = cell.getAttribute('t');
      const valElem = cell.querySelector('v');
      let val = valElem?.textContent || '';

      if (type === 's') {
        const idx = parseInt(val, 10);
        val = sharedStrings[idx] || '';
      } else if (type === 'inlineStr') {
        val = cell.querySelector('is > t')?.textContent || '';
      }
      rowValues.push(val.trim());
    });

    if (rowValues.some(v => v !== '')) {
      tableData.push(rowValues);
    }
  });

  if (tableData.length === 0) {
    return {
      fileName: file.name,
      sheetName: 'Sheet1',
      totalRows: 0,
      headers: [],
      rows: [],
      summaryText: 'Bảng BOQ trống hoặc không đọc được dữ liệu.',
    };
  }

  // Xác định hàng tiêu đề (thường là hàng đầu tiên có > 2 cột có chữ)
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(tableData.length, 10); i++) {
    const textCells = tableData[i].filter(c => isNaN(Number(c)) && c.length > 1);
    if (textCells.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  const headers = tableData[headerRowIndex] || [];
  const rows: BoqRow[] = [];
  let estimatedGrandTotal = '';

  for (let i = headerRowIndex + 1; i < tableData.length; i++) {
    const cells = tableData[i];
    const fullRowStr = cells.join(' | ');

    // Nhận diện dòng tổng cộng
    if (/tổng cộng|tổng tiền|giá trị sau thuế|thành tiền|grand total|total/i.test(fullRowStr)) {
      estimatedGrandTotal = fullRowStr;
    }

    rows.push({
      rowNumber: i + 1,
      description: cells[1] || cells[0] || '',
      unit: cells[2] || '',
      quantity: cells[3] || '',
      unitPrice: cells[4] || '',
      totalAmount: cells[5] || cells[cells.length - 1] || '',
      rawCells: cells,
    });
  }

  // Tạo bản tóm tắt Text có cấu trúc gọn gàng để gửi cho AI
  let summaryText = `[TÀI LIỆU CĂN CỨ BOQ / DỰ TOÁN KHỐI LƯỢNG: ${file.name}]\n`;
  summaryText += `Tổng số dòng dữ liệu: ${rows.length}\n`;
  if (estimatedGrandTotal) {
    summaryText += `Dòng tổng kết/Thành tiền ghi nhận: ${estimatedGrandTotal}\n`;
  }
  summaryText += `Tiêu đề cột: ${headers.join(' | ')}\n\n`;
  summaryText += `Các dòng hạng mục tiêu biểu:\n`;

  // Lấy tối đa 100 dòng quan trọng nhất để tránh quá tải
  const sampleRows = rows.slice(0, 100);
  sampleRows.forEach((r, idx) => {
    summaryText += `${idx + 1}. ${r.rawCells.filter(Boolean).join(' | ')}\n`;
  });

  if (rows.length > 100) {
    summaryText += `... và ${rows.length - 100} dòng hạng mục chi tiết khác.\n`;
  }

  return {
    fileName: file.name,
    sheetName: 'Sheet1',
    totalRows: rows.length,
    headers,
    rows,
    summaryText,
    estimatedGrandTotal,
  };
}
