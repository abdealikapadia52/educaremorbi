import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:table_calendar/table_calendar.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import '../models/student_models.dart';

class ParentDashboardScreen extends StatefulWidget {
  final String parentPhoneNumber; // Authenticated parent's phone e.g. "+919876543210"

  const ParentDashboardScreen({
    Key? key,
    required this.parentPhoneNumber,
  }) : super(key: key);

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  Student? _currentStudent;
  bool _isLoading = true;
  bool _hasCheckedTodayAttendance = false;

  // Calendar State
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;
  Map<DateTime, AttendanceStatus> _attendanceMap = {};

  // Currency Formatter
  final NumberFormat _currencyFormatter = NumberFormat.currency(
    locale: 'en_IN',
    symbol: '₹',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _selectedDay = _focusedDay;
    _initializeParentDashboard();
  }

  Future<void> _initializeParentDashboard() async {
    try {
      // 1. Query the student registered with this parent's phone number
      final querySnapshot = await _firestore
          .collection('students')
          .where('parent_phone', isEqualTo: widget.parentPhoneNumber)
          .limit(1)
          .get();

      if (querySnapshot.docs.isNotEmpty) {
        setState(() {
          _currentStudent = Student.fromFirestore(querySnapshot.docs.first);
        });

        // 2. Load attendance history for the student
        await _loadAttendanceHistory();

        // 3. FEATURE REQUIREMENT: "On Page Load Alert"
        // Check today's attendance record and trigger Alert Dialog if present
        if (!_hasCheckedTodayAttendance) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _checkTodayAttendanceAndShowAlert();
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading parent dashboard: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// Checks if an attendance record exists for today and triggers the pop-up dialog
  Future<void> _checkTodayAttendanceAndShowAlert() async {
    if (_currentStudent == null) return;
    _hasCheckedTodayAttendance = true;

    final now = DateTime.now();
    final startOfDay = DateTime(now.year, now.month, now.day);
    final endOfDay = DateTime(now.year, now.month, now.day, 23, 59, 59);

    try {
      final snap = await _firestore
          .collection('students')
          .doc(_currentStudent!.studentId)
          .collection('attendance')
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfDay))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfDay))
          .limit(1)
          .get();

      if (snap.docs.isNotEmpty && mounted) {
        final data = snap.docs.first.data();
        final statusRaw = (data['status'] as String? ?? 'present').toUpperCase();
        final isPresent = statusRaw == 'PRESENT';

        // Show Requirement Alert Dialog
        showDialog(
          context: context,
          barrierDismissible: true,
          builder: (BuildContext ctx) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isPresent ? Colors.green.shade50 : Colors.red.shade50,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isPresent ? Icons.check_circle_rounded : Icons.cancel_rounded,
                      color: isPresent ? Colors.green.shade600 : Colors.red.shade600,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      "Today's Attendance",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Your child is marked $statusRaw today.",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: isPresent ? Colors.green.shade700 : Colors.red.shade700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isPresent
                      ? "${_currentStudent!.name} attended coaching session on time."
                      : "${_currentStudent!.name} is marked absent today. If this is an error, please reach out to the class teacher.",
                    style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  ),
                ],
              ),
              actions: [
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: isPresent ? Colors.green.shade700 : Colors.red.shade700,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text("Acknowledge"),
                ),
              ],
            );
          },
        );
      }
    } catch (e) {
      debugPrint("Error checking today's attendance alert: $e");
    }
  }

  /// Query attendance sub-collection and map dates to status
  Future<void> _loadAttendanceHistory() async {
    if (_currentStudent == null) return;

    final snap = await _firestore
        .collection('students')
        .doc(_currentStudent!.studentId)
        .collection('attendance')
        .get();

    final Map<DateTime, AttendanceStatus> map = {};
    for (var doc in snap.docs) {
      final record = AttendanceRecord.fromFirestore(doc);
      final normalizedDate = DateTime(record.date.year, record.date.month, record.date.day);
      map[normalizedDate] = record.status;
    }

    if (mounted) {
      setState(() {
        _attendanceMap = map;
      });
    }
  }

  /// Downloads and opens the official PDF fee receipt from Firebase Storage
  Future<void> _downloadAndOpenReceipt(String receiptUrl) async {
    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Downloading fee receipt from Firebase Storage..."),
          duration: Duration(seconds: 2),
        ),
      );

      // Method 1: If it's a storage gs:// reference, fetch download URL
      String downloadUrl = receiptUrl;
      if (receiptUrl.startsWith('gs://')) {
        final ref = FirebaseStorage.instance.refFromURL(receiptUrl);
        downloadUrl = await ref.getDownloadURL();
      }

      // Method 2: Launch in browser / download directly
      final uri = Uri.parse(downloadUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        // Fallback: Download to local directory with Dio and open
        final dir = await getApplicationDocumentsDirectory();
        final filePath = "${dir.path}/Fee_Receipt_${_currentStudent!.studentId}.pdf";
        await Dio().download(downloadUrl, filePath);
        await OpenFilex.open(filePath);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Failed to download receipt: $e"),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_currentStudent == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("Educare Coaching Classes")),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.person_off_outlined, size: 64, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                const Text(
                  "No Student Linked to this Phone Number",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  "Authenticated Phone: ${widget.parentPhoneNumber}\nPlease verify your enrollment number with Educare administration.",
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.indigo.shade800,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Educare Coaching Classes",
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            Text(
              "${_currentStudent!.name} • ${_currentStudent!.classGrade}",
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Refresh Data",
            onPressed: () {
              _initializeParentDashboard();
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: "Sign Out",
            onPressed: () => FirebaseAuth.instance.signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _initializeParentDashboard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          children: [
            // Student Profile Header Card
            _buildStudentBanner(),

            const SizedBox(height: 16),

            // FEATURE 1: Fee Tracking & Dynamic Calculations + Conditional Receipt Download
            _buildFeeTrackingSection(),

            const SizedBox(height: 16),

            // FEATURE: Transaction History (Chronological Previous Fee Payments)
            _buildTransactionHistorySection(),

            const SizedBox(height: 20),

            // FEATURE 2: Attendance History & Calendar View
            _buildAttendanceCalendarSection(),

            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildStudentBanner() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.slate.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: Colors.indigo.shade50,
            child: Text(
              _currentStudent!.name.isNotEmpty ? _currentStudent!.name[0] : "S",
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.indigo.shade700),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _currentStudent!.name,
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 2),
                Text(
                  "Student ID: ${_currentStudent!.studentId} · ${_currentStudent!.classGrade}",
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.emerald.shade50,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              "Active",
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.emerald.shade700),
            ),
          ),
        ],
      ),
    );
  }

  /// Real-time Fee Stream listening to student's fee subcollection
  Widget _buildFeeTrackingSection() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestore
          .collection('students')
          .doc(_currentStudent!.studentId)
          .collection('fees')
          .limit(1)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
          return const Center(child: Padding(
            padding: EdgeInsets.all(16.0),
            child: CircularProgressIndicator(),
          ));
        }

        FeeRecord fee;
        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          fee = FeeRecord(totalFees: 0, collected: 0, pending: 0);
        } else {
          fee = FeeRecord.fromFirestore(snapshot.data!.docs.first);
        }

        return Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.slate.withOpacity(0.12)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Fee Summary",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  Text(
                    fee.pending == 0 ? "All Dues Cleared" : "Balance Due",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: fee.pending == 0 ? Colors.green.shade600 : Colors.amber.shade700,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // 3-Card Metric Strip
              Row(
                children: [
                  Expanded(
                    child: _buildMetricTile(
                      label: "Total Fees",
                      amount: fee.totalFees,
                      textColor: const Color(0xFF0F172A),
                      bgColor: const Color(0xFFF8FAFC),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricTile(
                      label: "Collected",
                      amount: fee.collected,
                      textColor: Colors.green.shade700,
                      bgColor: Colors.green.shade50.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _buildMetricTile(
                      label: "Pending",
                      amount: fee.pending,
                      textColor: fee.pending > 0 ? Colors.red.shade700 : Colors.green.shade700,
                      bgColor: fee.pending > 0
                          ? Colors.red.shade50.withOpacity(0.6)
                          : Colors.green.shade50.withOpacity(0.6),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // CONDITIONAL VISIBILITY RULE:
              // "A 'Download Receipt' button must remain hidden on the Parent UI
              //  until pending == 0 AND receipt_pdf_url is not null."
              if (fee.canDownloadReceipt) ...[
                const Divider(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _downloadAndOpenReceipt(fee.receiptPdfUrl!),
                    icon: const Icon(Icons.download_rounded, size: 20),
                    label: const Text(
                      "Download Fee Receipt (PDF)",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigo.shade600,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ),
              ] else if (fee.pending > 0) ...[
                const Divider(height: 24),
                Row(
                  children: [
                    Icon(Icons.info_outline, size: 16, color: Colors.grey.shade500),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        "Receipt download will unlock once the remaining balance of ${_currencyFormatter.format(fee.pending)} is settled.",
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildMetricTile({
    required String label,
    required double amount,
    required Color textColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.slate.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 4),
          Text(
            _currencyFormatter.format(amount),
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  /// Table Calendar Attendance Widget with Green / Red Status Colors
  Widget _buildAttendanceCalendarSection() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.slate.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Attendance Calendar",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              // Legend
              Row(
                children: [
                  _buildLegendItem(Colors.green.shade600, "Present"),
                  const SizedBox(width: 10),
                  _buildLegendItem(Colors.red.shade600, "Absent"),
                ],
              ),
            ],
          ),

          const SizedBox(height: 12),

          // TableCalendar Implementation
          TableCalendar(
            firstDay: DateTime.utc(2025, 1, 1),
            lastDay: DateTime.utc(2027, 12, 31),
            focusedDay: _focusedDay,
            currentDay: DateTime.now(),
            calendarFormat: CalendarFormat.month,
            headerStyle: const HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
              titleTextStyle: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
            onDaySelected: (selectedDay, focusedDay) {
              setState(() {
                _selectedDay = selectedDay;
                _focusedDay = focusedDay;
              });
            },
            onPageChanged: (focusedDay) {
              _focusedDay = focusedDay;
            },
            calendarBuilders: CalendarBuilders(
              defaultBuilder: (context, day, focusedDay) {
                return _buildCustomCalendarDay(day);
              },
              todayBuilder: (context, day, focusedDay) {
                return _buildCustomCalendarDay(day, isToday: true);
              },
              selectedBuilder: (context, day, focusedDay) {
                return _buildCustomCalendarDay(day, isSelected: true);
              },
            ),
          ),

          const SizedBox(height: 16),

          // Selected Day Detail Card
          if (_selectedDay != null) _buildSelectedDateDetails(_selectedDay!),
        ],
      ),
    );
  }

  Widget _buildLegendItem(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ],
    );
  }

  /// Custom Cell Builder coloring Present days Green and Absent days Red
  Widget _buildCustomCalendarDay(DateTime day, {bool isToday = false, bool isSelected = false}) {
    final normalized = DateTime(day.year, day.month, day.day);
    final status = _attendanceMap[normalized];

    Color? bg;
    Color textColor = const Color(0xFF1E293B);
    Border? border;

    if (status == AttendanceStatus.present) {
      bg = Colors.green.shade600;
      textColor = Colors.white;
    } else if (status == AttendanceStatus.absent) {
      bg = Colors.red.shade600;
      textColor = Colors.white;
    }

    if (isSelected && bg == null) {
      bg = Colors.indigo.shade100;
      textColor = Colors.indigo.shade900;
    }

    if (isToday && bg == null) {
      border = Border.all(color: Colors.indigo.shade600, width: 2);
    }

    return Container(
      margin: const EdgeInsets.all(4),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: border,
      ),
      child: Text(
        '${day.day}',
        style: TextStyle(
          fontSize: 13,
          fontWeight: isToday || isSelected ? FontWeight.bold : FontWeight.normal,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildSelectedDateDetails(DateTime day) {
    final normalized = DateTime(day.year, day.month, day.day);
    final status = _attendanceMap[normalized];
    final dateStr = DateFormat('EEEE, MMMM d, yyyy').format(day);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(
            status == AttendanceStatus.present
                ? Icons.check_circle
                : status == AttendanceStatus.absent
                    ? Icons.cancel
                    : Icons.event_note,
            size: 20,
            color: status == AttendanceStatus.present
                ? Colors.green.shade700
                : status == AttendanceStatus.absent
                    ? Colors.red.shade700
                    : Colors.grey.shade600,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dateStr,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                ),
                Text(
                  status == AttendanceStatus.present
                      ? "Marked Present"
                      : status == AttendanceStatus.absent
                          ? "Marked Absent"
                          : "No class / session scheduled",
                  style: TextStyle(
                    fontSize: 11,
                    color: status == AttendanceStatus.present
                        ? Colors.green.shade800
                        : status == AttendanceStatus.absent
                            ? Colors.red.shade800
                            : Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// Real-time Chronological Fee Transaction History Stream
  Widget _buildTransactionHistorySection() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.slate.withOpacity(0.12)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.history_rounded, size: 20, color: Colors.indigo),
                  SizedBox(width: 8),
                  Text(
                    "Transaction History",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
              Text(
                "Chronological",
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
            ],
          ),
          const SizedBox(height: 14),

          StreamBuilder<QuerySnapshot>(
            stream: _firestore
                .collection('students')
                .doc(_currentStudent!.studentId)
                .collection('transactions')
                .orderBy('date', descending: true)
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: Padding(
                  padding: EdgeInsets.all(12.0),
                  child: CircularProgressIndicator(),
                ));
              }

              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return Container(
                  padding: const EdgeInsets.all(16),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    "No payment history recorded yet.",
                    style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                  ),
                );
              }

              final transactions = snapshot.data!.docs
                  .map((doc) => FeeTransaction.fromFirestore(doc))
                  .toList();

              return ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: transactions.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, index) {
                  final txn = transactions[index];
                  final formattedDate = DateFormat('dd MMM yyyy').format(txn.date);

                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.slate.withOpacity(0.08)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(Icons.arrow_downward_rounded, size: 16, color: Colors.green.shade700),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _currencyFormatter.format(txn.amount),
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                "Ref: ${txn.referenceNo.isNotEmpty ? txn.referenceNo : txn.id}",
                                style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                              ),
                              if (txn.note != null && txn.note!.isNotEmpty)
                                Text(
                                  txn.note!,
                                  style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                                ),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.slate.shade100,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                txn.paymentMode,
                                style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.slate.shade700),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              formattedDate,
                              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }
}
