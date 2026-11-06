import React, { useState } from 'react';
import {
  Users,
  Calendar,
  DollarSign,
  Send,
  Plus,
  Check,
  X,
  CreditCard,
  Bell,
  Sparkles,
  ChevronDown,
  Layers,
  PhoneCall,
  Search,
  UserPlus,
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle2,
  Table,
  ReceiptText,
  PieChart,
  BarChart3,
  TrendingUp,
  BellRing,
} from 'lucide-react';
import { StudentData, getTodayString } from '../data/mockData';
import { FeeCollectionTrendsChart } from './FeeCollectionTrendsChart';

interface TeacherSimulatorProps {
  students: StudentData[];
  onMarkAttendance: (studentId: string, status: 'present' | 'absent') => void;
  onUpdateFees: (studentId: string, total: number, collected: number, receiptUrl: string | null) => void;
  onSendAnnouncement: (title: string, message: string, target: 'ALL' | string) => void;
  onAddStudent: (newStudent: StudentData) => void;
  onSendBulkFeeReminders?: (scope: string, customTemplate?: string) => { count: number; totalAmount: number; sampleStudentName?: string };
}

export const TeacherSimulator: React.FC<TeacherSimulatorProps> = ({
  students,
  onMarkAttendance,
  onUpdateFees,
  onSendAnnouncement,
  onAddStudent,
  onSendBulkFeeReminders,
}) => {
  const [selectedTeacherPhone, setSelectedTeacherPhone] = useState<string>('+91 98765 00001');
  const [selectedGrade, setSelectedGrade] = useState<string>('Std 10');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingStudentFee, setEditingStudentFee] = useState<StudentData | null>(null);

  // Form states for announcement
  const [announcementTarget, setAnnouncementTarget] = useState<'ALL' | string>('ALL');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');

  // Form states for fee edit modal
  const [feeTotalInput, setFeeTotalInput] = useState('');
  const [feeCollectedInput, setFeeCollectedInput] = useState('');
  const [receiptUrlInput, setReceiptUrlInput] = useState('');

  const gradeList = [
    'Std 2', 'Std 3', 'Std 4', 'Std 5', 'Std 6',
    'Std 7', 'Std 8', 'Std 9', 'Std 10', 'Std 11', 'Std 12'
  ];

  const [searchQuery, setSearchQuery] = useState('');
  const todayStr = getTodayString();

  // Export Monthly Attendance CSV state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [exportType, setExportType] = useState<'detailed' | 'summary'>('detailed');
  const [copiedCsv, setCopiedCsv] = useState(false);

  // Fees Report state (All Standards & Standard-Wise)
  const [showFeeReportModal, setShowFeeReportModal] = useState(false);
  const [feeReportScope, setFeeReportScope] = useState<'ALL' | string>('ALL');
  const [feeStatusFilter, setFeeStatusFilter] = useState<'all' | 'pending' | 'cleared'>('all');
  const [feeReportViewTab, setFeeReportViewTab] = useState<'trends' | 'ledger' | 'standards'>('trends');
  const [copiedFeeCsv, setCopiedFeeCsv] = useState(false);
  const [showTrendsChartInline, setShowTrendsChartInline] = useState(false);

  // Bulk Fee Reminders state
  const [showBulkReminderModal, setShowBulkReminderModal] = useState(false);
  const [bulkReminderScope, setBulkReminderScope] = useState<string>('ALL');
  const [bulkReminderTemplate, setBulkReminderTemplate] = useState(
    'Dear Parent, this is a reminder from Educare Coaching Classes regarding outstanding coaching fee of {amount} for {name} ({grade}). Kindly clear dues to access fee receipts.'
  );
  const [isReminderSentToast, setIsReminderSentToast] = useState<string | null>(null);

  // Multi-field search filter: matches name, class grade, parent phone, or roll number
  const q = searchQuery.toLowerCase().trim();
  const filteredStudents = q
    ? students.filter((s) => {
        const nameMatch = s.name.toLowerCase().includes(q);
        const gradeMatch = s.classGrade.toLowerCase().includes(q);
        const phoneMatch = s.parentPhone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''));
        const rollMatch = s.rollNumber.toLowerCase().includes(q);
        return nameMatch || gradeMatch || phoneMatch || rollMatch;
      })
    : students.filter((s) => s.classGrade === selectedGrade);

  const handleOpenFeeModal = (student: StudentData) => {
    setEditingStudentFee(student);
    setFeeTotalInput(String(student.totalFees));
    setFeeCollectedInput(String(student.collected));
    setReceiptUrlInput(student.receiptPdfUrl || '');
  };

  const handleSaveFee = () => {
    if (!editingStudentFee) return;
    const total = parseFloat(feeTotalInput) || 0;
    const collected = parseFloat(feeCollectedInput) || 0;
    const receipt = receiptUrlInput.trim().length > 0 ? receiptUrlInput.trim() : null;
    onUpdateFees(editingStudentFee.id, total, collected, receipt);
    setEditingStudentFee(null);
  };

  // Form states for Add Student Modal
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('Std 10');
  const [newStudentParentPhone, setNewStudentParentPhone] = useState('+91 98765 ');
  const [newStudentRoll, setNewStudentRoll] = useState('');
  const [newStudentTotalFees, setNewStudentTotalFees] = useState('45000');
  const [newStudentCollectedFees, setNewStudentCollectedFees] = useState('0');
  const [newStudentReceiptUrl, setNewStudentReceiptUrl] = useState('');

  const handleOpenAddStudentModal = (defaultGrade?: string) => {
    const grade = defaultGrade || selectedGrade;
    setNewStudentGrade(grade);
    setNewStudentName('');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    setNewStudentParentPhone(`+91 98765 ${randomSuffix}`);
    const nextRoll = `${students.length + 1045}`;
    setNewStudentRoll(nextRoll);

    // Default fee tiered by standard
    if (grade === 'Std 11' || grade === 'Std 12') {
      setNewStudentTotalFees('60000');
    } else if (grade === 'Std 9' || grade === 'Std 10') {
      setNewStudentTotalFees('45000');
    } else {
      setNewStudentTotalFees('32000');
    }
    setNewStudentCollectedFees('0');
    setNewStudentReceiptUrl('');
    setShowAddStudentModal(true);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentParentPhone.trim()) return;

    const total = parseFloat(newStudentTotalFees) || 0;
    const collected = parseFloat(newStudentCollectedFees) || 0;
    const cleanPhone = newStudentParentPhone.trim();
    const cleanId = `STU_${new Date().getFullYear()}_${Math.floor(100 + Math.random() * 900)}`;

    const newStudent: StudentData = {
      id: cleanId,
      name: newStudentName.trim(),
      parentPhone: cleanPhone,
      classGrade: newStudentGrade,
      rollNumber: newStudentRoll.trim() || `${students.length + 1045}`,
      totalFees: total,
      collected: collected,
      receiptPdfUrl:
        total - collected === 0 && newStudentReceiptUrl.trim().length > 0
          ? newStudentReceiptUrl.trim()
          : total - collected === 0
          ? `https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2F${cleanId}%2Ffee_receipt_${cleanId}.pdf?alt=media`
          : null,
      attendance: {
        [todayStr]: 'present', // Initialized as marked present for today
      },
      transactions: collected > 0 ? [
        {
          id: `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: todayStr,
          amount: collected,
          paymentMode: 'Cash Receipt',
          referenceNo: `ADM-REC-${cleanId}`,
          status: 'verified',
          note: 'Admission Registration Payment',
        }
      ] : [],
    };

    onAddStudent(newStudent);
    setSelectedGrade(newStudentGrade);
    setShowAddStudentModal(false);
  };

  // CSV Report Generator
  const generateCsvContent = () => {
    const targetGrade = exportScope === 'current' ? selectedGrade : 'All_Grades';
    const targetStudents = exportScope === 'current'
      ? students.filter((s) => s.classGrade === selectedGrade)
      : students;

    const daysInMonth = new Date(exportYear, exportMonth, 0).getDate();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[exportMonth - 1];

    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers: string[] = [
      'Roll Number',
      'Student Name',
      'Class Grade',
      'Parent Contact',
      'Total Working Days',
      'Days Present',
      'Days Absent',
      'Attendance Rate (%)',
    ];

    if (exportType === 'detailed') {
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(exportYear, exportMonth - 1, day);
        const dayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        headers.push(`Day ${day} (${dayAbbr})`);
      }
    }

    const rows: string[] = [];
    rows.push(headers.map(escapeCsv).join(','));

    targetStudents.forEach((student) => {
      let presentCount = 0;
      let absentCount = 0;
      const dailyStatuses: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(exportYear, exportMonth - 1, day);
        const isSunday = d.getDay() === 0;
        const dateKey = `${exportYear}-${String(exportMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status = student.attendance?.[dateKey];

        if (isSunday) {
          dailyStatuses.push('Sunday');
        } else if (status === 'present') {
          presentCount++;
          dailyStatuses.push('Present');
        } else if (status === 'absent') {
          absentCount++;
          dailyStatuses.push('Absent');
        } else {
          dailyStatuses.push('-');
        }
      }

      const totalMarked = presentCount + absentCount;
      const rate = totalMarked > 0 ? ((presentCount / totalMarked) * 100).toFixed(1) : '0.0';

      const baseCols = [
        student.rollNumber || '-',
        student.name,
        student.classGrade,
        student.parentPhone,
        totalMarked,
        presentCount,
        absentCount,
        `${rate}%`,
      ];

      if (exportType === 'detailed') {
        rows.push([...baseCols, ...dailyStatuses].map(escapeCsv).join(','));
      } else {
        rows.push(baseCols.map(escapeCsv).join(','));
      }
    });

    const fileName = `Educare_Attendance_${targetGrade.replace(/\s+/g, '_')}_${monthName}_${exportYear}.csv`;
    const csv = '\uFEFF' + rows.join('\r\n');
    return { csv, fileName, targetStudents, daysInMonth, monthName };
  };

  const handleDownloadCsv = () => {
    const { csv, fileName } = generateCsvContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = () => {
    const { csv } = generateCsvContent();
    navigator.clipboard.writeText(csv);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  // Fees Report Generator
  const generateFeeCsvContent = () => {
    const scopeStudents = feeReportScope === 'ALL'
      ? students
      : students.filter((s) => s.classGrade === feeReportScope);

    const filtered = scopeStudents.filter((s) => {
      const pending = Math.max(0, s.totalFees - s.collected);
      if (feeStatusFilter === 'pending') return pending > 0;
      if (feeStatusFilter === 'cleared') return pending === 0;
      return true;
    });

    const headers = [
      'Roll Number',
      'Student Name',
      'Class Grade',
      'Parent Contact',
      'Total Fees (INR)',
      'Collected Fees (INR)',
      'Pending Dues (INR)',
      'Recovery Rate (%)',
      'Payment Status',
      'Receipt Issued',
    ];

    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows: string[] = [headers.map(escapeCsv).join(',')];

    filtered.forEach((s) => {
      const pending = Math.max(0, s.totalFees - s.collected);
      const rate = s.totalFees > 0 ? ((s.collected / s.totalFees) * 100).toFixed(1) : '0.0';
      const status = pending === 0 ? 'Fully Paid' : (s.collected > 0 ? 'Partially Paid' : 'Unpaid');
      const hasReceipt = s.receiptPdfUrl && pending === 0 ? 'Yes' : 'No';

      rows.push([
        s.rollNumber || '-',
        s.name,
        s.classGrade,
        s.parentPhone,
        s.totalFees,
        s.collected,
        pending,
        `${rate}%`,
        status,
        hasReceipt,
      ].map(escapeCsv).join(','));
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `Educare_Fees_Report_${feeReportScope.replace(/\s+/g, '_')}_${dateStr}.csv`;
    const csv = '\uFEFF' + rows.join('\r\n');
    return { csv, fileName, filtered, totalCount: filtered.length, scopeStudents };
  };

  const handleDownloadFeeCsv = () => {
    const { csv, fileName } = generateFeeCsvContent();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyFeeCsv = () => {
    const { csv } = generateFeeCsvContent();
    navigator.clipboard.writeText(csv);
    setCopiedFeeCsv(true);
    setTimeout(() => setCopiedFeeCsv(false), 2000);
  };

  const handleTriggerBulkReminders = () => {
    if (onSendBulkFeeReminders) {
      const res = onSendBulkFeeReminders(bulkReminderScope, bulkReminderTemplate);
      setShowBulkReminderModal(false);
      setIsReminderSentToast(
        `Dispatched fee reminder push notifications to ${res.count} parents (Total: ₹${res.totalAmount.toLocaleString('en-IN')})!`
      );
      setTimeout(() => setIsReminderSentToast(null), 4500);
    } else {
      setShowBulkReminderModal(false);
      setIsReminderSentToast('Bulk fee reminder push notifications sent successfully!');
      setTimeout(() => setIsReminderSentToast(null), 4500);
    }
  };

  const handleSendCustomAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementMessage.trim()) return;
    onSendAnnouncement(announcementTitle.trim(), announcementMessage.trim(), announcementTarget);
    setAnnouncementTitle('');
    setAnnouncementMessage('');
    setShowAnnouncementModal(false);
  };

  return (
    <div className="relative w-full max-w-[400px] mx-auto bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800">
      {/* Mobile Device Status Bar */}
      <div className="flex items-center justify-between px-6 py-2 text-slate-400 text-xs">
        <span className="font-mono text-[11px] font-semibold text-slate-200">09:41</span>
        <div className="w-20 h-4 bg-slate-950 rounded-full mx-auto" />
        <div className="flex items-center gap-1.5 text-[10px]">
          <span>5G</span>
          <div className="w-4 h-2.5 border border-slate-400 rounded-sm p-0.5">
            <div className="w-full h-full bg-slate-300 rounded-xs" />
          </div>
        </div>
      </div>

      {/* Screen Frame */}
      <div className="bg-slate-50 text-slate-900 rounded-[28px] overflow-hidden flex flex-col min-h-[660px] max-h-[760px] border border-slate-200/80">
        {/* Top AppBar */}
        <div className="bg-slate-900 text-white px-4 py-3 shrink-0 flex items-center justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold">Educare Admin</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/30">
                Teacher
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-300 mt-0.5 font-mono">
              <span>Admin:</span>
              <select
                value={selectedTeacherPhone}
                onChange={(e) => setSelectedTeacherPhone(e.target.value)}
                className="bg-slate-800 text-slate-200 rounded px-1.5 py-0.5 text-[11px] font-mono border border-slate-700 cursor-pointer"
              >
                <option value="+91 98765 00001">+91 98765 00001 (Principal)</option>
                <option value="+91 98765 00002">+91 98765 00002 (Admin)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setBulkReminderScope(selectedGrade);
                setShowBulkReminderModal(true);
              }}
              className="p-1 px-1.5 text-rose-300 hover:text-white bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium shadow-xs"
              title="One-Click Bulk Fee Reminders to Parents with Pending Dues"
            >
              <BellRing className="w-3.5 h-3.5 text-rose-400" />
              <span>Remind</span>
            </button>
            <button
              onClick={() => {
                setFeeReportScope('ALL');
                setShowFeeReportModal(true);
              }}
              className="p-1 px-1.5 text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium shadow-xs"
              title="Fees Report (All Standards & Standard-Wise)"
            >
              <ReceiptText className="w-3.5 h-3.5 text-amber-400" />
              <span>Fees</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="p-1 px-1.5 text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium shadow-xs"
              title="Export Monthly Attendance Report as CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleOpenAddStudentModal(selectedGrade)}
              className="p-1 px-1.5 text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold shadow-xs"
              title="Add New Student (Admin Panel)"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll</span>
            </button>
            <button
              onClick={() => setShowAnnouncementModal(true)}
              className="p-1 px-1.5 text-indigo-300 hover:text-white bg-indigo-900/60 hover:bg-indigo-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-medium"
              title="Send Push Announcement"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Alert</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR (Filter by Name, Class Grade, or Phone Number) */}
        <div className="bg-white px-3 pt-2.5 pb-2 border-b border-slate-200">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, grade (Std 10), or phone..."
              className="w-full pl-8 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-600 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Grade Filter Horizontal Scroll Strip (Std 2 to Std 12) */}
        <div className="bg-white border-b border-slate-200 px-3 py-2 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
          {gradeList.map((grade) => {
            const isSelected = !searchQuery && grade === selectedGrade;
            return (
              <button
                key={grade}
                onClick={() => {
                  setSelectedGrade(grade);
                  setSearchQuery(''); // Switch back to grade browsing
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {grade}
              </button>
            );
          })}
        </div>

        {/* Active Banner: Search Results or Daily Attendance */}
        {searchQuery ? (
          <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-medium truncate">
              <Search className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Results for "{searchQuery}"</span>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-indigo-700 hover:text-indigo-900 font-bold underline cursor-pointer shrink-0 ml-2"
            >
              Clear ({filteredStudents.length} found)
            </button>
          </div>
        ) : (
          <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Marking: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setBulkReminderScope(selectedGrade);
                  setShowBulkReminderModal(true);
                }}
                className="text-[10px] text-rose-700 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
                title={`Send bulk fee reminders to ${selectedGrade} defaulters`}
              >
                <BellRing className="w-3 h-3 text-rose-600" />
                <span>Remind</span>
              </button>
              <button
                onClick={() => {
                  setFeeReportScope(selectedGrade);
                  setFeeReportViewTab('trends');
                  setShowFeeReportModal(true);
                }}
                className="text-[10px] text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-full font-bold transition-colors cursor-pointer flex items-center gap-1"
                title={`View ${selectedGrade} Fee Ledger & Dues`}
              >
                <ReceiptText className="w-3 h-3 text-amber-700" />
                <span>Fees</span>
              </button>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                {filteredStudents.length} Students
              </span>
            </div>
          </div>
        )}

        {/* View Mode Toggle: Pupils List vs Monthly Revenue Trends (Recharts) */}
        <div className="bg-white px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowTrendsChartInline(false)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                !showTrendsChartInline
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pupils ({filteredStudents.length})
            </button>
            <button
              onClick={() => setShowTrendsChartInline(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                showTrendsChartInline
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Revenue Trends (Recharts)</span>
            </button>
          </div>
          
          <button
            onClick={() => {
              setFeeReportScope(selectedGrade);
              setFeeReportViewTab('trends');
              setShowFeeReportModal(true);
            }}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-0.5"
            title="Open comprehensive Analytics & Ledger"
          >
            <span>Full Modal</span>
            <span className="text-[9px]">↗</span>
          </button>
        </div>

        {/* Conditional Content: Inline Trends Chart or Student List */}
        {showTrendsChartInline ? (
          <div className="flex-1 overflow-y-auto p-3">
            <FeeCollectionTrendsChart
              students={students}
              selectedGrade={selectedGrade}
              compact={true}
            />
          </div>
        ) : (
          /* Student List */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
              {searchQuery.trim() ? (
                <>
                  <p className="text-xs mb-1 text-slate-700 font-semibold">
                    No students matching "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400 mb-3 max-w-[240px] mx-auto">
                    Try searching by student name, standard (e.g. Std 10), or phone number.
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs mb-3">No students enrolled in {selectedGrade}</p>
                  <button
                    onClick={() => handleOpenAddStudentModal(selectedGrade)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Enroll Student in {selectedGrade}</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredStudents.map((student) => {
              const statusToday = student.attendance[todayStr];
              const isPending = student.totalFees - student.collected > 0;

              return (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-3"
                >
                  {/* Top row: Avatar & details */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {student.name}
                          </h4>
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                            {student.classGrade}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Roll #{student.rollNumber} · <span className="font-mono">{student.parentPhone}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenFeeModal(student)}
                      className="px-2 py-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Fees
                    </button>
                  </div>

                  {/* Fee status strip */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-mono">
                      Paid: ₹{student.collected.toLocaleString('en-IN')} / ₹{student.totalFees.toLocaleString('en-IN')}
                    </span>
                    <span
                      className={`font-semibold ${
                        isPending ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isPending
                        ? `₹${(student.totalFees - student.collected).toLocaleString('en-IN')} Due`
                        : 'Cleared ✓'}
                    </span>
                  </div>

                  {/* 1-Tap Attendance Marker */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-slate-600">
                      Today's Status:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onMarkAttendance(student.id, 'present')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          statusToday === 'present'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Present</span>
                      </button>
                      <button
                        onClick={() => onMarkAttendance(student.id, 'absent')}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                          statusToday === 'absent'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Absent</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Floating Triggers: Add Student & Announcement */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleOpenAddStudentModal(selectedGrade)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Add Student</span>
          </button>
          <button
            onClick={() => setShowAnnouncementModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            <Send className="w-3.5 h-3.5 text-indigo-600" />
            <span>Send Alert</span>
          </button>
        </div>
      </div>

      {/* FEATURE 3 REQUIREMENT: TEACHER ANNOUNCEMENT UI MODAL
          "Build a Teacher Dashboard UI snippet to send custom announcements
           (dropdown to select 'All Parents' or 'Specific Parent Phone')" */}
      {showAnnouncementModal && (
        <div className="absolute inset-0 z-50 bg-black/60 rounded-[38px] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-2xl border border-slate-200 w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Custom Announcement</h3>
              </div>
              <button
                onClick={() => setShowAnnouncementModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendCustomAnnouncement} className="space-y-3.5 mt-3 text-xs">
              {/* Target Dropdown Requirement */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Recipient Target:
                </label>
                <select
                  value={announcementTarget}
                  onChange={(e) => setAnnouncementTarget(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-indigo-600"
                >
                  <option value="ALL">All Parents (Topic: all_parents)</option>
                  <option value="+91 98765 43210">+91 98765 43210 (Aarav's Parent)</option>
                  <option value="+91 98765 43211">+91 98765 43211 (Diya's Parent)</option>
                  <option value="+91 98765 43212">+91 98765 43212 (Rohan's Parent)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Announcement Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunday Physics Mock Test"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Announcement Message:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter notice message for parents..."
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-indigo-600 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAnnouncementModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send FCM Push</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fee Manager Modal */}
      {editingStudentFee && (
        <div className="absolute inset-0 z-50 bg-black/60 rounded-[38px] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-2xl border border-slate-200 w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manage Fees</h3>
                <p className="text-[11px] text-slate-500">{editingStudentFee.name} ({editingStudentFee.classGrade})</p>
              </div>
              <button
                onClick={() => setEditingStudentFee(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Total Fees (₹):
                </label>
                <input
                  type="number"
                  value={feeTotalInput}
                  onChange={(e) => setFeeTotalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Collected Amount (₹):
                </label>
                <input
                  type="number"
                  value={feeCollectedInput}
                  onChange={(e) => setFeeCollectedInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Receipt PDF URL (Storage):
                </label>
                <input
                  type="text"
                  placeholder="https://firebasestorage.googleapis.com/..."
                  value={receiptUrlInput}
                  onChange={(e) => setReceiptUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-700"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Dynamic Pending:</span>
                <span className="font-bold font-mono text-slate-900">
                  ₹{Math.max(0, (parseFloat(feeTotalInput) || 0) - (parseFloat(feeCollectedInput) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setEditingStudentFee(null)}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFee}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                Save & Dispatch FCM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL: ADD STUDENT MODAL */}
      {showAddStudentModal && (
        <div className="absolute inset-0 z-50 bg-black/65 rounded-[38px] flex items-center justify-center p-3 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-4 text-slate-900 shadow-2xl border border-slate-200 w-full max-h-[640px] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-tight">Enroll New Student</h3>
                  <p className="text-[10px] text-slate-500">Admin Panel · Cloud Firestore Enrollment</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Student Full Name:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pooja Deshmukh"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Class / Grade:
                  </label>
                  <select
                    value={newStudentGrade}
                    onChange={(e) => {
                      const g = e.target.value;
                      setNewStudentGrade(g);
                      if (g === 'Std 11' || g === 'Std 12') {
                        setNewStudentTotalFees('60000');
                      } else if (g === 'Std 9' || g === 'Std 10') {
                        setNewStudentTotalFees('45000');
                      } else {
                        setNewStudentTotalFees('32000');
                      }
                    }}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-indigo-600"
                  >
                    {gradeList.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Roll Number:
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentRoll}
                    onChange={(e) => setNewStudentRoll(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Parent Registered Phone (SMS / OTP):
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 XXXXX"
                  value={newStudentParentPhone}
                  onChange={(e) => setNewStudentParentPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-indigo-600"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Parent logs in with this number to view attendance & fees.
                </p>
              </div>

              {/* Fee Section */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[11px] font-bold text-slate-800 block">Initial Fee Structure</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Total Course Fees (₹):
                    </label>
                    <input
                      type="number"
                      value={newStudentTotalFees}
                      onChange={(e) => setNewStudentTotalFees(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Initial Paid / Collected (₹):
                    </label>
                    <input
                      type="number"
                      value={newStudentCollectedFees}
                      onChange={(e) => setNewStudentCollectedFees(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Dynamic Pending Dues:</span>
                  <span className={`font-mono font-bold ${
                    (parseFloat(newStudentTotalFees) || 0) - (parseFloat(newStudentCollectedFees) || 0) > 0
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}>
                    ₹{Math.max(0, (parseFloat(newStudentTotalFees) || 0) - (parseFloat(newStudentCollectedFees) || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Save & Enroll Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Export Monthly Student Attendance Report as CSV */}
      {showExportModal && (() => {
        const { fileName, targetStudents, daysInMonth, monthName } = generateCsvContent();

        const months = [
          { name: 'January', val: 1 },
          { name: 'February', val: 2 },
          { name: 'March', val: 3 },
          { name: 'April', val: 4 },
          { name: 'May', val: 5 },
          { name: 'June', val: 6 },
          { name: 'July', val: 7 },
          { name: 'August', val: 8 },
          { name: 'September', val: 9 },
          { name: 'October', val: 10 },
          { name: 'November', val: 11 },
          { name: 'December', val: 12 },
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Export Attendance Report (CSV)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Monthly student attendance register for spreadsheets
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Month Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Month:
                  </label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium cursor-pointer focus:bg-white focus:outline-indigo-500"
                  >
                    {months.map((m) => (
                      <option key={m.val} value={m.val}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Year:
                  </label>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium cursor-pointer focus:bg-white focus:outline-indigo-500"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>

                {/* Scope */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Class Scope:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExportScope('current')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        exportScope === 'current'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {selectedGrade}
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportScope('all')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        exportScope === 'all'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All Std (2–12)
                    </button>
                  </div>
                </div>

                {/* Layout Type */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Columns:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setExportType('detailed')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        exportType === 'detailed'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Includes Day 1 to Day 31 columns"
                    >
                      Full Matrix
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportType('summary')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        exportType === 'summary'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                      title="Only totals & percentages"
                    >
                      Summary
                    </button>
                  </div>
                </div>
              </div>

              {/* File Info & Live Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-slate-700 truncate">
                    <Table className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-semibold truncate">{fileName}</span>
                  </div>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {targetStudents.length} Students · {daysInMonth} Days
                  </span>
                </div>

                {/* Mini Spreadsheet Preview */}
                <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-36">
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="p-1.5">Roll</th>
                        <th className="p-1.5">Student</th>
                        <th className="p-1.5">Grade</th>
                        <th className="p-1.5 text-center">Present</th>
                        <th className="p-1.5 text-center">Absent</th>
                        <th className="p-1.5 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {targetStudents.slice(0, 6).map((s) => {
                        let present = 0;
                        let absent = 0;
                        for (let day = 1; day <= daysInMonth; day++) {
                          const k = `${exportYear}-${String(exportMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          if (s.attendance?.[k] === 'present') present++;
                          if (s.attendance?.[k] === 'absent') absent++;
                        }
                        const total = present + absent;
                        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                        return (
                          <tr key={s.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-medium text-slate-500">{s.rollNumber}</td>
                            <td className="p-1.5 font-sans font-medium text-slate-800 truncate max-w-[120px]">{s.name}</td>
                            <td className="p-1.5 text-slate-500 font-sans">{s.classGrade}</td>
                            <td className="p-1.5 text-center text-emerald-600 font-bold">{present}</td>
                            <td className="p-1.5 text-center text-rose-500 font-bold">{absent}</td>
                            <td className="p-1.5 text-right font-bold text-slate-700">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyCsv}
                  className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedCsv ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy CSV</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .CSV File</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: Fees Report (All Standards & Standard-Wise Breakdown) */}
      {showFeeReportModal && (() => {
        // Calculate standard-wise breakdown
        const gradeBreakdown: Record<string, { count: number; total: number; collected: number; pending: number }> = {};
        gradeList.forEach((g) => {
          gradeBreakdown[g] = { count: 0, total: 0, collected: 0, pending: 0 };
        });

        students.forEach((s) => {
          if (!gradeBreakdown[s.classGrade]) {
            gradeBreakdown[s.classGrade] = { count: 0, total: 0, collected: 0, pending: 0 };
          }
          gradeBreakdown[s.classGrade].count += 1;
          gradeBreakdown[s.classGrade].total += s.totalFees;
          gradeBreakdown[s.classGrade].collected += s.collected;
          gradeBreakdown[s.classGrade].pending += Math.max(0, s.totalFees - s.collected);
        });

        const { fileName, filtered } = generateFeeCsvContent();

        // Scope aggregated metrics
        const scopeStudents = feeReportScope === 'ALL'
          ? students
          : students.filter((s) => s.classGrade === feeReportScope);

        let totalTarget = 0;
        let totalCollected = 0;
        let totalPending = 0;
        let defaulters = 0;
        let clearedCount = 0;

        scopeStudents.forEach((s) => {
          totalTarget += s.totalFees;
          totalCollected += s.collected;
          const p = Math.max(0, s.totalFees - s.collected);
          totalPending += p;
          if (p > 0) defaulters++;
          else clearedCount++;
        });

        const collectionRate = totalTarget > 0 ? ((totalCollected / totalTarget) * 100).toFixed(1) : '0.0';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-3.5 max-h-[92vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
                    <ReceiptText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Fees Report · {feeReportScope === 'ALL' ? 'All Standards (Std 2–12)' : feeReportScope}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      All standards and standard-wise fees recovery ledger
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFeeReportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Standard Filter Strip */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Standard Scope:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setFeeReportScope('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      feeReportScope === 'ALL'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Standards ({students.length})
                  </button>
                  {gradeList.map((g) => {
                    const cnt = gradeBreakdown[g]?.count || 0;
                    const isSel = feeReportScope === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFeeReportScope(g)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                          isSel
                            ? 'bg-amber-600 text-white shadow-xs font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {g} ({cnt})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aggregated KPI Strip */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block font-medium">Total Billed Fees</span>
                    <span className="text-xs font-bold font-mono text-slate-900">
                      ₹{totalTarget.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-[10px] text-emerald-700 block font-medium">Collected Revenue</span>
                    <span className="text-xs font-bold font-mono text-emerald-700">
                      ₹{totalCollected.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-rose-700 block font-medium">Outstanding Dues</span>
                    <span className="text-xs font-bold font-mono text-rose-700">
                      ₹{totalPending.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Collection Efficiency Bar */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, Number(collectionRate)))}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-800 shrink-0">
                    {collectionRate}% Recovered
                  </span>
                  <span className="text-[11px] text-rose-600 font-semibold shrink-0">
                    · {defaulters} Defaulter{defaulters === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* View Switcher: Trends Chart VS Standards Matrix VS Detailed Student Ledger */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setFeeReportViewTab('trends')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      feeReportViewTab === 'trends'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Monthly Trends (Recharts)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeReportViewTab('standards')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      feeReportViewTab === 'standards'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Standards Matrix
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeReportViewTab('ledger')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      feeReportViewTab === 'ledger'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Student Ledger ({filtered.length})
                  </button>
                </div>

                {/* Sub-filter for ledger: All vs Pending vs Cleared */}
                {feeReportViewTab === 'ledger' && (
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('all')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        feeStatusFilter === 'all'
                          ? 'bg-slate-200 text-slate-900 font-bold'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('pending')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        feeStatusFilter === 'pending'
                          ? 'bg-rose-100 text-rose-800 font-bold'
                          : 'text-slate-500 hover:text-rose-700'
                      }`}
                    >
                      Dues ({defaulters})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeStatusFilter('cleared')}
                      className={`px-2 py-0.5 rounded-md cursor-pointer ${
                        feeStatusFilter === 'cleared'
                          ? 'bg-emerald-100 text-emerald-800 font-bold'
                          : 'text-slate-500 hover:text-emerald-700'
                      }`}
                    >
                      Paid ({clearedCount})
                    </button>
                  </div>
                )}
              </div>

              {/* View 0: Recharts Monthly Fee Collection Trends Bar Chart */}
              {feeReportViewTab === 'trends' && (
                <div className="animate-in fade-in duration-200">
                  <FeeCollectionTrendsChart
                    students={students}
                    selectedGrade={feeReportScope}
                    compact={false}
                  />
                </div>
              )}

              {/* View 1: Standards Comparison Matrix */}
              {feeReportViewTab === 'standards' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Standard</th>
                        <th className="p-2 text-center">Pupils</th>
                        <th className="p-2 text-right">Target Fee</th>
                        <th className="p-2 text-right">Collected</th>
                        <th className="p-2 text-right">Pending</th>
                        <th className="p-2 text-right">Recovery %</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {gradeList.map((g) => {
                        const row = gradeBreakdown[g] || { count: 0, total: 0, collected: 0, pending: 0 };
                        const rec = row.total > 0 ? Math.round((row.collected / row.total) * 100) : 0;
                        return (
                          <tr key={g} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2 font-sans font-bold text-slate-800">{g}</td>
                            <td className="p-2 text-center text-slate-600 font-sans">{row.count}</td>
                            <td className="p-2 text-right text-slate-900">₹{row.total.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right text-emerald-700 font-bold">₹{row.collected.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right text-rose-600 font-bold">₹{row.pending.toLocaleString('en-IN')}</td>
                            <td className="p-2 text-right font-bold text-slate-800">{rec}%</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeReportScope(g);
                                  setFeeReportViewTab('ledger');
                                }}
                                className="px-2 py-0.5 text-[10px] font-sans font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded cursor-pointer"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* View 2: Detailed Student Ledger */}
              {feeReportViewTab === 'ledger' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No student records found matching the active status filter.
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2">Roll</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Grade</th>
                          <th className="p-2">Parent Contact</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-right">Collected</th>
                          <th className="p-2 text-right">Pending</th>
                          <th className="p-2 text-center">Status</th>
                          <th className="p-2 text-center">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {filtered.map((s) => {
                          const p = Math.max(0, s.totalFees - s.collected);
                          const isCleared = p === 0;
                          return (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-2 text-slate-500">{s.rollNumber || '-'}</td>
                              <td className="p-2 font-sans font-bold text-slate-900 truncate max-w-[120px]">
                                {s.name}
                              </td>
                              <td className="p-2 font-sans text-slate-600">{s.classGrade}</td>
                              <td className="p-2 text-slate-600">{s.parentPhone}</td>
                              <td className="p-2 text-right text-slate-900">₹{s.totalFees.toLocaleString('en-IN')}</td>
                              <td className="p-2 text-right text-emerald-700 font-bold">
                                ₹{s.collected.toLocaleString('en-IN')}
                              </td>
                              <td className="p-2 text-right text-rose-600 font-bold">
                                ₹{p.toLocaleString('en-IN')}
                              </td>
                              <td className="p-2 text-center font-sans">
                                {isCleared ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    Cleared
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-center font-sans">
                                {s.receiptPdfUrl && isCleared ? (
                                  <span className="text-[10px] text-indigo-700 font-semibold">Available</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCopyFeeCsv}
                  className="px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedFeeCsv ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy CSV</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFeeReportModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFeeCsv}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Fees .CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 6: One-Click Bulk Fee Reminders Tool */}
      {showBulkReminderModal && (() => {
        const targetStudents = bulkReminderScope === 'ALL'
          ? students
          : students.filter((s) => s.classGrade === bulkReminderScope);

        const defaulters = targetStudents.filter((s) => s.totalFees - s.collected > 0);
        const totalPendingAmount = defaulters.reduce(
          (sum, s) => sum + Math.max(0, s.totalFees - s.collected),
          0
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-50 rounded-xl text-rose-700">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Bulk Fee Reminder Notification
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Instant push alerts to parents with outstanding dues
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkReminderModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scope Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Target Grade Scope:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setBulkReminderScope('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                      bulkReminderScope === 'ALL'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Standards (Std 2–12)
                  </button>
                  {gradeList.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setBulkReminderScope(g)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        bulkReminderScope === g
                          ? 'bg-rose-600 text-white shadow-xs font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Defaulter Detection Banner */}
              <div className={`p-3.5 rounded-2xl border ${
                defaulters.length > 0
                  ? 'bg-rose-50/80 border-rose-200'
                  : 'bg-emerald-50/80 border-emerald-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold block text-slate-900">
                      {defaulters.length > 0
                        ? `${defaulters.length} Parents Identified with Dues`
                        : 'All Dues Cleared!'}
                    </span>
                    <span className={`text-[11px] font-semibold ${
                      defaulters.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      {defaulters.length > 0
                        ? `Total Outstanding Balance: ₹${totalPendingAmount.toLocaleString('en-IN')}`
                        : 'Zero students have pending fees in this class scope.'}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    defaulters.length > 0
                      ? 'bg-rose-200 text-rose-900'
                      : 'bg-emerald-200 text-emerald-900'
                  }`}>
                    {defaulters.length} Defaulters
                  </span>
                </div>
              </div>

              {/* Identified Pupils Preview List */}
              {defaulters.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-700">
                      Defaulters Recipient List:
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {defaulters.length} Parents to receive FCM push
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
                    {defaulters.map((s) => {
                      const pen = Math.max(0, s.totalFees - s.collected);
                      return (
                        <div key={s.id} className="p-2.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {s.classGrade.replaceAll('Std ', 'S')}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 block truncate">
                                {s.name}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                Roll: {s.rollNumber} · Parent: {s.parentPhone}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-xs font-bold font-mono text-rose-600 block">
                              ₹{pen.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] text-slate-400 block">
                              Pending dues
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customizable Notification Body */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Push Notification Message Template:
                </label>
                <textarea
                  value={bulkReminderTemplate}
                  onChange={(e) => setBulkReminderTemplate(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-rose-500 transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Variables <code className="text-slate-600 font-mono font-bold">&#123;name&#125;</code>, <code className="text-slate-600 font-mono font-bold">&#123;amount&#125;</code>, and <code className="text-slate-600 font-mono font-bold">&#123;grade&#125;</code> will be auto-populated per student.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBulkReminderModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={defaulters.length === 0}
                  onClick={handleTriggerBulkReminders}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    defaulters.length > 0
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Send Reminders ({defaulters.length} Parents)</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Floating Success Notification Toast */}
      {isReminderSentToast && (
        <div className="absolute top-16 left-4 right-4 z-50 p-3 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
          <span className="text-xs font-medium flex-1 leading-snug">
            {isReminderSentToast}
          </span>
          <button
            onClick={() => setIsReminderSentToast(null)}
            className="p-1 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
