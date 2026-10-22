import React, { useState, useRef, useEffect } from 'react';
import { 
  Scale, FileText, Building, Stamp, CheckCircle2, AlertCircle, 
  Loader2, Search, ArrowRight, XCircle, Info, UploadCloud, X, 
  File, Plus, FileSymlink, FileArchive, FileImage, Settings, Key, Check, DownloadCloud,
  ClipboardList, Calculator, CheckSquare, Square, Filter, FileSpreadsheet, Eye, Printer
} from 'lucide-react';
import { cn } from '../utils';
import { processFile, ProcessedDoc } from '../lib/file-extractor';
import { buildContractAuditPrompt } from '../lib/gemini-prompts';
import { downloadTrackedDocx, FindingToApply } from '../lib/docx-track-changes';
import { downloadAuditReport, AuditReportData } from '../lib/report-generator';

interface FindingWithSelection extends FindingToApply {
  category?: 'legal_authority' | 'financial_boq' | 'submission_mismatch' | 'format_compliance';
}

function getSmallFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileArchive className="w-4 h-4 text-red-400" />;
  if (['doc', 'docx'].includes(ext || '')) return <FileText className="w-4 h-4 text-blue-400" />;
  if (['xls', 'xlsx'].includes(ext || '')) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
  if (['jpg', 'jpeg', 'png'].includes(ext || '')) return <FileImage className="w-4 h-4 text-amber-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

interface CompactUploadRowProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  file: File | null;
  processedDoc?: ProcessedDoc | null;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
  required?: boolean;
  accept?: string;
}

