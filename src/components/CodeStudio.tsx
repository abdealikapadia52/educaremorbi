import React, { useState } from 'react';
import {
  Code,
  Copy,
  Check,
  FileText,
  Shield,
  Zap,
  Smartphone,
  Layers,
  ExternalLink,
  ChevronRight,
  Database,
  Terminal,
  Download,
} from 'lucide-react';

export const CodeStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'guide' | 'rules' | 'functions' | 'parent_ui' | 'teacher_ui' | 'schema'
  >('parent_ui');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const codeSnippets = {
    setupGuide: `# Educare Coaching Classes: Firebase & Flutter Setup Guide

## 1. Firebase Project Initialization & FlutterFire Setup
# Install Firebase CLI globally (if not installed)
npm install -g firebase-tools
firebase login

# Activate FlutterFire CLI
dart pub global activate flutterfire_cli

# Auto-configure your Flutter app for Android and iOS:
flutterfire configure --project=educare-coaching-classes

## 2. Phone OTP Authentication Configuration
1. In Firebase Console -> Build -> Authentication -> Sign-in method -> Enable "Phone".
2. Under "Phone numbers for testing", add:
   - Teacher 1: +91 98765 00001 (OTP: 123456)
   - Teacher 2: +91 98765 00002 (OTP: 123456)
   - Parent:    +91 98765 43210 (OTP: 123456)
3. For Android SHA-1 & SHA-256 (mandatory for Phone Auth SafetyNet / Play Integrity):
   cd android && ./gradlew signingReport
   Add SHA-1 & SHA-256 to Project Settings -> Your Apps -> Android App.

## 3. Cloud Firestore Provisioning & Indexing
1. Firebase Console -> Firestore Database -> Create database in Production Mode.
2. Nearest region: asia-south1 (Mumbai) or your chosen regional zone.
3. Deploy security rules:
   firebase deploy --only firestore:rules

## 4. Firebase Cloud Storage Setup (PDF Receipts)
1. Firebase Console -> Storage -> Get Started.
2. Deploy storage rules:
   firebase deploy --only storage
3. Receipts path convention:
   /receipts/{student_id}/fee_receipt_{receipt_id}.pdf

## 5. FCM Push Notifications & Node.js Cloud Functions
1. In functions folder:
   cd firebase/functions && npm install
   firebase deploy --only functions
2. Android 13+ Notification Channel in AndroidManifest.xml:
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>`,

    rules: `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // =========================================================================
    // EDUCARE COACHING CLASSES - FIRESTORE SECURITY RULES
    // Roles:
    // 1. Teachers: Hardcoded phone numbers have full read/write across all grades.
    // 2. Parents: Read-only access strictly restricted to documents where
    //    parent_phone matches their authenticated Firebase Phone number.
    // =========================================================================

    function isTeacher() {
      return request.auth != null && (
        request.auth.token.phone_number == '+919876500001' ||
        request.auth.token.phone_number == '+919876500002'
      );
    }

    function isAuthenticated() {
      return request.auth != null && request.auth.token.phone_number != null;
    }

    // -------------------------------------------------------------------------
    // USERS COLLECTION
    // Schema: { uid, phone_number, role, fcm_token, updated_at }
    // -------------------------------------------------------------------------
    match /users/{userId} {
      allow read: if isTeacher() || (isAuthenticated() && request.auth.uid == userId);
      allow create, update: if isTeacher() || (isAuthenticated() && request.auth.uid == userId);
      allow delete: if isTeacher();
    }

    // -------------------------------------------------------------------------
    // STUDENTS COLLECTION
    // Schema: { student_id, name, parent_phone, class_grade, created_at }
    // -------------------------------------------------------------------------
    match /students/{studentId} {
      // Teachers: full read/write across all Std 2 to 12 students.
      // Parents: CAN ONLY READ students where parent_phone matches their auth phone.
      allow read: if isTeacher() || (
        isAuthenticated() && resource.data.parent_phone == request.auth.token.phone_number
      );
      allow write: if isTeacher();

      // -----------------------------------------------------------------------
      // FEES SUB-COLLECTION (students/{studentId}/fees/{feeId})
      // Schema: { total_fees, collected, pending, receipt_pdf_url }
      // -----------------------------------------------------------------------
      match /fees/{feeId} {
        allow read: if isTeacher() || (
          isAuthenticated() &&
          get(/databases/$(database)/documents/students/$(studentId)).data.parent_phone == request.auth.token.phone_number
        );
        allow write: if isTeacher();
      }

      // -----------------------------------------------------------------------
      // ATTENDANCE SUB-COLLECTION (students/{studentId}/attendance/{attendanceId})
      // Schema: { date: timestamp, status: 'present' | 'absent' }
      // -----------------------------------------------------------------------
      match /attendance/{attendanceId} {
        allow read: if isTeacher() || (
          isAuthenticated() &&
          get(/databases/$(database)/documents/students/$(studentId)).data.parent_phone == request.auth.token.phone_number
        );
        allow write: if isTeacher();
      }
    }

    // -------------------------------------------------------------------------
    // ANNOUNCEMENTS COLLECTION
    // -------------------------------------------------------------------------
    match /announcements/{announcementId} {
      allow read: if isTeacher() || (
        isAuthenticated() && (
          resource.data.target == 'all' ||
          resource.data.target == request.auth.token.phone_number
        )
      );
      allow write: if isTeacher();
    }
  }
}`,

    functions: `/**
 * Educare Coaching Classes - Node.js Firebase Cloud Functions (v2)
 * Automated FCM push notifications for Attendance, Fees & Announcements
 */

const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const TEACHER_PHONES = ["+919876500001", "+919876500002"];

async function getParentFcmToken(parentPhone) {
  if (!parentPhone) return null;
  const snap = await db.collection("users")
    .where("phone_number", "==", parentPhone)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data().fcm_token || null;
}

/**
 * TRIGGER 1: Automated Push Notification on Attendance Creation or Update
 */
exports.onAttendanceRecordCreated = onDocumentCreated(
  "students/{studentId}/attendance/{attendanceId}",
  async (event) => {
    const studentId = event.params.studentId;
    const attendanceData = event.data?.data();
    if (!attendanceData) return null;

    try {
      const studentDoc = await db.collection("students").doc(studentId).get();
      if (!studentDoc.exists) return null;

      const student = studentDoc.data();
      const parentPhone = student.parent_phone;
      const studentName = student.name || "Student";
      const status = (attendanceData.status || "present").toUpperCase();

      const parentFcmToken = await getParentFcmToken(parentPhone);
      if (!parentFcmToken) return null;

      const isPresent = status === "PRESENT";
      const message = {
        token: parentFcmToken,
        notification: {
          title: \`Attendance Alert: \${studentName}\`,
          body: isPresent
            ? \`\${studentName} is marked PRESENT for coaching class today.\`
            : \`Notice: \${studentName} is marked ABSENT today. Please contact Educare if unplanned.\`
        },
        data: {
          type: "attendance_update",
          student_id: studentId,
          status: status.toLowerCase()
        }
      };

      return await messaging.send(message);
    } catch (error) {
      console.error("[FCM Attendance Error]:", error);
      return null;
    }
  }
);

/**
 * TRIGGER 2: Automated Push Notification on Fee Update & Dynamic Calculation
 */
exports.onFeeUpdated = onDocumentWritten(
  "students/{studentId}/fees/{feeId}",
  async (event) => {
    const studentId = event.params.studentId;
    const feeData = event.data?.after?.data();
    if (!feeData) return null;

    try {
      const studentDoc = await db.collection("students").doc(studentId).get();
      if (!studentDoc.exists) return null;

      const student = studentDoc.data();
      const parentPhone = student.parent_phone;
      const studentName = student.name || "Student";

      // Dynamic calculation
      const totalFees = Number(feeData.total_fees || 0);
      const collected = Number(feeData.collected || 0);
      const pending = Math.max(0, totalFees - collected);
      const receiptPdfUrl = feeData.receipt_pdf_url;

      const parentFcmToken = await getParentFcmToken(parentPhone);
      if (!parentFcmToken) return null;

      let title = "";
      let body = "";

      // Conditional receipt check: pending == 0 AND receipt_pdf_url exists
      if (pending === 0 && receiptPdfUrl) {
        title = \`Fee Receipt Ready: \${studentName}\`;
        body = \`All dues cleared! Your official fee receipt is ready for download in the parent app.\`;
      } else {
        title = \`Fee Status Update: \${studentName}\`;
        body = \`Total: ₹\${totalFees.toLocaleString('en-IN')} | Paid: ₹\${collected.toLocaleString('en-IN')} | Pending: ₹\${pending.toLocaleString('en-IN')}.\`;
      }

      return await messaging.send({
        token: parentFcmToken,
        notification: { title, body },
        data: { type: "fee_update", student_id: studentId, pending: String(pending) }
      });
    } catch (error) {
      console.error("[FCM Fee Error]:", error);
      return null;
    }
  }
);

/**
 * TRIGGER 3: Custom Announcements from Teacher Dashboard
 */
exports.sendCustomAnnouncement = onCall(async (request) => {
  const callerPhone = request.auth?.token?.phone_number;
  if (!callerPhone || !TEACHER_PHONES.includes(callerPhone)) {
    throw new HttpsError("permission-denied", "Unauthorized. Only teachers can broadcast announcements.");
  }

  const { title, message, target, targetPhone } = request.data;
  if (target === "ALL") {
    return await messaging.send({
      topic: "all_parents",
      notification: { title: \`Educare Announcement: \${title}\`, body: message }
    });
  } else {
    const fcmToken = await getParentFcmToken(targetPhone);
    if (!fcmToken) throw new HttpsError("not-found", "Parent FCM token not registered.");
    return await messaging.send({
      token: fcmToken,
      notification: { title: \`Educare: \${title}\`, body: message }
    });
  }
});

/**
 * TRIGGER 4: One-Click Bulk Fee Payment Reminder Push Notifications
 */
exports.sendBulkFeeReminders = onCall(async (request) => {
  const callerPhone = request.auth?.token?.phone_number;
  if (!callerPhone || !TEACHER_PHONES.includes(callerPhone)) {
    throw new HttpsError("permission-denied", "Unauthorized. Only teachers can send reminders.");
  }

  const { classGrade } = request.data || {};
  let query = db.collection("students");
  if (classGrade && classGrade !== "ALL") query = query.where("class_grade", "==", classGrade);

  const snapshot = await query.get();
  let count = 0;

  for (const doc of snapshot.docs) {
    const s = doc.data();
    const feeDoc = await doc.ref.collection("fees").doc("current").get();
    if (!feeDoc.exists) continue;
    const fee = feeDoc.data();
    const pending = (fee.total_fees || 0) - (fee.collected || 0);

    if (pending > 0) {
      const token = await getParentFcmToken(s.parent_phone);
      if (token) {
        await messaging.send({
          token,
          notification: {
            title: "Fee Reminder • Educare Classes",
            body: \`Gentle reminder: Balance of ₹\${pending} is pending for \${s.name} (\${s.class_grade}).\`
          },
          data: { type: "fee_reminder", student_id: doc.id, pending: String(pending) }
        });
        count++;
      }
    }
  }

  return { success: true, remindersSent: count };
});`,

    parentUi: `import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import '../models/student_models.dart';

class ParentDashboardScreen extends StatefulWidget {
  final String parentPhoneNumber; // Authenticated parent's phone e.g. "+919876543210"

  const ParentDashboardScreen({Key? key, required this.parentPhoneNumber}) : super(key: key);

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  Student? _currentStudent;
  bool _isLoading = true;
  bool _hasCheckedTodayAlert = false;

  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<DateTime, AttendanceStatus> _attendanceMap = {};

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _initParentDashboard();
  }

  Future<void> _initParentDashboard() async {
    final query = await _firestore
        .collection('students')
        .where('parent_phone', isEqualTo: widget.parentPhoneNumber)
        .limit(1)
        .get();

    if (query.docs.isNotEmpty) {
      setState(() {
        _currentStudent = Student.fromFirestore(query.docs.first);
      });
      await _loadAttendance();

      // =======================================================================
      // FEATURE REQUIREMENT: "On Page Load Alert"
      // On the parent's home screen, check today's attendance record.
      // If it exists, trigger an Alert Dialog pop-up: "Your child is marked [Status] today."
      // =======================================================================
      if (!_hasCheckedTodayAlert) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _checkTodayAttendanceAndShowAlert();
        });
      }
    }
    setState(() => _isLoading = false);
  }

  Future<void> _checkTodayAttendanceAndShowAlert() async {
    if (_currentStudent == null) return;
    _hasCheckedTodayAlert = true;

    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59);

    final snap = await _firestore
        .collection('students')
        .doc(_currentStudent!.studentId)
        .collection('attendance')
        .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
        .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
        .limit(1)
        .get();

    if (snap.docs.isNotEmpty && mounted) {
      final status = (snap.docs.first.data()['status'] as String? ?? 'present').toUpperCase();
      final isPresent = status == 'PRESENT';

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text("Today's Attendance", style: const TextStyle(fontWeight: FontWeight.bold)),
          content: Text(
            "Your child is marked $status today.",
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: isPresent ? Colors.green.shade700 : Colors.red.shade700,
            ),
          ),
          actions: [
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: isPresent ? Colors.green.shade700 : Colors.red.shade700,
              ),
              onPressed: () => Navigator.pop(ctx),
              child: const Text("Acknowledge"),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _loadAttendance() async {
    final snap = await _firestore
        .collection('students')
        .doc(_currentStudent!.studentId)
        .collection('attendance')
        .get();

    final Map<DateTime, AttendanceStatus> map = {};
    for (var doc in snap.docs) {
      final record = AttendanceRecord.fromFirestore(doc);
      final normalized = DateTime(record.date.year, record.date.month, record.date.day);
      map[normalized] = record.status;
    }
    setState(() => _attendanceMap = map);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    if (_currentStudent == null) return const Scaffold(body: Center(child: Text("No student linked.")));

    return Scaffold(
      appBar: AppBar(
        title: Text("\${_currentStudent!.name} • \${_currentStudent!.classGrade}"),
        backgroundColor: Colors.indigo.shade800,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        children: [
          // ===================================================================
          // FEATURE 1: Fee Tracking & Dynamic Calculation + Conditional Receipt
          // ===================================================================
          StreamBuilder<QuerySnapshot>(
            stream: _firestore
                .collection('students')
                .doc(_currentStudent!.studentId)
                .collection('fees')
                .limit(1)
                .snapshots(),
            builder: (context, snapshot) {
              final fee = snapshot.hasData && snapshot.data!.docs.isNotEmpty
                  ? FeeRecord.fromFirestore(snapshot.data!.docs.first)
                  : FeeRecord(totalFees: 0, collected: 0, pending: 0);

              // Dynamic pending calculation: pending = totalFees - collected
              final double pending = (fee.totalFees - fee.collected) > 0 ? (fee.totalFees - fee.collected) : 0.0;

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: BorderSide(color: Colors.grey.shade200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("Fee Breakdown", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildFeeItem("Total", fee.totalFees, Colors.black87),
                          _buildFeeItem("Collected", fee.collected, Colors.green.shade700),
                          _buildFeeItem("Pending", pending, pending > 0 ? Colors.red.shade700 : Colors.green.shade700),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // CONDITIONAL VISIBILITY:
                      // Hidden until pending == 0 AND receipt_pdf_url is not null.
                      if (pending == 0 && fee.receiptPdfUrl != null && fee.receiptPdfUrl!.isNotEmpty)
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo.shade700, foregroundColor: Colors.white),
                            icon: const Icon(Icons.download),
                            label: const Text("Download Fee Receipt (PDF)"),
                            onPressed: () => launchUrl(Uri.parse(fee.receiptPdfUrl!)),
                          ),
                        )
                      else
                        Text(
                          pending > 0
                            ? "Receipt unlocks once remaining ₹\${pending.toInt()} is paid."
                            : "Awaiting receipt upload from administration.",
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),

          const SizedBox(height: 20),

          // ===================================================================
          // FEATURE 2: Attendance History & TableCalendar Widget
          // Colors: Green for Present, Red for Absent
          // ===================================================================
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.grey.shade200)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: TableCalendar(
                firstDay: DateTime.utc(2025, 1, 1),
                lastDay: DateTime.utc(2027, 12, 31),
                focusedDay: _focusedDay,
                calendarFormat: CalendarFormat.month,
                selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                calendarBuilders: CalendarBuilders(
                  defaultBuilder: (context, day, focusedDay) => _buildCalendarCell(day),
                  todayBuilder: (context, day, focusedDay) => _buildCalendarCell(day, isToday: true),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeeItem(String label, double amount, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
          const SizedBox(height: 2),
          Text("₹\${amount.toInt()}", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }

  Widget _buildCalendarCell(DateTime day, {bool isToday = false}) {
    final normalized = DateTime(day.year, day.month, day.day);
    final status = _attendanceMap[normalized];

    Color? bg;
    Color text = Colors.black87;

    if (status == AttendanceStatus.present) {
      bg = Colors.green.shade600;
      text = Colors.white;
    } else if (status == AttendanceStatus.absent) {
      bg = Colors.red.shade600;
      text = Colors.white;
    }

    return Container(
      margin: const EdgeInsets.all(4),
      alignment: Alignment.center,
      decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
      child: Text('\${day.day}', style: TextStyle(color: text, fontWeight: isToday ? FontWeight.bold : FontWeight.normal)),
    );
  }
}`,

    teacherUi: `// =============================================================================
// TEACHER ADMIN: ADD STUDENT ENROLLMENT PANEL & ANNOUNCEMENT MODAL
// =============================================================================

// 1. ADMIN PANEL: ENROLL NEW STUDENT IN FIRESTORE
void _showAddStudentDialog(BuildContext context) {
  final nameCtrl = TextEditingController();
  final rollCtrl = TextEditingController(text: "10\${DateTime.now().millisecond}");
  final phoneCtrl = TextEditingController(text: "+91 ");
  final totalFeesCtrl = TextEditingController(text: "45000");
  final collectedCtrl = TextEditingController(text: "0");
  String grade = "Std 10";

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) {
        final double total = double.tryParse(totalFeesCtrl.text) ?? 0;
        final double collected = double.tryParse(collectedCtrl.text) ?? 0;
        final double pending = (total - collected) > 0 ? (total - collected) : 0;

        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.person_add_rounded, color: Colors.indigo),
              SizedBox(width: 8),
              Text("Enroll New Student"),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Student Name *")),
                DropdownButtonFormField<String>(
                  value: grade,
                  items: ["Std 2", "Std 3", "Std 4", "Std 5", "Std 6", "Std 7", "Std 8", "Std 9", "Std 10", "Std 11", "Std 12"]
                      .map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                  onChanged: (val) => setModalState(() => grade = val ?? grade),
                ),
                TextField(controller: rollCtrl, decoration: const InputDecoration(labelText: "Roll Number")),
                TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: "Parent Phone (OTP Login) *")),
                Row(
                  children: [
                    Expanded(child: TextField(controller: totalFeesCtrl, decoration: const InputDecoration(labelText: "Total Fee (₹)"))),
                    const SizedBox(width: 8),
                    Expanded(child: TextField(controller: collectedCtrl, decoration: const InputDecoration(labelText: "Paid (₹)"))),
                  ],
                ),
                const SizedBox(height: 8),
                Text("Pending: ₹\${pending.toInt()}", style: TextStyle(color: pending > 0 ? Colors.red : Colors.green)),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
            FilledButton(
              onPressed: () async {
                if (nameCtrl.text.trim().isEmpty || phoneCtrl.text.trim().isEmpty) return;
                Navigator.pop(ctx);

                // Create student document
                final ref = await FirebaseFirestore.instance.collection('students').add({
                  'name': nameCtrl.text.trim(),
                  'class_grade': grade,
                  'parent_phone': phoneCtrl.text.trim(),
                  'roll_number': rollCtrl.text.trim(),
                  'created_at': FieldValue.serverTimestamp(),
                });

                // Set initial fees sub-collection document
                await ref.collection('fees').doc('current').set({
                  'total_fees': total,
                  'collected': collected,
                  'pending': pending,
                  'receipt_pdf_url': pending == 0 ? "https://storage.googleapis.com/.../receipt.pdf" : null,
                  'updated_at': FieldValue.serverTimestamp(),
                });
              },
              child: const Text("Save & Enroll"),
            ),
          ],
        );
      },
    ),
  );
}

// 2. TEACHER ANNOUNCEMENT DISPATCHER (All Parents or Specific Parent Phone)
void _showAnnouncementDialog(BuildContext context) {
  String target = "ALL"; // "ALL" or "SPECIFIC"
  String? parentPhone;
  final titleCtrl = TextEditingController();
  final msgCtrl = TextEditingController();

  showDialog(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (context, setModalState) => AlertDialog(
        title: const Text("Send Custom Announcement"),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: target,
              items: const [
                DropdownMenuItem(value: "ALL", child: Text("All Parents (Topic Broadcast)")),
                DropdownMenuItem(value: "SPECIFIC", child: Text("Specific Parent Phone")),
              ],
              onChanged: (val) => setModalState(() => target = val ?? "ALL"),
            ),
            if (target == "SPECIFIC")
              TextField(
                decoration: const InputDecoration(labelText: "Parent Phone Number"),
                onChanged: (val) => parentPhone = val.trim(),
              ),
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: "Title")),
            TextField(controller: msgCtrl, maxLines: 3, decoration: const InputDecoration(labelText: "Message Body")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await FirebaseFunctions.instance.httpsCallable('sendCustomAnnouncement').call({
                'title': titleCtrl.text.trim(),
                'message': msgCtrl.text.trim(),
                'target': target,
                'targetPhone': parentPhone,
              });
            },
            child: const Text("Send FCM Notification"),
          ),
        ],
      ),
    ),
  );
}

// 3. SEARCH BAR & MULTI-FIELD FILTERING (Name, Grade, Phone)
Widget _buildSearchBar() {
  return TextField(
    controller: _searchController,
    decoration: InputDecoration(
      hintText: "Search by student name, grade (Std 10), or phone...",
      prefixIcon: const Icon(Icons.search),
      suffixIcon: _searchQuery.isNotEmpty
          ? IconButton(
              icon: const Icon(Icons.clear),
              onPressed: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
            )
          : null,
    ),
    onChanged: (val) => setState(() => _searchQuery = val.trim()),
  );
}

// 4. EXPORT MONTHLY STUDENT ATTENDANCE REPORT AS CSV
void _showExportCsvDialog(BuildContext context) {
  int selectedYear = DateTime.now().year;
  int selectedMonth = DateTime.now().month;
  String gradeScope = _selectedGrade;
  bool allGrades = false;

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.table_chart_rounded, color: Colors.indigo),
          SizedBox(width: 8),
          Text("Export Attendance CSV"),
        ],
      ),
      content: const Text(
        "Exports monthly student register with daily present/absent logs, working days, and % rates as RFC-4180 CSV.",
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
        FilledButton.icon(
          icon: const Icon(Icons.download, size: 16),
          label: const Text("Generate CSV"),
          onPressed: () async {
            Navigator.pop(ctx);
            await _processAndExportCsv(
              year: selectedYear,
              month: selectedMonth,
              grade: allGrades ? "All_Grades" : gradeScope,
            );
          },
        ),
      ],
    ),
  );
}

Future<void> _processAndExportCsv({required int year, required int month, required String grade}) async {
  // Query students from Firestore
  Query query = FirebaseFirestore.instance.collection('students');
  if (grade != "All_Grades") query = query.where('class_grade', isEqualTo: grade);
  final snap = await query.get();

  final daysInMonth = DateTime(year, month + 1, 0).day;
  final monthName = DateFormat('MMMM').format(DateTime(year, month, 1));

  // Build CSV headers: Roll, Name, Grade, Phone, Working Days, Present, Absent, Rate %, Day 1..N
  final headers = ["Roll No", "Student Name", "Class Grade", "Parent Phone", "Working Days", "Present", "Absent", "Rate (%)"];
  for (int d = 1; d <= daysInMonth; d++) headers.add("Day $d");

  final buffer = StringBuffer()..write('\uFEFF')..writeln(headers.join(','));

  for (final doc in snap.docs) {
    final s = Student.fromFirestore(doc);
    final attSnap = await doc.reference.collection('attendance')
      .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(DateTime(year, month, 1)))
      .where('date', isLessThanOrEqualTo: Timestamp.fromDate(DateTime(year, month, daysInMonth, 23, 59, 59)))
      .get();

    final dayMap = {for (var a in attSnap.docs) (a['date'] as Timestamp).toDate().day: a['status']};
    int present = dayMap.values.where((v) => v == 'present').length;
    int absent = dayMap.values.where((v) => v == 'absent').length;
    final total = present + absent;
    final rate = total > 0 ? (present / total * 100).toStringAsFixed(1) : "0.0";

    final row = [s.rollNumber ?? '-', s.name, s.classGrade, s.parentPhone, total, present, absent, "$rate%"];
    for (int d = 1; d <= daysInMonth; d++) {
      row.add(DateTime(year, month, d).weekday == 7 ? "Sunday" : (dayMap[d] ?? "-"));
    }
    buffer.writeln(row.join(','));
  }

  final temp = await getTemporaryDirectory();
  final file = File('\${temp.path}/Educare_Attendance_\${grade}_\${monthName}_\$year.csv');
  await file.writeAsString(buffer.toString());
  await Share.shareXFiles([XFile(file.path, mimeType: 'text/csv')]);
}

// 5. FEES REPORT (ALL STANDARDS & STANDARD-WISE FINANCIAL LEDGER)
void _showFeeReportsDialog(BuildContext context) {
  String selectedScope = "ALL"; // "ALL" or specific standard like "Std 10"

  showDialog(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.account_balance_wallet_rounded, color: Colors.emerald),
          SizedBox(width: 8),
          Text("Fees Report: All & Standard-Wise"),
        ],
      ),
      content: const Text(
        "Summarizes Target Billed Fees, Collected Revenue, and Outstanding Dues with collection % across all standards or individual grades.",
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Close")),
        FilledButton.icon(
          icon: const Icon(Icons.download, size: 16),
          label: const Text("Export Fees CSV"),
          onPressed: () async {
            Navigator.pop(ctx);
            // Process and export CSV across all students or selected standard
            await _processAndExportFeesCsv(scope: selectedScope);
          },
        ),
      ],
    ),
  );
}`,
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Educare Architecture & Code Studio
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Production-ready Flutter (Dart), Firestore security rules, Cloud Functions & setup guide
          </p>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('parent_ui')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'parent_ui'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flutter Parent UI
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Firestore Rules
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'functions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cloud Functions
          </button>
          <button
            onClick={() => setActiveTab('teacher_ui')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'teacher_ui'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teacher UI Snippet
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Setup Guide
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schema Tree
          </button>
        </div>
      </div>

      {/* Main Code View Container */}
      <div className="flex-1 mt-5 flex flex-col min-h-[500px]">
        {activeTab === 'parent_ui' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-400">
              <span className="font-mono text-indigo-300">
                lib/screens/parent_dashboard_screen.dart
              </span>
              <button
                onClick={() => handleCopy('parent_ui', codeSnippets.parentUi)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedKey === 'parent_ui' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Dart Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto text-[12px] font-mono leading-relaxed text-slate-300 selection:bg-indigo-500/30">
              <code>{codeSnippets.parentUi}</code>
            </pre>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-400">
              <span className="font-mono text-indigo-300">firebase/firestore.rules</span>
              <button
                onClick={() => handleCopy('rules', codeSnippets.rules)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedKey === 'rules' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Rules</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto text-[12px] font-mono leading-relaxed text-slate-300 selection:bg-indigo-500/30">
              <code>{codeSnippets.rules}</code>
            </pre>
          </div>
        )}

        {activeTab === 'functions' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-400">
              <span className="font-mono text-indigo-300">firebase/functions/index.js</span>
              <button
                onClick={() => handleCopy('functions', codeSnippets.functions)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedKey === 'functions' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Functions</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto text-[12px] font-mono leading-relaxed text-slate-300 selection:bg-indigo-500/30">
              <code>{codeSnippets.functions}</code>
            </pre>
          </div>
        )}

        {activeTab === 'teacher_ui' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-400">
              <span className="font-mono text-indigo-300">
                lib/screens/teacher_announcements_snippet.dart
              </span>
              <button
                onClick={() => handleCopy('teacher_ui', codeSnippets.teacherUi)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedKey === 'teacher_ui' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto text-[12px] font-mono leading-relaxed text-slate-300 selection:bg-indigo-500/30">
              <code>{codeSnippets.teacherUi}</code>
            </pre>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between pb-3 text-xs text-slate-400">
              <span className="font-mono text-indigo-300">firebase/SETUP_GUIDE.md</span>
              <button
                onClick={() => handleCopy('guide', codeSnippets.setupGuide)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                {copiedKey === 'guide' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Setup Guide</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 bg-slate-950 border border-slate-800/90 rounded-2xl overflow-x-auto text-[12px] font-mono leading-relaxed text-slate-300 selection:bg-indigo-500/30">
              <code>{codeSnippets.setupGuide}</code>
            </pre>
          </div>
        )}

        {activeTab === 'schema' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4" />
                  <span>Collection: users</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Stores user profiles, roles, and FCM registration tokens.
                </p>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
{`{
  "uid": "auth_uid_12345",
  "phone_number": "+919876543210",
  "role": "parent", // or "teacher"
  "fcm_token": "eX_90v1K...",
  "updated_at": "Timestamp"
}`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4" />
                  <span>Collection: students</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Student profiles across Std 2 to 12. Read restricted by parent_phone.
                </p>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
{`{
  "student_id": "STU_1001",
  "name": "Aarav Sharma",
  "parent_phone": "+919876543210",
  "class_grade": "Std 10",
  "created_at": "Timestamp"
}`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4" />
                  <span>Sub-Collection: students/{'{id}'}/fees</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Fee status and receipt PDF storage URL.
                </p>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
{`{
  "total_fees": 45000,
  "collected": 45000,
  "pending": 0, // dynamic: total_fees - collected
  "receipt_pdf_url": "gs://educare.../receipt.pdf"
}`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4" />
                  <span>Sub-Collection: students/{'{id}'}/attendance</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Daily attendance logs mapped to Flutter TableCalendar.
                </p>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
{`{
  "date": "Timestamp (2026-11-06T00:00:00Z)",
  "status": "present", // or "absent"
  "marked_by": "+919876500001",
  "updated_at": "Timestamp"
}`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl md:col-span-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4" />
                  <span>Sub-Collection: students/{'{id}'}/transactions (Payment History)</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Chronological log of all previous fee payments for full parental transparency.
                </p>
                <pre className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80">
{`{
  "date": "Timestamp (2026-06-15T10:30:00Z)",
  "amount": 20000,
  "payment_mode": "UPI", // "NetBanking", "Bank Transfer", "Cheque", "Cash"
  "reference_no": "UPI/61720849102",
  "status": "verified",
  "note": "Admission & Term 1 Study Materials"
}`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
