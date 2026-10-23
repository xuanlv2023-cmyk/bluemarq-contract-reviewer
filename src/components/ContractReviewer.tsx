import React, { useState, useRef, useEffect } from 'react';
import { 
  Scale, FileText, Building, Stamp, CheckCircle2, AlertCircle, 
  Loader2, Search, ArrowRight, XCircle, Info, UploadCloud, X, 
  File, Plus, FileSymlink, FileArchive, FileImage, Settings, Key, Check, DownloadCloud,
  Calculator, CheckSquare, Square, Filter, FileSpreadsheet, Eye, Printer, Trash2,
  UserCheck, RefreshCw, ChevronDown, ChevronUp, Layers, Copy
} from 'lucide-react';
import { cn } from '../utils';
import { processFile, ProcessedDoc } from '../lib/file-extractor';
import { buildContractAuditPrompt } from '../lib/gemini-prompts';
import { downloadTrackedDocx, FindingToApply, DEPT_TITLE_MAP } from '../lib/docx-track-changes';
import { downloadAuditReport, AuditReportData } from '../lib/report-generator';
import { executeContractReview, AVAILABLE_MODELS, formatGeminiErrorMessage } from '../lib/gemini-service';

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
  onDeleteRow?: () => void;
  required?: boolean;
  accept?: string;
  editableTitle?: boolean;
  onTitleChange?: (newTitle: string) => void;
}

