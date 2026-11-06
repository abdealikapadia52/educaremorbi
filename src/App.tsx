/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Code,
  Shield,
  Layers,
  Sparkles,
  Download,
  CheckCircle2,
  RefreshCw,
  Send,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  School,
  ExternalLink,
} from 'lucide-react';
import {
  INITIAL_STUDENTS,
  StudentData,
  FcmNotification,
  getTodayString,
} from './data/mockData';
import { ParentSimulator } from './components/ParentSimulator';
import { TeacherSimulator } from './components/TeacherSimulator';
import { CodeStudio } from './components/CodeStudio';
import { NotificationToast } from './components/NotificationToast';

export default function App() {
  const [students, setStudents] = useState<StudentData[]>(INITIAL_STUDENTS);
  const [selectedParentStudentId, setSelectedParentStudentId] = useState<string>('STU_1001'); // Aarav Sharma
  const [activeViewMode, setActiveViewMode] = useState<'simulator' | 'code'>('simulator');
  const [simMode, setSimMode] = useState<'dual' | 'parent' | 'teacher'>('dual');
  const [latestNotification, setLatestNotification] = useState<FcmNotification | null>(null);

  // Active student for parent simulator
  const activeParentStudent =
    students.find((s) => s.id === selectedParentStudentId) || students[0];

  // Dispatches a simulated FCM Push Notification
  const triggerFcmNotification = (
    title: string,
    body: string,
    type: 'attendance' | 'fee' | 'announcement'
  ) => {
    const notif: FcmNotification = {
      id: `fcm_${Date.now()}`,
      title,
      body,
      type,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setLatestNotification(notif);
    // Auto dismiss after 6s
    setTimeout(() => {
      setLatestNotification((current) => (current?.id === notif.id ? null : current));
    }, 6000);
  };

  // Handler: Teacher marks attendance
  const handleTeacherMarkAttendance = (studentId: string, status: 'present' | 'absent') => {
    const today = getTodayString();
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            attendance: {
              ...s.attendance,
              [today]: status,
            },
          };
        }
        return s;
      })
    );

    const student = students.find((s) => s.id === studentId);
    const name = student?.name || 'Student';
    const isPresent = status === 'present';

    // Dispatches FCM notification triggered by Cloud Function onAttendanceRecordCreated
    triggerFcmNotification(
      `Attendance Update: ${name}`,
      isPresent
        ? `Good news! ${name} is marked PRESENT for coaching class today.`
        : `Notice: ${name} has been marked ABSENT today. Please contact Educare admin if unplanned.`,
      'attendance'
    );
  };

  // Handler: Teacher updates fees
  const handleTeacherUpdateFees = (
    studentId: string,
    total: number,
    collected: number,
    receiptUrl: string | null
  ) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            totalFees: total,
            collected: collected,
            receiptPdfUrl: receiptUrl,
          };
        }
        return s;
      })
    );

    const student = students.find((s) => s.id === studentId);
    const name = student?.name || 'Student';
    const pending = Math.max(0, total - collected);

    // Dispatches FCM notification triggered by Cloud Function onFeeUpdated
    if (pending === 0 && receiptUrl) {
      triggerFcmNotification(
        `Fee Receipt Ready: ${name}`,
        `Full payment of ₹${collected.toLocaleString('en-IN')} received. All dues cleared! Your receipt is now unlocked.`,
        'fee'
      );
    } else {
      triggerFcmNotification(
        `Fee Record Updated: ${name}`,
        `Total: ₹${total.toLocaleString('en-IN')} · Paid: ₹${collected.toLocaleString('en-IN')} · Pending: ₹${pending.toLocaleString('en-IN')}`,
        'fee'
      );
    }
  };

  // Handler: Parent pays balance
  const handleParentPayBalance = () => {
    const balanceAmount = Math.max(0, activeParentStudent.totalFees - activeParentStudent.collected);
    const newTxn = {
      id: `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: getTodayString(),
      amount: balanceAmount,
      paymentMode: 'UPI' as const,
      referenceNo: `UPI/Instant_${Date.now().toString().slice(-6)}`,
      status: 'verified' as const,
      note: 'Balance Fee Clearance (Online)',
    };

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === activeParentStudent.id) {
          return {
            ...s,
            collected: s.totalFees, // pending becomes 0
            receiptPdfUrl:
              s.receiptPdfUrl ||
              'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2FSTU_1001%2Ffee_receipt_2026.pdf?alt=media',
            transactions: [newTxn, ...(s.transactions || [])],
          };
        }
        return s;
      })
    );

    triggerFcmNotification(
      `Payment Received: ${activeParentStudent.name}`,
      `₹${balanceAmount.toLocaleString('en-IN')} paid. Balance is now ₹0. Fee receipt is ready for download!`,
      'fee'
    );
  };

  // Handler: Teacher enrolls new student
  const handleTeacherAddStudent = (newStudent: StudentData) => {
    setStudents((prev) => [newStudent, ...prev]);
    setSelectedParentStudentId(newStudent.id);
    triggerFcmNotification(
      `New Student Enrolled: ${newStudent.name}`,
      `${newStudent.name} enrolled in ${newStudent.classGrade}. Parent ${newStudent.parentPhone} can now access portal.`,
      'announcement'
    );
  };

  // Handler: Send announcement
  const handleSendAnnouncement = (title: string, message: string, target: 'ALL' | string) => {
    const isBroadcast = target === 'ALL';
    triggerFcmNotification(
      `Educare Announcement: ${title}`,
      message,
      'announcement'
    );
  };

  // Handler: Teacher dispatches one-click bulk fee reminders to parents with pending dues
  const handleSendBulkFeeReminders = (
    scope: string,
    customTemplate?: string
  ) => {
    const targetStudents = scope === 'ALL'
      ? students
      : students.filter((s) => s.classGrade === scope);

    const defaulters = targetStudents.filter((s) => s.totalFees - s.collected > 0);

    if (defaulters.length === 0) {
      return { count: 0, totalAmount: 0 };
    }

    const totalPendingAmount = defaulters.reduce(
      (sum, s) => sum + Math.max(0, s.totalFees - s.collected),
      0
    );

    // If active parent student in simulator has pending balance, dispatch targeted notification
    const activeIsDefaulter = defaulters.find((s) => s.id === activeParentStudent.id);
    const sample = activeIsDefaulter || defaulters[0];
    const samplePending = Math.max(0, sample.totalFees - sample.collected);

    const body = customTemplate
      ? customTemplate
          .replace('{name}', sample.name)
          .replace('{amount}', `₹${samplePending.toLocaleString('en-IN')}`)
          .replace('{grade}', sample.classGrade)
      : `Fee Reminder: A pending balance of ₹${samplePending.toLocaleString('en-IN')} is outstanding for ${sample.name} (${sample.classGrade}). Kindly clear dues to access fee receipts.`;

    triggerFcmNotification(
      `Fee Payment Reminder • Educare Classes`,
      body,
      'fee'
    );

    return {
      count: defaulters.length,
      totalAmount: totalPendingAmount,
      sampleStudentName: sample.name,
    };
  };

  // Reset demo state
  const handleReset = () => {
    setStudents(INITIAL_STUDENTS);
    triggerFcmNotification('Simulator Reset', 'Reset state to default student fee and attendance records.', 'announcement');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract: 3 zones separated by gap-8 (Brand Wordmark — Nav Links — Primary Action) */}
      <header className="flex items-center justify-between gap-8 px-6 lg:px-12 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
            E
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Educare Coaching Classes
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => setActiveViewMode('simulator')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeViewMode === 'simulator' ? 'text-indigo-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Live Flutter Simulator
          </button>
          <button
            onClick={() => setActiveViewMode('code')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeViewMode === 'code' ? 'text-indigo-400 font-semibold' : 'hover:text-white'
            }`}
          >
            Firebase Architecture & Code
          </button>
          <a
            href="#deliverables"
            onClick={() => setActiveViewMode('code')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Security Rules
          </a>
          <a
            href="#cloud-functions"
            onClick={() => setActiveViewMode('code')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Cloud Functions
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() =>
              setActiveViewMode(activeViewMode === 'simulator' ? 'code' : 'simulator')
            }
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            {activeViewMode === 'simulator' ? (
              <>
                <Code className="w-3.5 h-3.5" />
                <span>View Flutter & Firebase Code</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span>Test Live Simulator</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section / Mode Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium mb-1">
              <span>Flutter 3.x</span>
              <span aria-hidden="true">·</span>
              <span>Cloud Firestore</span>
              <span aria-hidden="true">·</span>
              <span>FCM Push</span>
              <span aria-hidden="true">·</span>
              <span>Node.js Cloud Functions</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Parent-Teacher Flutter & Firebase Architecture
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Role-based mobile system featuring phone OTP authentication, dynamic fee tracking with conditional receipt downloads, attendance calendar, and automated FCM triggers.
            </p>
          </div>

          {/* Interactive Mode Switches */}
          <div className="flex flex-wrap items-center gap-3">
            {activeViewMode === 'simulator' && (
              <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setSimMode('dual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    simMode === 'dual'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dual View (Side-by-Side)
                </button>
                <button
                  onClick={() => setSimMode('parent')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    simMode === 'parent'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Parent Screen
                </button>
                <button
                  onClick={() => setSimMode('teacher')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    simMode === 'teacher'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Teacher Admin
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              title="Reset state to initial test data"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </div>

        {/* Real-time Architecture Flow Notice */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">Strict Phone RBAC</span>
              <span className="text-[11px] text-slate-400">
                2 Teachers have full access. Parents strictly read matching phone documents.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">Conditional Receipt</span>
              <span className="text-[11px] text-slate-400">
                Download button stays hidden until pending == 0 & PDF URL is set.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">On Page Load Alert</span>
              <span className="text-[11px] text-slate-400">
                Parent home screen checks today's record & pops alert dialog.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-2xl flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-slate-200 block">FCM Cloud Functions</span>
              <span className="text-[11px] text-slate-400">
                Automated push dispatches on fee updates, attendance & custom alerts.
              </span>
            </div>
          </div>
        </div>

        {/* View Mode 1: Interactive Live Simulator */}
        {activeViewMode === 'simulator' && (
          <div className="space-y-6">
            {simMode === 'dual' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left: Parent Mobile Device */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Parent Flutter App (Client)</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
                          {activeParentStudent.parentPhone}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Shows dynamic fee calculation, receipt lock/unlock, and TableCalendar
                      </p>
                    </div>

                    <select
                      value={selectedParentStudentId}
                      onChange={(e) => setSelectedParentStudentId(e.target.value)}
                      className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 font-medium cursor-pointer"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.classGrade})
                        </option>
                      ))}
                    </select>
                  </div>

                  <ParentSimulator
                    student={activeParentStudent}
                    onPayBalance={handleParentPayBalance}
                    onRefresh={() => {
                      triggerFcmNotification(
                        'Data Synced',
                        'Listening to real-time Cloud Firestore snapshot streams.',
                        'attendance'
                      );
                    }}
                  />
                </div>

                {/* Right: Teacher Mobile Device */}
                <div>
                  <div className="mb-3 px-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Teacher Admin App</span>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/30">
                        Admin Authorized
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Mark attendance or update fees to trigger live FCM push notifications to the parent
                    </p>
                  </div>

                  <TeacherSimulator
                    students={students}
                    onMarkAttendance={handleTeacherMarkAttendance}
                    onUpdateFees={handleTeacherUpdateFees}
                    onSendAnnouncement={handleSendAnnouncement}
                    onAddStudent={handleTeacherAddStudent}
                    onSendBulkFeeReminders={handleSendBulkFeeReminders}
                  />
                </div>
              </div>
            )}

            {simMode === 'parent' && (
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Parent Mobile App</h3>
                  <select
                    value={selectedParentStudentId}
                    onChange={(e) => setSelectedParentStudentId(e.target.value)}
                    className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1 cursor-pointer"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.classGrade})
                      </option>
                    ))}
                  </select>
                </div>
                <ParentSimulator
                  student={activeParentStudent}
                  onPayBalance={handleParentPayBalance}
                  onRefresh={() => triggerFcmNotification('Data Synced', 'Firestore stream updated.', 'attendance')}
                />
              </div>
            )}

            {simMode === 'teacher' && (
              <div className="max-w-md mx-auto">
                <TeacherSimulator
                  students={students}
                  onMarkAttendance={handleTeacherMarkAttendance}
                  onUpdateFees={handleTeacherUpdateFees}
                  onSendAnnouncement={handleSendAnnouncement}
                  onAddStudent={handleTeacherAddStudent}
                  onSendBulkFeeReminders={handleSendBulkFeeReminders}
                />
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Code & Deliverables Studio */}
        {activeViewMode === 'code' && (
          <div className="space-y-6">
            <CodeStudio />
          </div>
        )}

        {/* Deliverables Overview Checklist Box */}
        <section id="deliverables" className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Requested Deliverables Status Checklist
            </h3>
            <button
              onClick={() => setActiveViewMode('code')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Inspect All Code</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-950/70 border border-slate-800/70 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  1. Step-by-Step Firebase Setup Guide
                </h4>
                <p className="text-slate-400 mt-1">
                  Covers Phone OTP SMS setup, Android SHA-1/SHA-256 fingerprints, Firestore production provisioning, Storage bucket rules, FCM APNs/Android 13+ configuration, and FlutterFire CLI initialization.
                </p>
                <div className="mt-2 text-[11px] font-mono text-indigo-300">
                  File: firebase/SETUP_GUIDE.md
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/70 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  2. Complete Firestore Security Rules
                </h4>
                <p className="text-slate-400 mt-1">
                  Hardcoded 2 Teacher admin phone numbers with full read/write across Std 2–12. Strict parent phone matching rule ensuring parents can only read documents where parent_phone matches their authenticated token.
                </p>
                <div className="mt-2 text-[11px] font-mono text-indigo-300">
                  File: firebase/firestore.rules
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/70 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  3. Node.js Cloud Functions for FCM Notifications
                </h4>
                <p className="text-slate-400 mt-1">
                  Triggers for attendance record creation (Present/Absent push alert), fee update (dynamic pending calculation & receipt availability alert), and callable custom announcement broadcaster.
                </p>
                <div className="mt-2 text-[11px] font-mono text-indigo-300">
                  File: firebase/functions/index.js
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800/70 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-white text-sm">
                  4. Flutter Parent Dashboard UI (Fees, Calendar, Pop-ups)
                </h4>
                <p className="text-slate-400 mt-1">
                  Dynamic fee calculations, conditional receipt download button (hidden until pending == 0 and receipt_pdf_url is not null), on-page-load alert dialog popup, and TableCalendar attendance colored green/red.
                </p>
                <div className="mt-2 text-[11px] font-mono text-indigo-300">
                  File: flutter_educare/lib/screens/parent_dashboard_screen.dart
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Real-Time FCM Notification Toast */}
      <NotificationToast
        notification={latestNotification}
        onDismiss={() => setLatestNotification(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 px-6 lg:px-12 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-slate-400" />
          <span>Educare Coaching Classes · Academic Management & Communication Suite</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Standards: Std 2 to 12</span>
          <span>·</span>
          <span>Flutter 3.x</span>
          <span>·</span>
          <span>Firebase v12 / v2</span>
        </div>
      </footer>
    </div>
  );
}
