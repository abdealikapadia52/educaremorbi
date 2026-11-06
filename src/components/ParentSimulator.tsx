import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Bell,
  Sparkles,
  Info,
  History,
  ArrowDownLeft,
  Clock,
} from 'lucide-react';
import { StudentData, getTodayString } from '../data/mockData';
import { ReceiptModal } from './ReceiptModal';

interface ParentSimulatorProps {
  student: StudentData;
  onPayBalance: () => void;
  onRefresh: () => void;
}

export const ParentSimulator: React.FC<ParentSimulatorProps> = ({
  student,
  onPayBalance,
  onRefresh,
}) => {
  // Calendar month state
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showTodayAlertDialog, setShowTodayAlertDialog] = useState(false);
  const [hasAcknowledgedAlert, setHasAcknowledgedAlert] = useState(false);

  // Dynamic fee calculations
  const totalFees = student.totalFees;
  const collected = student.collected;
  const pending = Math.max(0, totalFees - collected);

  // Requirement: Conditional Visibility
  // "A 'Download Receipt' button must remain hidden on the Parent UI until pending == 0 AND receipt_pdf_url is not null."
  const canDownloadReceipt = pending === 0 && Boolean(student.receiptPdfUrl);

  const todayStr = getTodayString();
  const todayStatus = student.attendance[todayStr];

  // FEATURE REQUIREMENT: "On Page Load Alert: On the parent's home screen, check today's attendance record.
  // If it exists, trigger an Alert Dialog pop-up: 'Your child is marked [Status] today.'"
  useEffect(() => {
    if (todayStatus && !hasAcknowledgedAlert) {
      // Simulate WidgetsBinding.instance.addPostFrameCallback
      const timer = setTimeout(() => {
        setShowTodayAlertDialog(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [todayStatus, hasAcknowledgedAlert]);

  // Calendar math
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday

  const monthName = currentMonthDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  // Selected date status
  const selectedStatus = student.attendance[selectedDate];

  return (
    <div className="relative w-full max-w-[400px] mx-auto bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800">
      {/* Mobile Device Notch & Status Bar */}
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

      {/* Flutter App Screen Container */}
      <div className="bg-slate-50 text-slate-900 rounded-[28px] overflow-hidden flex flex-col min-h-[660px] max-h-[760px] border border-slate-200/80">
        {/* Flutter AppBar */}
        <div className="bg-indigo-900 text-white px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight">Educare Classes</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded">
                Parent
              </span>
            </div>
            <p className="text-xs text-indigo-200">
              {student.name} · {student.classGrade}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              title="Refresh Firestore Stream"
              className="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-800/60 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowTodayAlertDialog(true);
              }}
              title="Re-open Today Attendance Alert"
              className="p-2 text-indigo-200 hover:text-white rounded-lg hover:bg-indigo-800/60 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Student Profile Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-lg">
              {student.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 truncate">{student.name}</h3>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Enrolled
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Roll #{student.rollNumber} · {student.classGrade} · CBSE
              </p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Auth Phone: {student.parentPhone}
              </p>
            </div>
          </div>

          {/* FEATURE 1: Fee Tracking & Receipts */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Fee Summary
                </h4>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  pending === 0 ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {pending === 0 ? 'All Dues Cleared' : 'Balance Pending'}
              </span>
            </div>

            {/* Dynamic Metric 3-Strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-medium text-slate-500 block">Total</span>
                <span className="text-xs font-bold text-slate-900 font-mono">
                  ₹{totalFees.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2.5 text-center">
                <span className="text-[10px] font-medium text-emerald-700 block">Collected</span>
                <span className="text-xs font-bold text-emerald-700 font-mono">
                  ₹{collected.toLocaleString('en-IN')}
                </span>
              </div>

              <div
                className={`border rounded-xl p-2.5 text-center ${
                  pending > 0
                    ? 'bg-rose-50/70 border-rose-100 text-rose-700'
                    : 'bg-emerald-50/70 border-emerald-100 text-emerald-700'
                }`}
              >
                <span className="text-[10px] font-medium block">Pending</span>
                <span className="text-xs font-bold font-mono">
                  ₹{pending.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* CONDITIONAL VISIBILITY RULE IMPLEMENTATION */}
            {canDownloadReceipt ? (
              <div className="pt-2 animate-in fade-in duration-300">
                <button
                  onClick={() => setShowReceiptModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Fee Receipt (PDF)</span>
                </button>
                <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Receipt verified from Firebase Cloud Storage</span>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed">
                    <span>Receipt download will unlock once the remaining balance of </span>
                    <strong className="text-slate-800 font-mono font-bold">
                      ₹{pending.toLocaleString('en-IN')}
                    </strong>
                    <span> is cleared.</span>
                  </div>
                </div>

                {/* Quick Simulation Action for Parent/Tester */}
                <button
                  onClick={onPayBalance}
                  className="mt-2.5 w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Simulate Clearing Balance (₹{pending.toLocaleString('en-IN')})</span>
                </button>
              </div>
            )}
          </div>

          {/* FEATURE: Transaction History (Chronological Previous Fee Payments) */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Transaction History
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-semibold">
                {(student.transactions || []).length} Payments
              </span>
            </div>

            {/* Chronological list of payments */}
            {(!student.transactions || student.transactions.length === 0) ? (
              <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                <Clock className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500">No previous payment records found.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {student.transactions.map((txn, index) => {
                  const formattedDate = new Date(txn.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={txn.id || index}
                      className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              ₹{txn.amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Ref: {txn.referenceNo || txn.id}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                            {txn.paymentMode}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      {txn.note && (
                        <div className="text-[11px] text-slate-600 pl-9.5">
                          <span>{txn.note}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* FEATURE 2: Attendance & Calendar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Attendance Calendar
                </h4>
              </div>

              {/* Legend: Green (Present) / Red (Absent) */}
              <div className="flex items-center gap-2 text-[10px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                  <span className="text-slate-600">Present</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" />
                  <span className="text-slate-600">Absent</span>
                </div>
              </div>
            </div>

            {/* TableCalendar Month Header */}
            <div className="flex items-center justify-between px-1 py-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-800">{monthName}</span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-100 rounded text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
              <span>S</span>
              <span>M</span>
              <span>T</span>
              <span>W</span>
              <span>T</span>
              <span>F</span>
              <span>S</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Blank leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="h-8" />
              ))}

              {/* Days of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const status = student.attendance[dateKey];
                const isSelected = selectedDate === dateKey;
                const isToday = dateKey === todayStr;

                let cellBg = 'hover:bg-slate-100 text-slate-700';
                if (status === 'present') {
                  cellBg = 'bg-emerald-600 text-white font-bold';
                } else if (status === 'absent') {
                  cellBg = 'bg-rose-600 text-white font-bold';
                }

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(dateKey)}
                    className={`h-8 w-8 mx-auto rounded-full text-xs flex items-center justify-center transition-all cursor-pointer relative ${cellBg} ${
                      isSelected && !status ? 'ring-2 ring-indigo-500 font-bold' : ''
                    } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                  >
                    <span>{dayNum}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Date Detail Banner */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-800 block">
                  {new Date(selectedDate).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <span className="text-[10px] text-slate-500">
                  {selectedStatus === 'present'
                    ? 'Session Attended (Regular Batch)'
                    : selectedStatus === 'absent'
                    ? 'Marked Absent by Teacher'
                    : 'No class scheduled / Holiday'}
                </span>
              </div>
              <div>
                {selectedStatus === 'present' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Present</span>
                  </span>
                )}
                {selectedStatus === 'absent' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <XCircle className="w-3 h-3" />
                    <span>Absent</span>
                  </span>
                )}
                {!selectedStatus && (
                  <span className="text-[11px] text-slate-400">Off Day</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE 2 REQUIREMENT: ON PAGE LOAD ALERT DIALOG
          "On the parent's home screen, check today's attendance record.
           If it exists, trigger an Alert Dialog pop-up: 'Your child is marked [Status] today.'" */}
      {showTodayAlertDialog && todayStatus && (
        <div className="absolute inset-0 z-40 bg-black/60 rounded-[38px] flex items-center justify-center p-5 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-5 text-slate-900 shadow-2xl border border-slate-200 w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  todayStatus === 'present'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {todayStatus === 'present' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Today's Attendance</h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date().toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="my-4">
              <p
                className={`text-base font-bold ${
                  todayStatus === 'present' ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                Your child is marked {todayStatus.toUpperCase()} today.
              </p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {todayStatus === 'present'
                  ? `${student.name} was marked present for coaching classes by the faculty.`
                  : `${student.name} is marked absent today. If this is an unexcused absence, please contact Educare admin.`}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setShowTodayAlertDialog(false);
                  setHasAcknowledgedAlert(true);
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs shadow-xs cursor-pointer ${
                  todayStatus === 'present'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Acknowledge Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {showReceiptModal && (
        <ReceiptModal student={student} onClose={() => setShowReceiptModal(false)} />
      )}
    </div>
  );
};