function CompactUploadRow({ 
  title, icon, description, file, processedDoc, onFileSelect, onRemove, onDeleteRow, required, accept, editableTitle, onTitleChange 
}: CompactUploadRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-[#1E3A5F]/70 last:border-0 gap-3 hover:bg-[#1A2F4C]/50 transition-colors px-2.5 rounded-lg group">
      <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
        <div className="mt-0.5 p-2 bg-[#0B1A2D] rounded-lg text-[#C5A059] shadow-sm border border-[#1E3A5F] shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {editableTitle && onTitleChange ? (
            <div className="flex items-center gap-1.5 w-full">
              <input 
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Nhập tên tài liệu..."
                className="bg-[#0B1A2D] border border-[#1E3A5F] focus:border-[#C5A059] rounded px-2 py-0.5 text-xs font-semibold text-slate-100 w-full max-w-[240px] focus:outline-none transition-colors"
                title="Bấm vào để đổi tên tài liệu này"
              />
              <span className="text-[10px] text-[#C5A059] italic shrink-0">(Sửa tên)</span>
            </div>
          ) : (
            <h3 className="font-semibold text-slate-200 text-sm flex items-center leading-normal">
              {title} {required && <span className="text-[#C5A059] ml-1 font-bold">*</span>}
            </h3>
          )}
          <p className="text-[12px] text-slate-400 mt-0.5 truncate">{description}</p>
          {processedDoc?.summary && (
            <p className="text-[11px] text-[#C5A059] mt-0.5 font-medium truncate flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> {processedDoc.summary}
            </p>
          )}
        </div>
      </div>

      <div className="w-full sm:w-auto sm:max-w-[46%] flex-shrink-0 flex items-center justify-start sm:justify-end gap-1.5 min-w-0">
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
            {onDeleteRow && (
              <button
                type="button"
                onClick={onDeleteRow}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors border border-transparent hover:border-red-900/40"
                title="Xóa dòng tài liệu này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
            {onDeleteRow && (
              <button
                type="button"
                onClick={onDeleteRow}
                className="p-1 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-md transition-colors shrink-0"
                title="Xóa hẳn dòng này"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
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

  // Bên Giao thầu (Bên A)
  const [dkkdGiaoThauFile, setDkkdGiaoThauFile] = useState<File | null>(null);
  const [dkkdGiaoThauDoc, setDkkdGiaoThauDoc] = useState<ProcessedDoc | null>(null);

  const [uyQuyenGiaoThauFile, setUyQuyenGiaoThauFile] = useState<File | null>(null);
  const [uyQuyenGiaoThauDoc, setUyQuyenGiaoThauDoc] = useState<ProcessedDoc | null>(null);

  // Bên Nhận thầu (Bên B)
  const [dkkdNhanThauFile, setDkkdNhanThauFile] = useState<File | null>(null);
  const [dkkdNhanThauDoc, setDkkdNhanThauDoc] = useState<ProcessedDoc | null>(null);

  const [uyQuyenNhanThauFile, setUyQuyenNhanThauFile] = useState<File | null>(null);
  const [uyQuyenNhanThauDoc, setUyQuyenNhanThauDoc] = useState<ProcessedDoc | null>(null);

  const [boqFile, setBoqFile] = useState<File | null>(null);
  const [boqDoc, setBoqDoc] = useState<ProcessedDoc | null>(null);

  const [extraFiles, setExtraFiles] = useState<{ id: string; title: string; file: File | null; doc: ProcessedDoc | null }[]>([]);

  const [hopDongFile, setHopDongFile] = useState<File | null>(null);
  const [hopDongDoc, setHopDongDoc] = useState<ProcessedDoc | null>(null);

  // Trạng thái xử lý
  const [findings, setFindings] = useState<FindingWithSelection[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Ý kiến phê duyệt đề xuất (cho BPM)
  const [approvalNote, setApprovalNote] = useState<string>('');
  const [copiedNote, setCopiedNote] = useState(false);
  const [conclusionType, setConclusionType] = useState<'conditional' | 'approved' | 'rejected'>('conditional');

  // Bộ lọc & Tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Cấu hình người dùng & Model
  const [reviewerName, setReviewerName] = useState(() => localStorage.getItem('bmq_reviewer_name') || 'xuanlv');
  const [reviewerDepartment, setReviewerDepartment] = useState<string>(() => localStorage.getItem('bmq_reviewer_department') || 'legal');
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [selectedEngine, setSelectedEngine] = useState<'auto' | 'gemini' | 'chatgpt' | 'claude'>(() => {
    return (localStorage.getItem('bmq_selected_engine') as any) || 'auto';
  });
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('bmq_gemini_api_key') || '');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Modal xem chi tiết so sánh
  const [diffModalItem, setDiffModalItem] = useState<FindingWithSelection | null>(null);

  // Lưu tên và phòng ban người soát xét vào localStorage
  useEffect(() => {
    localStorage.setItem('bmq_reviewer_name', reviewerName);
  }, [reviewerName]);

  useEffect(() => {
    localStorage.setItem('bmq_reviewer_department', reviewerDepartment);
  }, [reviewerDepartment]);

  useEffect(() => {
    localStorage.setItem('bmq_selected_engine', selectedEngine);
  }, [selectedEngine]);

  const toggleDeptCollapse = (deptKey: string) => {
    setCollapsedDepts(prev => ({ ...prev, [deptKey]: !prev[deptKey] }));
  };

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
      else if (type === 'dkkd_giaothau') { setDkkdGiaoThauFile(file); setDkkdGiaoThauDoc(processed); }
      else if (type === 'dkkd_nhanthau') { setDkkdNhanThauFile(file); setDkkdNhanThauDoc(processed); }
      else if (type === 'uyquyen_giaothau') { setUyQuyenGiaoThauFile(file); setUyQuyenGiaoThauDoc(processed); }
      else if (type === 'uyquyen_nhanthau') { setUyQuyenNhanThauFile(file); setUyQuyenNhanThauDoc(processed); }
      else if (type === 'boq') { setBoqFile(file); setBoqDoc(processed); }
      else if (type === 'hopdong') { setHopDongFile(file); setHopDongDoc(processed); }
    } catch (e: any) {
      setError(`Lỗi đọc tệp ${file.name}: ${e.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const addExtraFile = () => {
    const nextIdx = extraFiles.length + 1;
    setExtraFiles([...extraFiles, { 
      id: Math.random().toString(36).substring(7), 
      title: `Tài liệu bổ trợ ${nextIdx}`, 
      file: null, 
      doc: null 
    }]);
  };

  const updateExtraFile = async (id: string, file: File) => {
    try {
      const doc = await processFile(file);
      setExtraFiles(prev => prev.map(item => {
        if (item.id === id) {
          const autoTitle = item.title.startsWith('Tài liệu bổ trợ')
            ? file.name.replace(/\.[^/.]+$/, "")
            : item.title;
          return { ...item, file, doc, title: autoTitle };
        }
        return item;
      }));
    } catch (e: any) {
      setError(`Lỗi đọc tệp bổ trợ: ${e.message}`);
    }
  };

  const updateExtraFileTitle = (id: string, newTitle: string) => {
    setExtraFiles(prev => prev.map(item => item.id === id ? { ...item, title: newTitle } : item));
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
      checkAndPushMedia(dkkdGiaoThauDoc, 'Giấy phép ĐKKD bên Giao thầu');
      checkAndPushMedia(dkkdNhanThauDoc, 'Giấy phép ĐKKD bên Nhận thầu');
      checkAndPushMedia(uyQuyenGiaoThauDoc, 'Giấy ủy quyền bên Giao thầu');
      checkAndPushMedia(uyQuyenNhanThauDoc, 'Giấy ủy quyền bên Nhận thầu');

      // ĐẨY TẤT CẢ TÀI LIỆU BỔ TRỢ (PDF / Ảnh scan) VÀO MEDIAFILES CHO GEMINI ĐỌC
      extraFiles.forEach((item, idx) => {
        if (item.doc) {
          const docTitle = item.title || `Tài liệu bổ trợ ${idx + 1}`;
          checkAndPushMedia(item.doc, `${docTitle} (${item.file?.name || 'Văn bản bổ sung'})`);
        }
      });

      // BƯỚC 3: Xây dựng Prompt đối chiếu ma trận kết hợp tài liệu bổ trợ
      setLoadingStep('Đang tổng hợp dữ liệu Tờ trình, ĐKKD 2 bên, BOQ và các văn bản bổ trợ...');
      const extraDocsSummary = extraFiles
        .map((f, i) => {
          const docTitle = f.title || `Tài liệu bổ trợ ${i + 1}`;
          const fileName = f.file?.name || `Tệp ${i + 1}`;
          if (f.doc?.textContent && f.doc.textContent.trim()) {
            return `[VĂN BẢN ĐIỀU CHỈNH / TÀI LIỆU BỔ TRỢ: ${docTitle} (Tệp: ${fileName})]:\n${f.doc.textContent}`;
          } else if (f.doc?.base64Data) {
            return `[VĂN BẢN ĐIỀU CHỈNH / TÀI LIỆU BỔ TRỢ: ${docTitle} (Tệp: ${fileName}) - Tệp PDF/ảnh scan đính kèm trực tiếp trong payload Gemini Multimodal để rà soát đối chiếu ưu tiên]`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n\n');

      const prompt = buildContractAuditPrompt({
        toTrinhText: toTrinhDoc?.textContent || (toTrinhDoc?.base64Data ? '[Tài liệu Tờ trình dạng PDF scan đính kèm]' : undefined),
        dkkdGiaoThauText: dkkdGiaoThauDoc?.textContent || (dkkdGiaoThauDoc?.base64Data ? '[Giấy phép ĐKKD bên Giao thầu dạng PDF/ảnh scan đính kèm]' : undefined),
        dkkdNhanThauText: dkkdNhanThauDoc?.textContent || (dkkdNhanThauDoc?.base64Data ? '[Giấy phép ĐKKD bên Nhận thầu dạng PDF/ảnh scan đính kèm]' : undefined),
        uyQuyenGiaoThauText: uyQuyenGiaoThauDoc?.textContent || (uyQuyenGiaoThauDoc?.base64Data ? '[Giấy ủy quyền bên Giao thầu dạng PDF/ảnh scan đính kèm]' : undefined),
        uyQuyenNhanThauText: uyQuyenNhanThauDoc?.textContent || (uyQuyenNhanThauDoc?.base64Data ? '[Giấy ủy quyền bên Nhận thầu dạng PDF/ảnh scan đính kèm]' : undefined),
        boqText: boqDoc?.textContent,
        extraDocsText: extraDocsSummary || undefined,
        hopDongText: contractText,
        reviewerName,
      });

      // BƯỚC 4: Gửi yêu cầu Soát xét AI tự động với cơ chế xoay nền tảng & xoay key
      const engineName = selectedEngine === 'auto' ? 'Tự Động Thông Minh (Xoay Nền tảng & Key)' : selectedEngine === 'chatgpt' ? 'OpenAI ChatGPT' : selectedEngine === 'claude' ? 'Anthropic Claude' : 'Google Gemini';
      setLoadingStep(`BLUEMARQ AI Engine (${engineName}) đang phân tích toàn diện ma trận hợp đồng...`);
      
      const rawFindings = await executeContractReview(
        {
          prompt,
          mediaFiles,
          apiKey: apiKey || undefined,
          engine: selectedEngine,
        },
        (statusMsg) => {
          setLoadingStep(statusMsg);
        }
      );
      // Khởi tạo trạng thái mặc định: phân loại theo 5 phòng ban và Track Change vs Chỉ Comment
      const formattedFindings: FindingWithSelection[] = rawFindings.map((f, idx) => {
        const dept = f.department || 'legal';
        const deptName = f.departmentName || (
          dept === 'accounting' ? 'Phòng Kế Toán' :
          dept === 'cost_qs' ? 'Phòng QLCP & Khối Lượng' :
          dept === 'procurement' ? 'Ban Chọn Thầu - Cung Ứng' :
          dept === 'pm_site' ? 'Ban Điều Hành Dự Án' : 'Ban Pháp Chế'
        );

        return {
          id: f.id || idx + 1,
          department: dept,
          departmentName: deptName,
          criterion: f.criterion || 'Đối chiếu ma trận',
          issue: f.issue || 'Vấn đề cần sửa đổi',
          original: f.original || '',
          suggestion: f.suggestion || '',
          reason: f.reason || 'Đối chiếu với tài liệu căn cứ',
          severity: f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
          category: f.category || 'financial_boq',
          actionType: f.actionType === 'comment_only' ? 'comment_only' : 'track_change',
          accepted: true,
        };
      });

      setFindings(formattedFindings);

      // Kiểm tra xem có nội dung nào chưa có trong Tờ trình phê duyệt hay không
      const hasUnapprovedTerms = formattedFindings.some(f => 
        f.category === 'submission_mismatch' || 
        (f.issue && f.issue.toLowerCase().includes('chưa có trong tờ trình')) ||
        (f.reason && f.reason.toLowerCase().includes('chưa có trong tờ trình'))
      );
      const defaultConclusion = hasUnapprovedTerms ? 'rejected' : 'conditional';
      setConclusionType(defaultConclusion);
      setApprovalNote(buildApprovalNote(formattedFindings, defaultConclusion));
    } catch (err: any) {
      console.error(err);
      setError(formatGeminiErrorMessage(err.message || err));
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Tạo nội dung ý kiến phê duyệt BPM ngắn gọn (vài gạch đầu dòng + kết luận)
  const buildApprovalNote = (items: FindingWithSelection[], type: 'conditional' | 'approved' | 'rejected' = 'conditional') => {
    const activeItems = (items || []).filter(f => f.accepted !== false);
    const lines: string[] = [];
    
    if (activeItems.length > 0) {
      // Chỉ lấy 3-5 ý kiến cốt lõi nhất, ngắn gọn không rườm rà
      activeItems.slice(0, 5).forEach(f => {
        lines.push(`- ${f.issue.trim()}`);
      });
    } else {
      lines.push('- Hồ sơ hợp đồng phù hợp với Tờ trình và các hồ sơ căn cứ được duyệt.');
    }

    if (type === 'conditional') {
      if (activeItems.length > 0) {
        lines.push('- Vui lòng kiểm tra và điều chỉnh theo ý kiến của BP.QLHĐ tại file đính kèm và các phòng ban khác trước khi phát hành.');
        lines.push('- Đồng ý.');
      } else {
        lines.push('- Đồng ý.');
      }
    } else if (type === 'approved') {
      lines.push('- Đồng ý.');
    } else {
      // Trường hợp có nội dung chưa có trong Tờ trình hoặc sai phạm: Bắt buộc trình xin Ban TGĐ phê duyệt bổ sung
      lines.push('- Yêu cầu Người trình tiến hành lập Tờ trình xin Ban TGĐ phê duyệt bổ sung hoặc điều chỉnh đối với các nội dung chưa có trong Tờ trình trước khi ký phát hành.');
      lines.push('- Không đồng ý.');
    }

    return lines.join('\n');
  };

  const applyConclusion = (type: 'conditional' | 'approved' | 'rejected') => {
    setConclusionType(type);
    if (findings) {
      setApprovalNote(buildApprovalNote(findings, type));
    }
  };

  const handleCopyApprovalNote = () => {
    if (!approvalNote) return;
    navigator.clipboard.writeText(approvalNote);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2500);
  };

  // Toggle chấp nhận / bỏ qua sửa đổi cho 1 finding
  const toggleFindingAccepted = (id: number) => {
    if (!findings) return;
    setFindings(findings.map(f => f.id === id ? { ...f, accepted: !f.accepted } : f));
  };

  // Chuyển đổi linh hoạt giữa Track Change trực tiếp và Chỉ chèn Comment
  const toggleActionType = (id: number) => {
    if (!findings) return;
    setFindings(findings.map(f => f.id === id ? {
      ...f,
      actionType: f.actionType === 'comment_only' ? 'track_change' : 'comment_only'
    } : f));
  };

  // Chọn tất cả hoặc bỏ chọn tất cả
  const toggleSelectAll = (select: boolean) => {
    if (!findings) return;
    setFindings(findings.map(f => ({ ...f, accepted: select })));
  };

  // Tải xuống file Word có Track Changes & Comments đầy đủ toàn diện
  const handleDownloadDocx = async (scope: 'all' | 'my_department' = 'all') => {
    if (!hopDongFile || !findings) return;
    try {
      const deptTitle = DEPT_TITLE_MAP[reviewerDepartment] || 'Ban Pháp Chế';
      const outputName = hopDongFile.name.replace(/\.docx$/i, '') + `_Da_Soat_Xet_${reviewerName.replace(/\s+/g, '_')}_${deptTitle.replace(/\s+/g, '_')}.docx`;
      
      const applied = await downloadTrackedDocx(
        hopDongFile, 
        findings, 
        reviewerName, 
        reviewerDepartment, 
        scope, 
        outputName
      );

      const targetFindings = scope === 'my_department' 
        ? findings.filter(f => f.accepted && (f.department || 'legal') === reviewerDepartment)
        : findings.filter(f => f.accepted);
      const trackCount = targetFindings.filter(f => f.actionType !== 'comment_only').length;
      const commentCount = targetFindings.filter(f => f.actionType === 'comment_only').length;

      alert(`Đã xuất thành công file Word đã soát xét!\n• Tác giả: ${reviewerName} (${deptTitle})\n• ${trackCount} nội dung gạch sửa trực tiếp (Track Changes)\n• ${commentCount} ý kiến đề xuất gắn bóng Comment bên lề.\n• Tệp lưu: ${outputName}`);
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
    if (dkkdGiaoThauFile) baseDocsList.push({ title: 'ĐKKD bên Giao thầu', fileName: dkkdGiaoThauFile.name, type: dkkdGiaoThauDoc?.fileType || 'pháp lý' });
    if (dkkdNhanThauFile) baseDocsList.push({ title: 'ĐKKD bên Nhận thầu', fileName: dkkdNhanThauFile.name, type: dkkdNhanThauDoc?.fileType || 'pháp lý' });
    if (uyQuyenGiaoThauFile) baseDocsList.push({ title: 'Giấy ủy quyền bên Giao thầu', fileName: uyQuyenGiaoThauFile.name, type: uyQuyenGiaoThauDoc?.fileType || 'ủy quyền' });
    if (uyQuyenNhanThauFile) baseDocsList.push({ title: 'Giấy ủy quyền bên Nhận thầu', fileName: uyQuyenNhanThauFile.name, type: uyQuyenNhanThauDoc?.fileType || 'ủy quyền' });
    if (boqFile) baseDocsList.push({ title: 'Bảng BOQ / Dự toán', fileName: boqFile.name, type: 'Bảng tính Excel' });
    extraFiles.forEach((ef, idx) => {
      if (ef.file) baseDocsList.push({ title: ef.title || `Tài liệu bổ trợ ${idx + 1}`, fileName: ef.file.name, type: 'văn bản bổ trợ' });
    });

    const reportData: AuditReportData = {
      contractName: hopDongFile.name,
      reviewerName: reviewerName || 'Ban Pháp Chế',
      reviewDate: new Date().toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' }),
      baseDocuments: baseDocsList,
      findings,
      approvalNote,
    };

    downloadAuditReport(reportData, `Bien_Ban_Soat_Xet_${hopDongFile.name.replace(/\.docx$/i, '')}.html`);
  };

  // Lọc danh sách phát hiện
  const filteredFindings = (findings || []).filter(item => {
    if (departmentFilter !== 'all' && (item.department || 'legal') !== departmentFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchIssue = item.issue.toLowerCase().includes(q);
      const matchOrig = item.original.toLowerCase().includes(q);
      const matchSugg = item.suggestion.toLowerCase().includes(q);
      const matchReason = item.reason.toLowerCase().includes(q);
      const matchCrit = (item.criterion || '').toLowerCase().includes(q);
      const matchDept = (item.departmentName || '').toLowerCase().includes(q);
      if (!matchIssue && !matchOrig && !matchSugg && !matchReason && !matchCrit && !matchDept) return false;
    }
    return true;
  });

  const acceptedCount = (findings || []).filter(f => f.accepted).length;

  return (
    <div className="h-screen w-full flex flex-col bg-[#0B1A2D] text-slate-300 font-sans selection:bg-[#C5A059]/30 selection:text-[#C5A059] overflow-hidden">
      
      {/* HEADER BLUEMARQ */}
      <header className="bg-[#13253F] border-b border-[#1E3A5F] z-30 shadow-lg backdrop-blur-md shrink-0">
        <div className="max-w-[1780px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex flex-col justify-center shrink-0 select-none pt-0.5">
              <div className="text-[#C5A059] font-bold text-[24px] sm:text-[28px] leading-none tracking-normal font-serif">
                BLUEMARQ
              </div>
              <div className="text-[#C5A059] text-[9px] sm:text-[10px] leading-none tracking-[0.45em] font-medium text-center mt-0.5 ml-1">
                GROUP
              </div>
            </div>
            <div className="h-6 w-px bg-[#1E3A5F]"></div>
            <h1 className="font-light text-[12px] sm:text-[13px] text-slate-300 tracking-wide uppercase hidden sm:block">
              Hệ Thống Pháp Chế AI <span className="font-medium text-[#C5A059] mx-1">|</span> Soát xét Hợp đồng Online
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Lựa chọn Động cơ AI (Tự động xoay nền tảng & Key) */}
            <div className="flex items-center gap-2 bg-[#0B1A2D] border border-[#1E3A5F] rounded-lg px-2.5 py-1 text-xs text-slate-300">
              <span className="text-slate-400">Động cơ:</span>
              <select 
                value={selectedEngine} 
                onChange={(e) => setSelectedEngine(e.target.value as any)}
                className="bg-transparent text-[#C5A059] font-bold focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-[#13253F] text-[#C5A059] font-bold">⚡ Tự động (Tự xoay nền tảng & Key)</option>
                <option value="gemini" className="bg-[#13253F] text-slate-200">Google Gemini</option>
                <option value="chatgpt" className="bg-[#13253F] text-slate-200">OpenAI ChatGPT</option>
                <option value="claude" className="bg-[#13253F] text-slate-200">Anthropic Claude</option>
              </select>
            </div>

            {/* Nút Cài đặt ẩn/tùy chọn */}
            <button
              onClick={() => setShowConfigModal(true)}
              className="p-1.5 text-slate-500 hover:text-[#C5A059] transition-colors rounded-lg hover:bg-[#0B1A2D]"
              title="Cài đặt hệ thống"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* Trạng thái hệ thống */}
            <div className="flex items-center gap-1.5 border border-[#1E3A5F] bg-[#0B1A2D] rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-medium shadow-sm">
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sẵn sàng</span>
            </div>
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH (Fixed Viewport Layout on Desktop with Independent Scrollbars) */}
      <main className="max-w-[1780px] w-full mx-auto px-3 sm:px-6 py-3 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 flex-1 min-h-0 h-full">
          
          {/* ==================== CỘT TRÁI: 42% TÀI LIỆU CĂN CỨ & BẢN THẢO ==================== */}
          <div className="w-full lg:w-[42%] flex flex-col h-full bg-[#13253F] rounded-xl shadow-xl border border-[#1E3A5F] overflow-hidden">
            
            {/* Header Cột Trái: Cố định ở đỉnh */}
            <div className="px-4 sm:px-5 py-3 border-b border-[#1E3A5F] bg-[#13253F] flex items-center justify-between shrink-0">
              <h2 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
                <Stamp className="w-4 h-4 text-[#C5A059]" />
                Hồ Sơ Căn Cứ & Bản Thảo
              </h2>
              <span className="text-[10px] bg-[#0B1A2D] border border-[#1E3A5F] text-[#C5A059] px-2 py-0.5 rounded font-mono">
                Đối chiếu Ma trận
              </span>
            </div>

            {/* KHỐI CỐ ĐỊNH PINNED: THÔNG TIN NGƯỜI SOÁT XÉT & PHÒNG BAN TRỰC THUỘC (LUÔN CỐ ĐỊNH TRÊN ĐỈNH, KHÔNG BỊ CUỘN MẤT) */}
            <div className="p-3 bg-[#0E1F35] border-b border-[#1E3A5F] shrink-0 space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between mb-0.5">
                <label htmlFor="leftReviewerInput" className="text-xs font-bold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                  Người soát xét & Phòng ban trực thuộc
                </label>
                <span className="text-[10px] bg-[#13253F] border border-[#1E3A5F] text-[#C5A059] px-2 py-0.5 rounded font-mono">
                  Tác giả Word
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  id="leftReviewerInput"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Họ và tên người soát xét..."
                  className="w-full bg-[#13253F] border border-[#1E3A5F] focus:border-[#C5A059] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors"
                />

                <select
                  value={reviewerDepartment}
                  onChange={(e) => setReviewerDepartment(e.target.value)}
                  className="w-full bg-[#13253F] border border-[#1E3A5F] focus:border-[#C5A059] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none transition-colors font-medium"
                >
                  <option value="legal">🏛️ Ban Pháp Chế</option>
                  <option value="accounting">💰 Phòng Kế Toán</option>
                  <option value="cost_qs">📊 Phòng QLCP & Khối Lượng</option>
                  <option value="procurement">📦 Ban Chọn Thầu - Cung Ứng</option>
                  <option value="pm_site">🏗️ Ban Điều Hành Dự Án</option>
                </select>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-tight">
                Tác giả trong Word: <strong className="text-slate-200">{reviewerName || 'xuanlv'} ({DEPT_TITLE_MAP[reviewerDepartment] || 'Ban Pháp Chế'})</strong>.
              </p>
            </div>

            {/* Danh sách tài liệu: Có THANH CUỘN ĐỘC LẬP */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5">

              {/* CARD 1: CĂN CỨ ĐỐI CHIẾU */}
              <div className="bg-[#0B1A2D]/70 rounded-xl border border-[#1E3A5F] p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> 1. Tài liệu căn cứ đối chiếu
                  </h3>
                  <span className="text-[10px] text-slate-400">Chuẩn pháp lý</span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Tài liệu dùng làm căn cứ kiểm tra chéo (Tờ trình, ĐKKD, BOQ, Giấy ủy quyền).
                </p>

                <div className="flex flex-col space-y-0.5">
                  <CompactUploadRow
                    title="Tờ trình chủ trương / phê duyệt"
                    icon={<FileText className="w-4 h-4" />}
                    description="Giá trị gói thầu, thanh toán, bảo lãnh đã duyệt."
                    file={toTrinhFile}
                    processedDoc={toTrinhDoc}
                    onFileSelect={(f) => handleFileSelect(f, 'totrinh')}
                    onRemove={() => { setToTrinhFile(null); setToTrinhDoc(null); }}
                    accept=".pdf,.docx,.doc,.txt"
                  />
                  
                  <CompactUploadRow
                    title="Giấy phép ĐKKD bên Giao thầu"
                    icon={<Building className="w-4 h-4 text-blue-400" />}
                    description="Tên pháp nhân, mã số thuế, địa chỉ trụ sở, người đại diện (Bên A)."
                    file={dkkdGiaoThauFile}
                    processedDoc={dkkdGiaoThauDoc}
                    onFileSelect={(f) => handleFileSelect(f, 'dkkd_giaothau')}
                    onRemove={() => { setDkkdGiaoThauFile(null); setDkkdGiaoThauDoc(null); }}
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                  />

                  <CompactUploadRow
                    title="Giấy phép ĐKKD bên Nhận thầu"
                    icon={<Building className="w-4 h-4 text-emerald-400" />}
                    description="Tên pháp nhân, mã số thuế, địa chỉ trụ sở, người đại diện (Bên B)."
                    file={dkkdNhanThauFile}
                    processedDoc={dkkdNhanThauDoc}
                    onFileSelect={(f) => handleFileSelect(f, 'dkkd_nhanthau')}
                    onRemove={() => { setDkkdNhanThauFile(null); setDkkdNhanThauDoc(null); }}
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                  />

                  <CompactUploadRow
                    title="Giấy ủy quyền bên Giao thầu"
                    icon={<Stamp className="w-4 h-4 text-blue-400" />}
                    description="Số văn bản, phạm vi ủy quyền, hạn mức và thời hạn hiệu lực (Bên A)."
                    file={uyQuyenGiaoThauFile}
                    processedDoc={uyQuyenGiaoThauDoc}
                    onFileSelect={(f) => handleFileSelect(f, 'uyquyen_giaothau')}
                    onRemove={() => { setUyQuyenGiaoThauFile(null); setUyQuyenGiaoThauDoc(null); }}
                    accept=".pdf,.jpg,.jpeg,.png,.docx"
                  />

                  <CompactUploadRow
                    title="Giấy ủy quyền bên Nhận thầu"
                    icon={<Stamp className="w-4 h-4 text-emerald-400" />}
                    description="Số văn bản, phạm vi ủy quyền, hạn mức và thời hạn hiệu lực (Bên B)."
                    file={uyQuyenNhanThauFile}
                    processedDoc={uyQuyenNhanThauDoc}
                    onFileSelect={(f) => handleFileSelect(f, 'uyquyen_nhanthau')}
                    onRemove={() => { setUyQuyenNhanThauFile(null); setUyQuyenNhanThauDoc(null); }}
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

                  {extraFiles.map((item, index) => (
                    <CompactUploadRow
                      key={item.id}
                      title={item.title || `Tài liệu bổ trợ ${index + 1}`}
                      icon={<File className="w-4 h-4" />}
                      description="Văn bản xin điều chỉnh, phụ lục kỹ thuật hoặc thỏa thuận bổ sung."
                      file={item.file}
                      processedDoc={item.doc}
                      editableTitle
                      onTitleChange={(newTitle) => updateExtraFileTitle(item.id, newTitle)}
                      onFileSelect={(f) => updateExtraFile(item.id, f)}
                      onRemove={() => removeExtraFile(item.id)}
                      onDeleteRow={() => removeExtraFile(item.id)}
                    />
                  ))}

                  <div className="pt-2">
                    <button 
                      type="button"
                      onClick={addExtraFile}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C5A059] hover:text-[#D4AF37] hover:bg-[#0B1A2D] px-2.5 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#1E3A5F]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm tài liệu bổ trợ khác
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 2: BẢN THẢO HỢP ĐỒNG CẦN SOÁT XÉT (ĐỒNG NHẤT VỚI MỤC 1) */}
              <div className="bg-[#0B1A2D]/70 rounded-xl border border-[#1E3A5F] p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#C5A059]" />
                    2. Bản thảo Hợp đồng cần soát xét
                  </h3>
                  <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800/60 px-2 py-0.5 rounded font-bold">
                    Bắt buộc
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Tải lên file Word (.docx) để AI quét và tự động chèn Track Changes.
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
            </div>

            {/* FOOTER CỐ ĐỊNH Ở ĐÁY CỘT TRÁI: NÚT BẮT ĐẦU SOÁT XÉT LUÔN NẰM TRÊN MÀN HÌNH */}
            <div className="p-3.5 bg-[#0E1F35] border-t border-[#1E3A5F] shrink-0 space-y-2">
              {error && (
                <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl flex items-start gap-2.5 shadow-xl text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="font-medium leading-relaxed flex-1 space-y-2">
                    <div>{error}</div>

                    {(error.includes('503') || error.includes('quá tải') || error.includes('bận') || error.includes('demand') || error.includes('UNAVAILABLE') || error.includes('429') || error.includes('Failed to fetch') || error.includes('gián đoạn') || error.includes('Thử lại')) && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={handleReview}
                          disabled={isLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-[#0B1A2D] font-bold text-xs rounded-lg shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                          <span>Thử lại ngay</span>
                        </button>
                      </div>
                    )}

                    {error.includes('GEMINI_API_KEY') && (
                      <button
                        type="button"
                        onClick={() => setShowConfigModal(true)}
                        className="block text-[#C5A059] hover:text-[#D4AF37] underline font-bold transition-colors"
                      >
                        👉 Hoặc bấm vào đây để dán API Key cá nhân dùng ngay
                      </button>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={handleReview}
                disabled={isLoading}
                className={cn(
                  "relative overflow-hidden w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-[#0B1A2D] font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(197,160,89,0.35)] hover:shadow-[0_6px_22px_rgba(197,160,89,0.5)] transition-all flex items-center justify-center gap-2",
                  isLoading && "opacity-85 cursor-not-allowed hover:shadow-none"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="uppercase tracking-wider text-xs">Đang đối chiếu tài liệu...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span className="uppercase tracking-wider text-xs sm:text-sm">Bắt đầu Soát xét Hợp đồng</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ==================== CỘT PHẢI: 58% KẾT QUẢ ĐỐI CHIẾU & TRACK CHANGES ==================== */}
          <div className="w-full lg:w-[58%] flex flex-col h-full bg-[#13253F] rounded-xl shadow-xl border border-[#1E3A5F] overflow-hidden">
            
            {/* Header Cột Phải: Cố định ở đỉnh */}
            <div className="px-5 py-3 border-b border-[#1E3A5F] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-[#13253F] shrink-0">
              <div>
                <h2 className="font-bold text-[#C5A059] text-xs sm:text-sm tracking-tight uppercase font-serif">
                  KẾT QUẢ RÀ SOÁT MA TRẬN 5 PHÒNG BAN BLUEMARQ
                </h2>
                <p className="text-[11px] text-slate-400">
                  Pháp chế • Kế toán • QL Chi phí & BOQ • Chọn thầu • Ban Dự án
                </p>
              </div>

              {findings && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-red-950/60 text-red-400 border border-red-800/60 px-2.5 py-0.5 rounded-full font-bold">
                    {findings.length} Phát hiện
                  </span>
                  <span className="text-xs bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2.5 py-0.5 rounded-full font-bold">
                    {findings.filter(f => f.accepted && f.actionType !== 'comment_only').length} Track Change
                  </span>
                  <span className="text-xs bg-amber-950/60 text-amber-300 border border-amber-800/60 px-2.5 py-0.5 rounded-full font-bold">
                    {findings.filter(f => f.accepted && f.actionType === 'comment_only').length} Chỉ Comment
                  </span>
                </div>
              )}
            </div>

            {/* THANH TAB PHÂN LOẠI 5 PHÒNG BAN CHUYÊN MÔN BLUEMARQ */}
            {findings && findings.length > 0 && (
              <div className="px-4 py-2 bg-[#0B1A2D] border-b border-[#1E3A5F] flex items-center gap-1.5 overflow-x-auto text-xs shrink-0 no-scrollbar">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="w-3 h-3 text-[#C5A059]" /> Bộ phận:
                </span>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'all' 
                      ? "bg-[#C5A059] text-[#0B1A2D] shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  Tất cả ({findings.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('legal')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'legal' 
                      ? "bg-blue-600 text-white shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  🏛️ Pháp chế ({findings.filter(f => (f.department || 'legal') === 'legal').length})
                </button>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('accounting')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'accounting' 
                      ? "bg-emerald-600 text-white shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  💰 Kế toán ({findings.filter(f => f.department === 'accounting').length})
                </button>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('cost_qs')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'cost_qs' 
                      ? "bg-amber-600 text-white shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  📊 QL Chi phí & BOQ ({findings.filter(f => f.department === 'cost_qs').length})
                </button>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('procurement')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'procurement' 
                      ? "bg-purple-600 text-white shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  📦 Chọn thầu ({findings.filter(f => f.department === 'procurement').length})
                </button>

                <button
                  type="button"
                  onClick={() => setDepartmentFilter('pm_site')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all whitespace-nowrap flex items-center gap-1",
                    departmentFilter === 'pm_site' 
                      ? "bg-indigo-600 text-white shadow" 
                      : "bg-[#13253F] text-slate-300 hover:text-white border border-[#1E3A5F]"
                  )}
                >
                  🏗️ Ban Dự án ({findings.filter(f => f.department === 'pm_site').length})
                </button>
              </div>
            )}

            {/* THANH CÔNG CỤ LỌC MỨC ĐỘ & TÌM KIẾM */}
            {findings && findings.length > 0 && (
              <div className="px-5 py-2.5 bg-[#0E1F35] border-b border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
                {/* Ô tìm kiếm */}
                <div className="relative flex-1 min-w-[180px] max-w-[280px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm lỗi, điều khoản, lý do..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#13253F] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1 focus:outline-none focus:border-[#C5A059]"
                  />
                </div>

                {/* Lọc theo mức độ & phân loại */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select 
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="bg-[#13253F] border border-[#1E3A5F] text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-[#C5A059]"
                  >
                    <option value="all">Tất cả mức độ</option>
                    <option value="high">Nghiêm trọng (Đỏ)</option>
                    <option value="medium">Cần lưu ý (Cam)</option>
                    <option value="low">Lỗi nhỏ (Xanh)</option>
                  </select>

                  <button 
                    onClick={() => toggleSelectAll(true)}
                    className="text-xs text-[#C5A059] hover:underline px-1 py-0.5"
                  >
                    Chọn hết
                  </button>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={() => toggleSelectAll(false)}
                    className="text-xs text-slate-400 hover:underline px-1 py-0.5"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}
            
            {/* BODY NỘI DUNG: CÓ THANH CUỘN ĐỘC LẬP */}
            <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto bg-[#0B1A2D] relative">
              
              {/* 1. TRẠNG THÁI ĐANG XỬ LÝ (LOADING) */}
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center text-[#C5A059] min-h-[360px]">
                  <Loader2 className="w-10 h-10 animate-spin mb-3 text-[#C5A059]" />
                  <p className="text-sm font-semibold text-slate-200">{loadingStep || 'Hệ thống đang tiến hành rà soát...'}</p>
                </div>
              ) : findings ? (
                // 2. TRẠNG THÁI ĐÃ CÓ KẾT QUẢ - GOM NHÓM THEO 5 PHÒNG BAN CHUẨN BLUEMARQ
                <div className="space-y-4">
                  {filteredFindings.length === 0 ? (
                    <div className="bg-[#13253F] border border-[#1E3A5F] p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5 shadow-lg">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                      <h3 className="text-base font-bold text-slate-100">
                        {findings.length === 0 ? "Bản thảo hoàn hảo!" : "Không tìm thấy nội dung khớp bộ lọc"}
                      </h3>
                      <p className="text-slate-400 text-xs max-w-md">
                        {findings.length === 0 
                          ? "Không phát hiện sai lệch nào giữa bản thảo hợp đồng và các hồ sơ căn cứ." 
                          : "Thử chọn tab 'Tất cả' hoặc đổi từ khóa tìm kiếm."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { 
                          key: 'procurement', 
                          title: 'Ban Chọn Thầu - Cung Ứng', 
                          icon: '📦', 
                          standardCriteria: '13 tiêu chí: Mẫu HĐ, đối tượng gói thầu, chủng loại vật tư, điều kiện thương mại' 
                        },
                        { 
                          key: 'cost_qs', 
                          title: 'Phòng Quản Lý Chi Phí & Khối Lượng (QS)', 
                          icon: '📊', 
                          standardCriteria: '13 tiêu chí: BOQ dự toán, đơn giá, tiến độ thi công, bảo lãnh tạm ứng' 
                        },
                        { 
                          key: 'pm_site', 
                          title: 'Ban Điều Hành Dự Án', 
                          icon: '🏗️', 
                          standardCriteria: 'Hiện trường, an toàn lao động HSE, tiêu chuẩn nghiệm thu sản phẩm' 
                        },
                        { 
                          key: 'accounting', 
                          title: 'Phòng Kế Toán', 
                          icon: '💰', 
                          standardCriteria: '6 tiêu chí: Bản chất tạm ứng/tiền cọc, hóa đơn VAT, chứng từ giải ngân' 
                        },
                        { 
                          key: 'legal', 
                          title: 'Ban Pháp Chế', 
                          icon: '🏛️', 
                          standardCriteria: '14 tiêu chí: ĐKKD 2 bên, ủy quyền, thẩm quyền, phạt 8%, tranh chấp, bảo mật' 
                        },
                      ]
                        .filter(dept => departmentFilter === 'all' || departmentFilter === dept.key)
                        .map(dept => {
                          const deptItems = filteredFindings.filter(f => (f.department || 'legal') === dept.key);
                          const isCollapsed = collapsedDepts[dept.key] === true;
                          const hasIssues = deptItems.length > 0;
                          const trackInDept = deptItems.filter(f => f.actionType !== 'comment_only').length;
                          const commentInDept = deptItems.filter(f => f.actionType === 'comment_only').length;

                          return (
                            <div 
                              key={dept.key}
                              className="bg-[#13253F] rounded-xl border border-[#1E3A5F] overflow-hidden shadow-md"
                            >
                              {/* Header Accordion Phòng Ban */}
                              <div 
                                onClick={() => toggleDeptCollapse(dept.key)}
                                className="px-4 py-3 bg-[#10223A] border-b border-[#1E3A5F] flex items-center justify-between cursor-pointer hover:bg-[#162C4B] transition-colors select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base shrink-0">{dept.icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-xs sm:text-sm font-bold text-slate-100 uppercase tracking-wide">
                                        {dept.title}
                                      </h3>
                                      <span className="text-xs text-slate-400 font-mono">
                                        ({deptItems.length} phát hiện{hasIssues ? `: ${trackInDept} Track, ${commentInDept} Comment` : ''})
                                      </span>
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 truncate hidden sm:block">
                                      {dept.standardCriteria}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={cn(
                                    "px-2.5 py-0.5 rounded text-[10px] font-bold border",
                                    !hasIssues 
                                      ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/60" 
                                      : "bg-red-950/70 text-red-300 border-red-800/60"
                                  )}>
                                    {!hasIssues ? '✓ Đạt / Đồng ý' : `⚠️ Cần điều chỉnh (${deptItems.length})`}
                                  </span>

                                  <button type="button" className="text-slate-400 hover:text-white p-1">
                                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                                  </button>
                                </div>
                              </div>

                              {/* Danh sách các phát hiện bên trong phòng ban này */}
                              {!isCollapsed && (
                                <div className="p-3 sm:p-3.5 space-y-3 bg-[#0B1A2D]/60">
                                  {deptItems.length === 0 ? (
                                    <div className="p-3 bg-[#13253F]/40 border border-[#1E3A5F]/50 rounded-lg text-xs text-slate-400 italic flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                      <span>Không phát hiện sai lệch nào thuộc thẩm quyền của {dept.title}. Nội dung hợp đồng phù hợp.</span>
                                    </div>
                                  ) : (
                                    deptItems.map((item, idx) => {
                                      const isHigh = item.severity === 'high';
                                      const isMed = item.severity === 'medium';
                                      const riskBadgeClass = isHigh 
                                        ? 'text-red-400 bg-red-950/60 border-red-700/60' 
                                        : isMed 
                                          ? 'text-orange-400 bg-orange-950/60 border-orange-700/60' 
                                          : 'text-blue-400 bg-blue-950/60 border-blue-700/60';

                                      return (
                                        <div 
                                          key={item.id}
                                          className={cn(
                                            "bg-[#13253F] rounded-lg border transition-all duration-200 overflow-hidden",
                                            item.accepted ? "border-[#1E3A5F] hover:border-[#C5A059]/60" : "border-slate-800 opacity-60"
                                          )}
                                        >
                                          {/* Card Top Header */}
                                          <div className="px-3 py-2 bg-[#10223A] border-b border-[#1E3A5F] flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                  onClick={() => toggleFindingAccepted(item.id)}
                                                  className="text-slate-400 hover:text-[#C5A059] transition-colors shrink-0"
                                                  title={item.accepted ? "Nhấn để bỏ qua phát hiện này" : "Nhấn để áp dụng"}
                                                >
                                                  {item.accepted ? (
                                                    <CheckSquare className="w-4 h-4 text-[#C5A059]" />
                                                  ) : (
                                                    <Square className="w-4 h-4" />
                                                  )}
                                                </button>

                                                <span className="text-xs font-mono font-bold text-slate-400">
                                                  #{idx + 1}
                                                </span>

                                                {(item.page || item.clause) && (
                                                  <span className="text-[10px] text-[#C5A059] bg-[#C5A059]/15 px-2 py-0.5 rounded border border-[#C5A059]/40 font-bold inline-flex items-center gap-1 shadow-sm">
                                                    📍 {item.page ? `Trang ${item.page}` : ''} {item.clause ? `(${item.clause})` : ''}
                                                  </span>
                                                )}

                                                {item.criterion && (
                                                  <span className="text-[10px] text-slate-300 bg-[#0B1A2D] px-2 py-0.5 rounded border border-[#1E3A5F] font-medium">
                                                    Tiêu chí: <strong>{item.criterion}</strong>
                                                  </span>
                                                )}

                                                <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border", riskBadgeClass)}>
                                                  {isHigh ? 'Nghiêm trọng' : isMed ? 'Cần lưu ý' : 'Lỗi nhỏ'}
                                                </span>

                                                {item.actionType === 'comment_only' ? (
                                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#0B1A2D] text-slate-300 border border-slate-700/60 font-medium inline-flex items-center gap-1">
                                                    💬 Chỉ Comment
                                                  </span>
                                                ) : (
                                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#0B1A2D] text-[#C5A059] border border-[#C5A059]/40 font-medium inline-flex items-center gap-1">
                                                    ✍️ Sửa trực tiếp (Track)
                                                  </span>
                                                )}

                                                <button
                                                  type="button"
                                                  onClick={() => toggleActionType(item.id)}
                                                  className="text-[10px] text-slate-400 hover:text-[#C5A059] underline font-medium"
                                                  title="Nhấn để đổi cách xử lý trong file Word"
                                                >
                                                  [{item.actionType === 'comment_only' ? 'Đổi sang Track' : 'Đổi sang Comment'}]
                                                </button>
                                              </div>

                                              <button
                                                onClick={() => setDiffModalItem(item)}
                                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-[#C5A059] px-2 py-0.5 rounded bg-[#0B1A2D] border border-[#1E3A5F] shrink-0"
                                              >
                                                <Eye className="w-3 h-3" />
                                                So sánh
                                              </button>
                                            </div>

                                            <h4 className="font-bold text-slate-100 text-xs sm:text-sm pl-6">
                                              {item.issue}
                                            </h4>
                                          </div>

                                          {/* Lý do & Căn cứ kiểm soát */}
                                          <div className="px-3 py-1.5 bg-[#0B1A2D] border-b border-[#1E3A5F] flex items-start gap-1.5 text-[11px] text-slate-300">
                                            <Info className="w-3.5 h-3.5 text-[#C5A059] shrink-0 mt-0.5" />
                                            <span>
                                              <strong className="text-[#C5A059]">Căn cứ đối chiếu:</strong> {item.reason}
                                            </span>
                                          </div>

                                          {/* So sánh Đoạn gốc vs Đề xuất sửa */}
                                          {item.actionType === 'comment_only' ? (
                                            <div className="p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2.5 bg-[#0B1A2D]/50 text-xs">
                                              <div className="flex-1 space-y-1">
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Văn bản gốc trong hợp đồng (Giữ nguyên)
                                                </div>
                                                <div className="p-2.5 bg-[#0A1626] rounded-lg border border-slate-700/60 shadow-inner">
                                                  <p className="text-slate-100 font-serif text-[12px] leading-relaxed whitespace-pre-wrap">
                                                    {item.original}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="hidden sm:flex flex-col items-center justify-center text-slate-500">
                                                <ArrowRight className="w-3.5 h-3.5" />
                                              </div>

                                              <div className="flex-1 space-y-1">
                                                <div className="text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                                                  <Info className="w-3.5 h-3.5 text-[#C5A059]" /> Ý kiến kiến nghị / Đề xuất (Chèn Comment)
                                                </div>
                                                <div className="p-2.5 bg-[#13253F] rounded-lg border border-[#C5A059]/40 shadow-sm">
                                                  <p className="text-[#E2C785] font-serif text-[12px] leading-relaxed whitespace-pre-wrap">
                                                    {item.suggestion}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2.5 bg-[#0B1A2D]/50 text-xs">
                                              <div className="flex-1 space-y-1">
                                                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Văn bản gốc trong hợp đồng
                                                </div>
                                                <div className="p-2.5 bg-[#0A1626] rounded-lg border border-slate-700/60 shadow-inner">
                                                  <p className="text-slate-100 font-serif text-[12px] leading-relaxed line-through decoration-slate-400/80 whitespace-pre-wrap">
                                                    {item.original}
                                                  </p>
                                                </div>
                                              </div>

                                              <div className="hidden sm:flex flex-col items-center justify-center text-slate-500">
                                                <ArrowRight className="w-3.5 h-3.5" />
                                              </div>

                                              <div className="flex-1 space-y-1">
                                                <div className="text-[10px] font-semibold text-[#C5A059] uppercase tracking-wider flex items-center gap-1.5">
                                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C5A059]" /> Đề xuất điều chỉnh chuẩn (Sẽ chèn Track)
                                                </div>
                                                <div className="p-2.5 bg-[#13253F] rounded-lg border border-[#C5A059]/40 shadow-sm">
                                                  <p className="text-[#E2C785] font-serif text-[12px] leading-relaxed font-medium whitespace-pre-wrap">
                                                    {item.suggestion}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* KHỐI Ý KIẾN PHÊ DUYỆT ĐỀ XUẤT (DÙNG CHO TỜ TRÌNH / HỆ THỐNG BPM) */}
                  <div className="bg-[#10223A] rounded-xl border border-[#C5A059]/40 p-4 shadow-xl space-y-3 mt-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base">📝</span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                            <span>Ý Kiến Phê Duyệt Đề Xuất</span>
                            <span className="text-[10px] bg-[#C5A059]/20 text-[#C5A059] px-1.5 py-0.5 rounded border border-[#C5A059]/40 font-normal">
                              Dùng cho ô "Nội dung phê duyệt" trên BPM
                            </span>
                          </h4>
                          <p className="text-[10.5px] text-slate-400">
                            Vài gạch đầu dòng ngắn gọn theo đúng chuẩn điều hành — Bấm sao chép để dán vào tờ trình số
                          </p>
                        </div>
                      </div>

                      {/* 3 nút chọn nhanh trạng thái kết luận */}
                      <div className="flex items-center gap-1 bg-[#0B1A2D] p-1 rounded-lg border border-[#1E3A5F]">
                        <button
                          type="button"
                          onClick={() => applyConclusion('conditional')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                            conclusionType === 'conditional'
                              ? "bg-[#C5A059] text-[#0B1A2D] shadow"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                          title="Đồng ý kèm yêu cầu điều chỉnh theo file đính kèm"
                        >
                          ✓ Đồng ý (Kèm điều chỉnh)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyConclusion('approved')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                            conclusionType === 'approved'
                              ? "bg-emerald-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                          title="Đồng ý hoàn toàn"
                        >
                          ✓ Đồng ý
                        </button>
                        <button
                          type="button"
                          onClick={() => applyConclusion('rejected')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                            conclusionType === 'rejected'
                              ? "bg-red-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          )}
                          title="Không đồng ý"
                        >
                          ✗ Không đồng ý
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      rows={4}
                      className="w-full bg-[#0B1A2D] border border-[#1E3A5F] focus:border-[#C5A059] text-slate-200 text-xs rounded-lg p-3 font-mono leading-relaxed focus:outline-none transition-colors select-text"
                      placeholder="Ý kiến phê duyệt tóm tắt..."
                    />

                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <p className="text-[11px] text-slate-400 italic">
                        💡 Bạn có thể trực tiếp gõ chỉnh sửa thêm bớt vào ô trên trước khi sao chép.
                      </p>
                      
                      <button
                        type="button"
                        onClick={handleCopyApprovalNote}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer",
                          copiedNote
                            ? "bg-emerald-600 text-white"
                            : "bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-[#0B1A2D]"
                        )}
                        title="Sao chép nội dung để dán sang BPM"
                      >
                        {copiedNote ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNote ? 'Đã sao chép vào bộ nhớ!' : 'Sao chép ý kiến phê duyệt'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                
                // 3. TRẠNG THÁI BAN ĐẦU CHƯA SOÁT XÉT
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 px-6 min-h-[360px]">
                  <div className="w-16 h-16 rounded-full bg-[#13253F] flex items-center justify-center border border-[#1E3A5F] shadow-lg">
                    <Scale className="w-8 h-8 text-[#C5A059] stroke-[1.5]" />
                  </div>
                  <div className="text-center max-w-sm">
                    <p className="text-sm font-bold text-slate-200 mb-1.5 uppercase tracking-wide font-serif">
                      Trung Tâm Đối Chiếu Pháp Chế BLUEMARQ
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Tải lên các tài liệu căn cứ ở cột bên trái và bấm <strong className="text-[#C5A059]">Bắt đầu Soát xét</strong> để AI đối chiếu ma trận 5 phòng ban.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER CỐ ĐỊNH Ở ĐÁY CỘT PHẢI: TOOLBAR XUẤT FILE HOÀN CHỈNH */}
            {findings && findings.length > 0 && (
              <div className="p-3 bg-[#0E1F35] border-t border-[#1E3A5F] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xl">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <UserCheck className="w-4 h-4 text-[#C5A059] shrink-0" />
                  <span>Tác giả: <strong className="text-white">{reviewerName || 'xuanlv'}</strong> (<span className="text-[#C5A059] font-semibold">{DEPT_TITLE_MAP[reviewerDepartment] || 'Ban Pháp Chế'}</span>)</span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                  {/* NÚT CHÍNH: XUẤT FILE WORD ĐÃ SOÁT XÉT ĐẦY ĐỦ */}
                  <button
                    onClick={() => handleDownloadDocx('all')}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-[#0B1A2D] font-extrabold text-xs py-2 px-4 rounded-lg shadow-md hover:shadow-[0_4px_16px_rgba(197,160,89,0.4)] transition-all flex items-center justify-center gap-1.5"
                    title="Xuất file Word đầy đủ toàn bộ nhận xét đã duyệt dưới tên của người soát xét"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Xuất File Word Đã Soát Xét</span>
                  </button>

                  {/* NÚT BIÊN BẢN: PHIẾU SOÁT XÉT BLUEMARQ */}
                  <button
                    onClick={handleDownloadReport}
                    className="flex-1 sm:flex-initial bg-[#13253F] hover:bg-[#1E3A5F] border border-[#1E3A5F] text-slate-200 font-semibold text-xs py-2 px-3.5 rounded-lg transition-all flex items-center justify-center gap-1.5"
                    title="Tải Phiếu Soát Xét chuẩn Tập đoàn BLUEMARQ (HTML / In ấn)"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Phiếu Soát Xét BLUEMARQ</span>
                  </button>
                </div>
              </div>
            )}

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

            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Hỗ trợ dán <strong>nhiều API Key cách nhau bởi dấu phẩy <code className="bg-[#0B1A2D] px-1.5 py-0.5 rounded text-[#C5A059] font-mono">,</code></strong>.
                Hệ thống sẽ <strong>tự động xoay vòng key</strong> khi có key bị quá tải (503) hoặc hết lượt (429).
              </p>
              <p className="text-[11px] text-slate-400">
                Nếu để trống, hệ thống sẽ tự động dùng danh sách Key được cấu hình trên máy chủ Vercel.
              </p>
            </div>

            <div>
              <input 
                type="password"
                defaultValue={apiKey}
                id="apiKeyInput"
                placeholder="Dán key hoặc nhiều key cách nhau bằng dấu phẩy (AIzaSy1..., AIzaSy2...)"
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