function CompactUploadRow({ 
  title, icon, description, file, processedDoc, onFileSelect, onRemove, required, accept 
}: CompactUploadRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-[#1E3A5F]/70 last:border-0 gap-3 hover:bg-[#1A2F4C]/50 transition-colors px-2.5 rounded-lg">
      <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
        <div className="mt-0.5 p-2 bg-[#0B1A2D] rounded-lg text-[#C5A059] shadow-sm border border-[#1E3A5F] shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center leading-normal">
            {title} {required && <span className="text-[#C5A059] ml-1 font-bold">*</span>}
          </h3>
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{description}</p>
          {processedDoc?.summary && (
            <p className="text-[11px] text-[#C5A059] mt-0.5 font-medium truncate flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> {processedDoc.summary}
            </p>
          )}
        </div>
      </div>

      <div className="w-full sm:w-auto sm:max-w-[42%] flex-shrink-0 flex items-center justify-start sm:justify-end min-w-0">
        {!file ? (
          <>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept={accept || ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#0B1A2D] border border-[#1E3A5F] text-slate-300 hover:bg-[#1A2F4C] hover:text-[#C5A059] hover:border-[#C5A059] text-xs font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Tải tệp lên</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 bg-[#0B1A2D] border border-[#1E3A5F] pl-2.5 pr-1.5 py-1.5 rounded-lg w-full min-w-0">
            {getSmallFileIcon(file.name)}
            <span className="text-xs font-medium text-slate-300 truncate flex-1" title={file.name}>{file.name}</span>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="ml-1 p-1 hover:bg-[#1E3A5F] text-slate-400 hover:text-red-400 rounded-md transition-colors shrink-0"
              title="Xóa tệp"
            >
               <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractReviewer() {
  // Quản lý các file tài liệu
  const [toTrinhFile, setToTrinhFile] = useState<File | null>(null);
  const [toTrinhDoc, setToTrinhDoc] = useState<ProcessedDoc | null>(null);

  const [dkkdFile, setDkkdFile] = useState<File | null>(null);
  const [dkkdDoc, setDkkdDoc] = useState<ProcessedDoc | null>(null);

  const [uyQuyenFile, setUyQuyenFile] = useState<File | null>(null);
  const [uyQuyenDoc, setUyQuyenDoc] = useState<ProcessedDoc | null>(null);

  const [bangTongHopFile, setBangTongHopFile] = useState<File | null>(null);
  const [bangTongHopDoc, setBangTongHopDoc] = useState<ProcessedDoc | null>(null);

  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [boqDoc, setBoqDoc] = useState<ProcessedDoc | null>(null);

  const [extraFiles, setExtraFiles] = useState<{ id: string; file: File | null; doc: ProcessedDoc | null }[]>([]);

  const [hopDongFile, setHopDongFile] = useState<File | null>(null);
  const [hopDongDoc, setHopDongDoc] = useState<ProcessedDoc | null>(null);

  // Trạng thái xử lý
  const [findings, setFindings] = useState<FindingWithSelection[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Cấu hình người dùng & Model
  const [reviewerName, setReviewerName] = useState(() => localStorage.getItem('bmq_reviewer_name') || 'Ban Pháp Chế');
  const [selectedModel, setSelectedModel] = useState<'gemini-2.5-pro' | 'gemini-2.5-flash'>('gemini-2.5-pro');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('bmq_gemini_api_key') || '');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Modal xem chi tiết so sánh
  const [diffModalItem, setDiffModalItem] = useState<FindingWithSelection | null>(null);

  // Lưu tên người soát xét vào localStorage
  useEffect(() => {
    localStorage.setItem('bmq_reviewer_name', reviewerName);
  }, [reviewerName]);

  // Lưu API Key vào localStorage
  const handleSaveApiKey = (newKey: string) => {
    setApiKey(newKey);
    localStorage.setItem('bmq_gemini_api_key', newKey);
    setShowConfigModal(false);
  };

  // Tự động phân tích tệp ngay khi người dùng chọn
  const handleFileSelect = async (file: File, type: string) => {
    try {
      const processed = await processFile(file);
      if (type === 'totrinh') { setToTrinhFile(file); setToTrinhDoc(processed); }
      else if (type === 'dkkd') { setDkkdFile(file); setDkkdDoc(processed); }
      else if (type === 'uyquyen') { setUyQuyenFile(file); setUyQuyenDoc(processed); }
      else if (type === 'bangtonghop') { setBangTongHopFile(file); setBangTongHopDoc(processed); }
      else if (type === 'boq') { setBoqFile(file); setBoqDoc(processed); }
      else if (type === 'hopdong') { setHopDongFile(file); setHopDongDoc(processed); }
    } catch (e: any) {
      setError(`Lỗi đọc tệp ${file.name}: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const addExtraFile = () => {
    setExtraFiles([...extraFiles, { id: Math.random().toString(36).substring(7), file: null, doc: null }]);
  };

  const updateExtraFile = async (id: string, file: File) => {
    try {
      const doc = await processFile(file);
      setExtraFiles(extraFiles.map(f => f.id === id ? { ...f, file, doc } : f));
    } catch (e: any) {
      setError(`Lỗi đọc tệp bổ trợ: ${e.message}`);
    }
  };

  const removeExtraFile = (id: string) => {
    setExtraFiles(extraFiles.filter(f => f.id !== id));
  };

  // Hàm thực thi Soát xét hợp đồng
  const handleReview = async () => {
    if (!hopDongFile) {
      setError('Vui lòng tải lên Bản thảo Hợp đồng (.docx) để hệ thống tiến hành đối chiếu.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    const ext = hopDongFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx') {
      setError('Bản thảo Hợp đồng bắt buộc phải là định dạng Word (.docx) để hỗ trợ xuất Track Changes.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setIsLoading(true);
    setError(null);
    setFindings(null);

    try {
      // BƯỚC 1: Xử lý Bản thảo Hợp đồng
      setLoadingStep('Đang trích xuất toàn văn bản thảo Hợp đồng...');
      let contractText = hopDongDoc?.textContent;
      if (!contractText) {
        const processedHopDong = await processFile(hopDongFile);
        setHopDongDoc(processedHopDong);
        contractText = processedHopDong.textContent;
      }

      if (!contractText || contractText.trim() === '') {
        throw new Error('Không thể đọc nội dung bản thảo Hợp đồng hoặc tài liệu bị mã hóa.');
      }

      // BƯỚC 2: Thu thập tài liệu Căn cứ
      setLoadingStep('Đang đọc và phân tích cấu trúc Tờ trình, ĐKKD, BOQ, Giấy ủy quyền...');
      const mediaFiles: { mimeType: string; base64: string; label: string }[] = [];

      // Xử lý các file PDF/Ảnh nếu có để gửi trực tiếp sang Gemini Multimodal
      const checkAndPushMedia = (doc: ProcessedDoc | null, label: string) => {
        if (doc && doc.base64Data && doc.mimeType) {
          mediaFiles.push({
            mimeType: doc.mimeType,
            base64: doc.base64Data,
            label,
          });
        }
      };

      checkAndPushMedia(toTrinhDoc, 'Tờ trình chủ trương');
      checkAndPushMedia(dkkdDoc, 'Giấy phép ĐKKD');
      checkAndPushMedia(uyQuyenDoc, 'Giấy ủy quyền');

      // BƯỚC 3: Xây dựng Prompt đối chiếu 5 tầng
      setLoadingStep('Đang xây dựng ma trận đối chiếu pháp lý & thương mại...');
      const extraDocsSummary = extraFiles
        .filter(f => f.doc?.textContent)
        .map((f, i) => `Phụ lục ${i + 1} (${f.file?.name}):\n${f.doc?.textContent}`)
        .join('\n\n');

      const prompt = buildContractAuditPrompt({
        toTrinhText: toTrinhDoc?.textContent || (toTrinhDoc?.base64Data ? '[Tài liệu Tờ trình dạng PDF scan đính kèm]' : undefined),
        dkkdText: dkkdDoc?.textContent || (dkkdDoc?.base64Data ? '[Giấy phép ĐKKD dạng PDF/ảnh scan đính kèm]' : undefined),
        uyQuyenText: uyQuyenDoc?.textContent || (uyQuyenDoc?.base64Data ? '[Giấy ủy quyền dạng PDF/ảnh scan đính kèm]' : undefined),
        boqText: boqDoc?.textContent,
        bangTongHopText: bangTongHopDoc?.textContent,
        extraDocsText: extraDocsSummary || undefined,
        hopDongText: contractText,
        reviewerName,
      });

      // BƯỚC 4: Gửi sang Backend gọi Gemini 2.5 Pro
      setLoadingStep(`BLUEMARQ AI Engine (${selectedModel}) đang phân tích toàn diện ma trận hợp đồng...`);
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mediaFiles,
          apiKey: apiKey || undefined,
          model: selectedModel,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi gọi API máy chủ.');
      }

      const rawFindings: any[] = data.findings || [];
      // Khởi tạo trạng thái mặc định: tất cả các lỗi đều được chọn để Track Changes
      const formattedFindings: FindingWithSelection[] = rawFindings.map((f, idx) => ({
        id: f.id || idx + 1,
        issue: f.issue || 'Vấn đề cần sửa đổi',
        original: f.original || '',
        suggestion: f.suggestion || '',
        reason: f.reason || 'Đối chiếu với tài liệu căn cứ',
        severity: f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
        category: f.category || 'financial_boq',
        accepted: true, // Mặc định chấp nhận sửa đổi
      }));

      setFindings(formattedFindings);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Có lỗi xảy ra trong quá trình soát xét.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Toggle chấp nhận / bỏ qua sửa đổi cho 1 finding
  const toggleFindingAccepted = (id: number) => {
    if (!findings) return;
    setFindings(findings.map(f => f.id === id ? { ...f, accepted: !f.accepted } : f));
  };

  // Chọn tất cả hoặc bỏ chọn tất cả
  const toggleSelectAll = (select: boolean) => {
    if (!findings) return;
    setFindings(findings.map(f => ({ ...f, accepted: select })));
  };

  // Tải xuống file Word có Track Changes
  const handleDownloadDocx = async () => {
    if (!hopDongFile || !findings) return;
    try {
      const outputName = hopDongFile.name.replace(/\.docx$/i, '') + `_Da_Soat_Xet_${reviewerName.replace(/\s+/g, '_')}.docx`;
      const applied = await downloadTrackedDocx(hopDongFile, findings, reviewerName, outputName);
      alert(`Đã xuất thành công file Word với ${applied} điểm sửa đổi được ghi nhận dưới tên [${reviewerName}]! Mở file trong Word để xem vết gạch đỏ và bóng Comment.`);
    } catch (err: any) {
      console.error(err);
      alert(`Lỗi khi tạo Track Changes: ${err.message}`);
    }
  };

  // Tải xuống Biên bản Soát xét (Audit Report HTML/Print)
  const handleDownloadReport = () => {
    if (!hopDongFile || !findings) return;

    const baseDocsList: { title: string; fileName: string; type: string }[] = [];
    if (toTrinhFile) baseDocsList.push({ title: 'Tờ trình chủ trương', fileName: toTrinhFile.name, type: toTrinhDoc?.fileType || 'tài liệu' });
    if (dkkdFile) baseDocsList.push({ title: 'Giấy phép ĐKKD', fileName: dkkdFile.name, type: dkkdDoc?.fileType || 'pháp lý' });
    if (uyQuyenFile) baseDocsList.push({ title: 'Giấy ủy quyền', fileName: uyQuyenFile.name, type: uyQuyenDoc?.fileType || 'ủy quyền' });
    if (boqFile) baseDocsList.push({ title: 'Bảng BOQ / Dự toán', fileName: boqFile.name, type: 'Bảng tính Excel' });
    if (bangTongHopFile) baseDocsList.push({ title: 'Bảng tổng hợp điều chỉnh', fileName: bangTongHopFile.name, type: 'ý kiến nội bộ' });
    extraFiles.forEach((ef, idx) => {
      if (ef.file) baseDocsList.push({ title: `Tài liệu bổ trợ ${idx + 1}`, fileName: ef.file.name, type: 'phụ lục' });
    });

    const reportData: AuditReportData = {
      contractName: hopDongFile.name,
      reviewerName: reviewerName || 'Ban Pháp Chế',
      reviewDate: new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
      baseDocuments: baseDocsList,
      findings,
    };

    downloadAuditReport(reportData, `Bien_Ban_Soat_Xet_${hopDongFile.name.replace(/\.docx$/i, '')}.html`);
  };

  // Lọc danh sách phát hiện
  const filteredFindings = (findings || []).filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchIssue = item.issue.toLowerCase().includes(q);
      const matchOrig = item.original.toLowerCase().includes(q);
      const matchSugg = item.suggestion.toLowerCase().includes(q);
      const matchReason = item.reason.toLowerCase().includes(q);
      if (!matchIssue && !matchOrig && !matchSugg && !matchReason) return false;
    }
    return true;
  });

  const acceptedCount = (findings || []).filter(f => f.accepted).length;

  return (
    <div className="min-h-screen bg-[#0B1A2D] text-slate-300 font-sans selection:bg-[#C5A059]/30 selection:text-[#C5A059] pb-16">
      
      {/* HEADER BLUEMARQ */}
      <header className="bg-[#13253F] border-b border-[#1E3A5F] sticky top-0 z-30 shadow-lg backdrop-blur-md">
        <div className="max-w-[1680px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex flex-col justify-center shrink-0 select-none pt-1">
              <div className="text-[#C5A059] font-bold text-[28px] leading-none tracking-normal font-serif">
                BLUEMARQ
              </div>
              <div className="text-[#C5A059] text-[10px] leading-none tracking-[0.45em] font-medium text-center mt-1 ml-1">
                GROUP
              </div>
            </div>
            <div className="h-7 w-px bg-[#1E3A5F]"></div>
            <h1 className="font-light text-[13px] text-slate-300 tracking-wide uppercase hidden sm:block">
              Hệ Thống Pháp Chế AI <span className="font-medium text-[#C5A059] mx-1">|</span> Soát xét Hợp đồng Online
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Lựa chọn Model AI */}
            <div className="hidden md:flex items-center gap-2 bg-[#0B1A2D] border border-[#1E3A5F] rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <span className="text-slate-400">Engine:</span>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="bg-transparent text-[#C5A059] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="gemini-2.5-pro" className="bg-[#13253F] text-slate-200">Gemini 2.5 Pro (Khuyên dùng - Đối chiếu sâu)</option>
                <option value="gemini-2.5-flash" className="bg-[#13253F] text-slate-200">Gemini 2.5 Flash (Siêu tốc độ)</option>
              </select>
            </div>

            {/* Nút Cài đặt API Key */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 border border-[#1E3A5F] bg-[#0B1A2D] hover:border-[#C5A059] text-slate-300 hover:text-[#C5A059] px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
              title="Cấu hình Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-[#C5A059]" />
              <span className="hidden sm:inline">Khóa API</span>
            </button>

            {/* Trạng thái hệ thống */}
            <div className="flex items-center gap-1.5 border border-[#1E3A5F] bg-[#0B1A2D] rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-medium shadow-sm">
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sẵn sàng</span>
            </div>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-[1680px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* ==================== CỘT TRÁI: 40% TÀI LIỆU CĂN CỨ & BẢN THẢO ==================== */}
          <div className="w-full lg:w-[42%] flex flex-col space-y-6">
            
            {/* CARD 1: CĂN CỨ ĐỐI CHIẾU */}
            <div className="bg-[#13253F] rounded-xl shadow-lg border border-[#1E3A5F] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Stamp className="w-5 h-5 text-[#C5A059]" />
                  Hồ Sơ Căn Cứ Đối Chiếu
                </h2>
                <span className="text-[11px] bg-[#0B1A2D] border border-[#1E3A5F] text-[#C5A059] px-2 py-0.5 rounded font-mono">
                  Chuẩn pháp lý
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Hệ thống AI sẽ dùng các tài liệu này để kiểm tra chéo từng điều khoản trong hợp đồng.
              </p>
              
              <div className="flex flex-col space-y-1">
                <CompactUploadRow
                  title="Tờ trình chủ trương / phê duyệt"
                  icon={<FileText className="w-4 h-4" />}
                  description="Giá trị gói thầu, hình thức thanh toán, bảo lãnh đã được duyệt."
                  file={toTrinhFile}
                  processedDoc={toTrinhDoc}
                  onFileSelect={(f) => handleFileSelect(f, 'totrinh')}
                  onRemove={() => { setToTrinhFile(null); setToTrinhDoc(null); }}
                  accept=".pdf,.docx,.doc,.txt"
                />
                
                <CompactUploadRow
                  title="Giấy phép ĐKKD các bên"
                  icon={<Building className="w-4 h-4" />}
                  description="Tên pháp nhân, mã số thuế, địa chỉ trụ sở, người đại diện PL."
                  file={dkkdFile}
                  processedDoc={dkkdDoc}
                  onFileSelect={(f) => handleFileSelect(f, 'dkkd')}
                  onRemove={() => { setDkkdFile(null); setDkkdDoc(null); }}
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                />

                <CompactUploadRow
                  title="Giấy ủy quyền đại diện ký kết"
                  icon={<Stamp className="w-4 h-4" />}
                  description="Số văn bản, phạm vi ủy quyền, hạn mức và thời hạn hiệu lực."
                  file={uyQuyenFile}
                  processedDoc={uyQuyenDoc}
                  onFileSelect={(f) => handleFileSelect(f, 'uyquyen')}
                  onRemove={() => { setUyQuyenFile(null); setUyQuyenDoc(null); }}
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                />

                <CompactUploadRow
                  title="Bảng BOQ / Dự toán khối lượng"
                  icon={<Calculator className="w-4 h-4" />}
                  description="Bảng tính Excel (.xlsx) chứa đơn giá, khối lượng và tổng cộng."
                  file={boqFile}
                  processedDoc={boqDoc}
                  onFileSelect={(f) => handleFileSelect(f, 'boq')}
                  onRemove={() => { setBoqFile(null); setBoqDoc(null); }}
                  accept=".xlsx,.xls"
                />

                <CompactUploadRow
                  title="Bảng tổng hợp điều chỉnh nội bộ"
                  icon={<ClipboardList className="w-4 h-4" />}
                  description="Các điều khoản mà các phòng ban chuyên môn đã chốt sửa."
                  file={bangTongHopFile}
                  processedDoc={bangTongHopDoc}
                  onFileSelect={(f) => handleFileSelect(f, 'bangtonghop')}
                  onRemove={() => { setBangTongHopFile(null); setBangTongHopDoc(null); }}
                  accept=".docx,.xlsx,.txt"
                />

                {extraFiles.map((item, index) => (
                  <CompactUploadRow
                    key={item.id}
                    title={`Tài liệu bổ trợ ${index + 1}`}
                    icon={<File className="w-4 h-4" />}
                    description="Phụ lục kỹ thuật, quy định thưởng phạt hoặc bảo hành riêng."
                    file={item.file}
                    processedDoc={item.doc}
                    onFileSelect={(f) => updateExtraFile(item.id, f)}
                    onRemove={() => removeExtraFile(item.id)}
                  />
                ))}

                <div className="pt-3">
                  <button 
                    type="button"
                    onClick={addExtraFile}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A059] hover:text-[#D4AF37] hover:bg-[#0B1A2D] px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-[#1E3A5F]"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm tài liệu bổ trợ khác
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: BẢN THẢO HỢP ĐỒNG CẦN SOÁT XÉT */}
            <div className="bg-[#13253F] rounded-xl shadow-lg border border-[#C5A059]/50 p-5 sm:p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059]"></div>
              
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#C5A059]" />
                  Tài Liệu Cần Soát Xét (Bản Thảo)
                </h2>
                <span className="text-[11px] bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded font-bold">
                  Bắt buộc
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mb-4">
                Tải lên file Word (.docx) bản thảo hợp đồng để AI phân tích và tự động chèn Track Changes.
              </p>
              
              <CompactUploadRow
                title="Bản thảo Hợp đồng kinh tế"
                icon={<Scale className="w-4 h-4 text-[#C5A059]" />}
                description="Hỗ trợ file .docx (không giới hạn số trang)."
                required
                file={hopDongFile}
                processedDoc={hopDongDoc}
                onFileSelect={(f) => handleFileSelect(f, 'hopdong')}
                onRemove={() => { setHopDongFile(null); setHopDongDoc(null); }}
                accept=".docx"
              />
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl flex items-start gap-3 shadow-lg">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-red-300 font-medium leading-relaxed">
                  {error}
                </div>
              </div>
            )}

            {/* NÚT THỰC THI CHÍNH */}
            <button
              onClick={handleReview}
              disabled={isLoading}
              className={cn(
                "relative overflow-hidden w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] text-[#0B1A2D] font-bold text-sm sm:text-base py-4 px-6 rounded-xl shadow-[0_4px_20px_0_rgba(197,160,89,0.35)] hover:shadow-[0_6px_24px_rgba(197,160,89,0.5)] hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-[#C5A059]/40 transition-all duration-300 flex items-center justify-center gap-2 group",
                isLoading && "opacity-85 cursor-not-allowed hover:transform-none hover:shadow-none"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="uppercase tracking-widest font-extrabold text-[13px] sm:text-[14px]">
                    Đang đối chiếu ma trận tài liệu...
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span className="uppercase tracking-widest font-extrabold text-[13px] sm:text-[14px]">
                    Bắt đầu Soát xét Hợp đồng
                  </span>
                </>
              )}
            </button>
          </div>

          {/* ==================== CỘT PHẢI: 60% KẾT QUẢ ĐỐI CHIẾU & TRACK CHANGES ==================== */}
          <div className="w-full lg:w-[58%] flex flex-col">
            <div className="bg-[#13253F] rounded-xl shadow-lg border border-[#1E3A5F] overflow-hidden flex flex-col h-full min-h-[600px] lg:min-h-[850px]">
              
              {/* Header Cột Phải */}
              <div className="px-6 py-4 border-b border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#13253F]">
                <div>
                  <h2 className="font-bold text-[#C5A059] text-base sm:text-lg tracking-tight flex items-center gap-2.5 uppercase font-serif">
                    Kết Quả Rà Soát & Đề Xuất Sửa Đổi
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Đối chiếu song song giữa Căn cứ đầu vào và Bản thảo hợp đồng
                  </p>
                </div>

                {findings && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/60 px-3 py-1 rounded-full font-bold">
                      {findings.length} Sai lệch
                    </span>
                    <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-3 py-1 rounded-full font-bold">
                      {acceptedCount} Đã chọn Track Change
                    </span>
                  </div>
                )}
              </div>

              {/* THANH CÔNG CỤ LỌC & TÌM KIẾM (KHI ĐÃ CÓ KẾT QUẢ) */}
              {findings && findings.length > 0 && (
                <div className="px-6 py-3 bg-[#0E1F35] border-b border-[#1E3A5F] flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Ô tìm kiếm */}
                  <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Tìm kiếm lỗi, điều khoản, lý do..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#13253F] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>

                  {/* Lọc theo mức độ & phân loại */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select 
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="bg-[#13253F] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#C5A059]"
                    >
                      <option value="all">Tất cả mức độ</option>
                      <option value="high">Nghiêm trọng (Đỏ)</option>
                      <option value="medium">Cần lưu ý (Cam)</option>
                      <option value="low">Lỗi nhỏ (Xanh)</option>
                    </select>

                    <button 
                      onClick={() => toggleSelectAll(true)}
                      className="text-xs text-[#C5A059] hover:underline px-1.5 py-1"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-600">|</span>
                    <button 
                      onClick={() => toggleSelectAll(false)}
                      className="text-xs text-slate-400 hover:underline px-1.5 py-1"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>
              )}
              
              {/* BODY NỘI DUNG */}
              <div className="p-5 sm:p-6 flex-1 bg-[#0B1A2D] relative overflow-y-auto">
                
                {/* 1. TRẠNG THÁI ĐANG XỬ LÝ (LOADING) */}
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#C5A059] min-h-[480px]">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#C5A059]" />
                    <p className="text-base font-bold tracking-wider text-slate-100 uppercase">
                      BLUEMARQ AUDIT ENGINE
                    </p>
                    <p className="text-xs sm:text-sm text-[#C5A059] mt-2 font-medium max-w-md text-center animate-pulse">
                      {loadingStep || 'Đang thực thi thuật toán đối chiếu pháp lý chuyên sâu...'}
                    </p>
                    <div className="w-48 h-1 bg-[#1E3A5F] rounded-full mt-6 overflow-hidden">
                      <div className="h-full bg-[#C5A059] animate-[shimmer_1.5s_infinite]"></div>
                    </div>
                  </div>
                ) : findings ? (
                  
                  // 2. TRẠNG THÁI ĐÃ CÓ KẾT QUẢ
                  <div className="space-y-5">
                    {filteredFindings.length === 0 ? (
                      <div className="bg-[#13253F] border border-[#1E3A5F] p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-3 shadow-lg">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                        <h3 className="text-lg font-bold text-slate-100">
                          {findings.length === 0 ? "Bản thảo hoàn hảo!" : "Không tìm thấy lỗi khớp bộ lọc"}
                        </h3>
                        <p className="text-slate-400 text-xs sm:text-sm max-w-md">
                          {findings.length === 0 
                            ? "Không phát hiện sai lệch nào giữa bản thảo hợp đồng và các tài liệu căn cứ (Tờ trình, ĐKKD, BOQ, Giấy ủy quyền)." 
                            : "Thử thay đổi từ khóa tìm kiếm hoặc chọn 'Tất cả mức độ'."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredFindings.map((item) => {
                          const isHigh = item.severity === 'high';
                          const isMed = item.severity === 'medium';
                          const riskBadgeClass = isHigh 
                            ? 'text-red-400 bg-red-950/60 border-red-700/60' 
                            : isMed 
                              ? 'text-orange-400 bg-orange-950/60 border-orange-700/60' 
                              : 'text-blue-400 bg-blue-950/60 border-blue-700/60';
                          const riskDotClass = isHigh ? 'bg-red-500' : isMed ? 'bg-orange-500' : 'bg-blue-500';

                          return (
                            <div 
                              key={item.id} 
                              className={cn(
                                "bg-[#13253F] rounded-xl shadow-md border transition-all duration-200 overflow-hidden",
                                item.accepted ? "border-[#1E3A5F] hover:border-[#C5A059]/60" : "border-slate-800 opacity-60"
                              )}
                            >
                              {/* Header Card Lỗi */}
                              <div className="px-4 py-3 bg-[#13253F] border-b border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div className="flex items-center gap-3">
                                  {/* Checkbox chấp nhận sửa đổi */}
                                  <button
                                    onClick={() => toggleFindingAccepted(item.id)}
                                    className="text-slate-400 hover:text-[#C5A059] transition-colors shrink-0"
                                    title={item.accepted ? "Nhấn để bỏ qua thay đổi này" : "Nhấn để áp dụng Track Change"}
                                  >
                                    {item.accepted ? (
                                      <CheckSquare className="w-5 h-5 text-[#C5A059]" />
                                    ) : (
                                      <Square className="w-5 h-5" />
                                    )}
                                  </button>

                                  <div className="flex items-center gap-2">
                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", riskBadgeClass)}>
                                      {isHigh ? 'Nghiêm trọng' : isMed ? 'Cần lưu ý' : 'Lỗi nhỏ'}
                                    </span>
                                    <h3 className="font-bold text-slate-100 text-xs sm:text-sm">
                                      {item.issue}
                                    </h3>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setDiffModalItem(item)}
                                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#C5A059] px-2 py-1 rounded bg-[#0B1A2D] border border-[#1E3A5F]"
                                  >
                                    <Eye className="w-3 h-3" />
                                    So sánh
                                  </button>
                                </div>
                              </div>

                              {/* Lý do & Căn cứ đối chiếu */}
                              <div className="px-4 py-2 bg-[#0B1A2D] border-b border-[#1E3A5F] flex items-start gap-2 text-xs text-slate-400">
                                <Info className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                                <span className="font-medium text-slate-300">
                                  <strong>Căn cứ:</strong> {item.reason}
                                </span>
                              </div>

                              {/* So sánh Đoạn gốc vs Đề xuất sửa */}
                              <div className="p-4 flex flex-col sm:flex-row gap-4 bg-[#0B1A2D]/40 text-xs">
                                {/* Đoạn gốc */}
                                <div className="flex-1 space-y-1.5">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-red-400" /> Bản thảo gốc (Được thay thế)
                                  </div>
                                  <div className="p-3 bg-red-950/20 rounded-lg border border-red-900/30">
                                    <p className="text-red-400/90 font-serif leading-relaxed line-through decoration-red-500/50 italic whitespace-pre-wrap">
                                      {item.original}
                                    </p>
                                  </div>
                                </div>

                                <div className="hidden sm:flex flex-col items-center justify-center text-slate-600">
                                  <ArrowRight className="w-4 h-4" />
                                </div>

                                {/* Đề xuất sửa */}
                                <div className="flex-1 space-y-1.5">
                                  <div className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Đề xuất viết lại (Track Changes)
                                  </div>
                                  <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-900/50">
                                    <p className="text-emerald-300 font-serif leading-relaxed font-semibold whitespace-pre-wrap">
                                      {item.suggestion}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* TOOLBAR XUẤT FILE HOÀN CHỈNH */}
                        <div className="mt-8 pt-5 border-t border-[#1E3A5F] flex flex-col xl:flex-row items-center justify-between gap-4 bg-[#0E1F35] p-5 rounded-xl border shadow-xl">
                          <div className="w-full xl:max-w-[380px]">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                              Tên người soát xét (Tác giả Track Changes):
                            </label>
                            <input 
                              type="text"
                              value={reviewerName}
                              onChange={(e) => setReviewerName(e.target.value)}
                              placeholder="VD: Nguyễn Văn A - Ban Pháp Chế..."
                              className="w-full bg-[#13253F] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C5A059]"
                            />
                          </div>

                          <div className="flex items-center gap-3 w-full xl:w-auto">
                            {/* Xuất Báo cáo HTML */}
                            <button
                              onClick={handleDownloadReport}
                              className="flex-1 xl:flex-initial bg-[#13253F] hover:bg-[#1E3A5F] border border-[#1E3A5F] text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-1.5"
                              title="Tải biên bản soát xét dạng HTML/In ấn"
                            >
                              <Printer className="w-4 h-4 text-[#C5A059]" />
                              <span>Biên bản Soát xét</span>
                            </button>

                            {/* Tải Bản thảo Word Track Changes */}
                            <button 
                              onClick={handleDownloadDocx}
                              disabled={acceptedCount === 0}
                              className={cn(
                                "flex-1 xl:flex-initial bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-[#0B1A2D] font-bold text-xs sm:text-sm py-2.5 px-5 rounded-lg shadow-lg hover:shadow-[0_4px_16px_rgba(197,160,89,0.4)] transition-all flex items-center justify-center gap-2",
                                acceptedCount === 0 && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <DownloadCloud className="w-4 h-4" />
                              <span>Xuất File Word ({acceptedCount} Track Changes)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  // 3. TRẠNG THÁI BAN ĐẦU CHƯA SOÁT XÉT
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-5 px-6 min-h-[480px]">
                    <div className="w-20 h-20 rounded-full bg-[#13253F] flex items-center justify-center border border-[#1E3A5F] shadow-lg">
                      <Scale className="w-10 h-10 text-[#C5A059] stroke-[1.5]" />
                    </div>
                    <div className="text-center max-w-md">
                      <p className="text-base font-bold text-slate-200 mb-2 uppercase tracking-wide font-serif">
                        Trung Tâm Đối Chiếu Pháp Chế BLUEMARQ
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Tải lên các tài liệu căn cứ (Tờ trình, ĐKKD, BOQ, Ủy quyền) và Bản thảo Hợp đồng (.docx) ở cột bên trái, sau đó nhấn <strong className="text-[#C5A059]">Bắt đầu Soát xét</strong> để AI đối chiếu ma trận.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL CẤU HÌNH API KEY */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#13253F] border border-[#1E3A5F] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#C5A059]" />
                Cấu hình Gemini API Key
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Bạn có thể nhập API Key cá nhân của bạn từ Google AI Studio (được lưu an toàn trong trình duyệt của bạn), hoặc để trống để sử dụng API Key mặc định của máy chủ.
            </p>

            <div>
              <input 
                type="password"
                defaultValue={apiKey}
                id="apiKeyInput"
                placeholder="Dán mã khóa AI Studio (AIzaSy...)"
                className="w-full bg-[#0B1A2D] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#C5A059] font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSaveApiKey('')}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5"
              >
                Xóa dùng mặc định
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = (document.getElementById('apiKeyInput') as HTMLInputElement)?.value || '';
                  handleSaveApiKey(val.trim());
                }}
                className="bg-[#C5A059] hover:bg-[#D4AF37] text-[#0B1A2D] text-xs font-bold px-4 py-2 rounded-lg transition-colors"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT SO SÁNH */}
      {diffModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#13253F] border border-[#1E3A5F] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1E3A5F] pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                Chi tiết đối chiếu: {diffModalItem.issue}
              </h3>
              <button 
                onClick={() => setDiffModalItem(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#0B1A2D] rounded-lg border border-[#1E3A5F] text-xs text-slate-300">
              <strong className="text-[#C5A059]">Căn cứ sai lệch:</strong> {diffModalItem.reason}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-bold text-red-400 block mb-1 uppercase tracking-wider">
                  Nguyên văn bản thảo hợp đồng:
                </span>
                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-lg text-red-300 font-serif whitespace-pre-wrap leading-relaxed">
                  {diffModalItem.original}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-emerald-400 block mb-1 uppercase tracking-wider">
                  Đề xuất sửa đổi (Track Changes):
                </span>
                <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-lg text-emerald-300 font-serif whitespace-pre-wrap leading-relaxed font-semibold">
                  {diffModalItem.suggestion}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDiffModalItem(null)}
                className="bg-[#1E3A5F] hover:bg-[#2A4D7A] text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}