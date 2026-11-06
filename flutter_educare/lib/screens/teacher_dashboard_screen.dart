import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../models/student_models.dart';

class TeacherDashboardScreen extends StatefulWidget {
  final String teacherPhone; // e.g. "+919876500001"

  const TeacherDashboardScreen({Key? key, required this.teacherPhone}) : super(key: key);

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseFunctions _functions = FirebaseFunctions.instance;

  String _selectedGrade = "Std 10";
  final List<String> _gradeList = [
    "Std 2", "Std 3", "Std 4", "Std 5", "Std 6",
    "Std 7", "Std 8", "Std 9", "Std 10", "Std 11", "Std 12"
  ];

  DateTime _selectedAttendanceDate = DateTime.now();
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = "";

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Teacher Admin • Educare",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.indigo.shade900,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active_outlined),
            tooltip: "Send Bulk Fee Reminders",
            onPressed: _showBulkFeeReminderDialog,
          ),
          IconButton(
            icon: const Icon(Icons.analytics_outlined),
            tooltip: "Fees Report (All & Standard-Wise)",
            onPressed: _showFeeReportsDialog,
          ),
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: "Export Monthly Attendance CSV",
            onPressed: _showExportCsvDialog,
          ),
          IconButton(
            icon: const Icon(Icons.person_add_alt_1_rounded),
            tooltip: "Enroll Student",
            onPressed: _showAddStudentDialog,
          ),
          IconButton(
            icon: const Icon(Icons.campaign_rounded),
            tooltip: "Send Push Announcement",
            onPressed: _showAnnouncementDialog,
          ),
        ],
      ),
      body: Column(
        children: [
          // SEARCH BAR (Filter by Name, Class Grade, or Phone Number)
          _buildSearchBar(),

          // Grade Filter Horizontal Chips (Shown when not searching)
          if (_searchQuery.isEmpty) _buildGradeSelector(),

          // Active Date / Search Results Banner
          _buildDateSelectorStrip(),

          // Student List with Attendance & Fee Actions
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _searchQuery.isEmpty
                  ? _firestore
                      .collection('students')
                      .where('class_grade', isEqualTo: _selectedGrade)
                      .snapshots()
                  : _firestore
                      .collection('students')
                      .snapshots(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                  return _buildEmptyState();
                }

                // Filter logic
                List<Student> students = snapshot.data!.docs
                    .map((doc) => Student.fromFirestore(doc))
                    .toList();

                if (_searchQuery.isNotEmpty) {
                  final q = _searchQuery.toLowerCase().trim();
                  students = students.where((s) {
                    final nameMatch = s.name.toLowerCase().contains(q);
                    final gradeMatch = s.classGrade.toLowerCase().contains(q);
                    final phoneMatch = s.parentPhone.replaceAll(' ', '').contains(q.replaceAll(' ', ''));
                    return nameMatch || gradeMatch || phoneMatch;
                  }).toList();
                }

                if (students.isEmpty) {
                  return _buildEmptyState();
                }

                return ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: students.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final student = students[index];
                    return _buildStudentTeacherCard(student);
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: Colors.indigo.shade700,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.person_add_rounded),
        label: const Text("Enroll Student"),
        onPressed: _showAddStudentDialog,
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: "Search by student name, grade (Std 10), or phone...",
          hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
          prefixIcon: const Icon(Icons.search, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
        ),
        onChanged: (val) {
          setState(() {
            _searchQuery = val.trim();
          });
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _searchQuery.isNotEmpty ? Icons.search_off_rounded : Icons.school_outlined,
              size: 56,
              color: Colors.grey.shade400,
            ),
            const SizedBox(height: 12),
            Text(
              _searchQuery.isNotEmpty
                  ? "No students matching '$_searchQuery'"
                  : "No students enrolled in $_selectedGrade",
              style: TextStyle(color: Colors.grey.shade700, fontSize: 14, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 6),
            Text(
              _searchQuery.isNotEmpty
                  ? "Try searching by full/partial name, standard (e.g. Std 10), or parent phone number."
                  : "Start enrolling students for this standard using the button below.",
              style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            if (_searchQuery.isNotEmpty)
              OutlinedButton(
                onPressed: () {
                  _searchController.clear();
                  setState(() => _searchQuery = '');
                },
                child: const Text("Clear Search Filter"),
              )
            else
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: Colors.indigo.shade700),
                icon: const Icon(Icons.person_add_rounded, size: 18),
                label: Text("Enroll Student in $_selectedGrade"),
                onPressed: _showAddStudentDialog,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildGradeSelector() {
    return Container(
      height: 52,
      color: Colors.white,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _gradeList.length,
        itemBuilder: (context, index) {
          final grade = _gradeList[index];
          final isSelected = grade == _selectedGrade;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(grade),
              selected: isSelected,
              selectedColor: Colors.indigo.shade100,
              labelStyle: TextStyle(
                color: isSelected ? Colors.indigo.shade900 : Colors.slate.shade700,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                fontSize: 12,
              ),
              onSelected: (selected) {
                if (selected) setState(() => _selectedGrade = grade);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildDateSelectorStrip() {
    if (_searchQuery.isNotEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        color: const Color(0xFFEEF2FF),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.filter_list_rounded, size: 14, color: Colors.indigo),
                const SizedBox(width: 6),
                Text(
                  "Filtered by: '$_searchQuery'",
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.indigo.shade900),
                ),
              ],
            ),
            TextButton(
              onPressed: () {
                _searchController.clear();
                setState(() => _searchQuery = '');
              },
              child: const Text("Clear Filter", style: TextStyle(fontSize: 12)),
            ),
          ],
        ),
      );
    }

    final dateStr = DateFormat('EEE, MMM d, yyyy').format(_selectedAttendanceDate);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: const Color(0xFFF1F5F9),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 14, color: Color(0xFF64748B)),
              const SizedBox(width: 6),
              Text(
                "Marking for: $dateStr",
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
              ),
            ],
          ),
          TextButton(
            onPressed: () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: _selectedAttendanceDate,
                firstDate: DateTime(2025),
                lastDate: DateTime(2027),
              );
              if (picked != null) {
                setState(() => _selectedAttendanceDate = picked);
              }
            },
            child: const Text("Change Date", style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentTeacherCard(Student student) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.slate.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Colors.indigo.shade50,
                child: Text(
                  student.name[0],
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.indigo.shade700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    Text(
                      "Parent: ${student.parentPhone}",
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.receipt_long, color: Colors.indigo),
                tooltip: "Manage Fees",
                onPressed: () => _showFeeUpdateModal(student),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Mark Attendance:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
              Row(
                children: [
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.green.shade700,
                      side: BorderSide(color: Colors.green.shade300),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    ),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text("Present", style: TextStyle(fontSize: 12)),
                    onPressed: () => _markAttendance(student, "present"),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red.shade700,
                      side: BorderSide(color: Colors.red.shade300),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    ),
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text("Absent", style: TextStyle(fontSize: 12)),
                    onPressed: () => _markAttendance(student, "absent"),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _markAttendance(Student student, String status) async {
    try {
      final normalizedDate = DateTime(
        _selectedAttendanceDate.year,
        _selectedAttendanceDate.month,
        _selectedAttendanceDate.day,
      );
      final docId = DateFormat('yyyy_MM_dd').format(normalizedDate);

      // Writes to students/{studentId}/attendance/{docId}
      // This immediately triggers Cloud Function onAttendanceRecordCreated
      await _firestore
          .collection('students')
          .doc(student.studentId)
          .collection('attendance')
          .doc(docId)
          .set({
        'date': Timestamp.fromDate(normalizedDate),
        'status': status,
        'marked_by': widget.teacherPhone,
        'updated_at': FieldValue.serverTimestamp(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("${student.name} marked ${status.toUpperCase()}! FCM Push sent to ${student.parentPhone}."),
            backgroundColor: status == 'present' ? Colors.green.shade700 : Colors.red.shade700,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    }
  }

  void _showFeeUpdateModal(Student student) {
    final totalController = TextEditingController();
    final collectedController = TextEditingController();
    final receiptUrlController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Update Fees for ${student.name}", style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: totalController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: "Total Fees (₹)", border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: collectedController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: "Collected Fees (₹)", border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: receiptUrlController,
              decoration: const InputDecoration(
                labelText: "Receipt PDF URL (Storage)",
                hintText: "https://firebasestorage.googleapis.com/...",
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                backgroundColor: Colors.indigo.shade700,
              ),
              onPressed: () async {
                final total = double.tryParse(totalController.text) ?? 0;
                final collected = double.tryParse(collectedController.text) ?? 0;
                final pending = (total - collected) > 0 ? (total - collected) : 0.0;

                // Updates students/{studentId}/fees/current
                // Triggers Cloud Function onFeeUpdated
                await _firestore
                    .collection('students')
                    .doc(student.studentId)
                    .collection('fees')
                    .doc('current')
                    .set({
                  'total_fees': total,
                  'collected': collected,
                  'pending': pending,
                  'receipt_pdf_url': receiptUrlController.text.trim().isNotEmpty
                      ? receiptUrlController.text.trim()
                      : null,
                  'updated_at': FieldValue.serverTimestamp(),
                });

                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Fees updated & automated FCM sent to parent.")),
                );
              },
              child: const Text("Save & Send Push Update"),
            ),
          ],
        ),
      ),
    );
  }

  /// FEATURE 3 REQUIREMENT:
  /// "Teacher Dashboard UI snippet to send custom announcements
  /// (dropdown to select 'All Parents' or 'Specific Parent Phone')"
  void _showAnnouncementDialog() {
    String targetMode = "ALL"; // "ALL" or "SPECIFIC"
    String? selectedParentPhone;
    final titleController = TextEditingController();
    final messageController = TextEditingController();

    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Row(
                children: [
                  Icon(Icons.campaign, color: Colors.indigo),
                  SizedBox(width: 8),
                  Text("Send Custom Announcement", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Recipient Target:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<String>(
                      value: targetMode,
                      decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
                      items: const [
                        DropdownMenuItem(value: "ALL", child: Text("All Parents (Broadcast Topic)")),
                        DropdownMenuItem(value: "SPECIFIC", child: Text("Specific Parent Phone")),
                      ],
                      onChanged: (val) {
                        setDialogState(() {
                          targetMode = val ?? "ALL";
                        });
                      },
                    ),

                    if (targetMode == "SPECIFIC") ...[
                      const SizedBox(height: 12),
                      const Text("Parent Phone Number:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      TextField(
                        decoration: const InputDecoration(
                          hintText: "+91 98765 43210",
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        ),
                        onChanged: (val) => selectedParentPhone = val.trim(),
                      ),
                    ],

                    const SizedBox(height: 12),
                    const Text("Announcement Title:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(
                        hintText: "e.g., Sunday Test Timings",
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),

                    const SizedBox(height: 12),
                    const Text("Announcement Message:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: messageController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: "Enter the announcement body for parents...",
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text("Cancel"),
                ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: Colors.indigo.shade800),
                  icon: const Icon(Icons.send, size: 16),
                  label: const Text("Send Notification"),
                  onPressed: () async {
                    if (titleController.text.trim().isEmpty || messageController.text.trim().isEmpty) {
                      return;
                    }

                    Navigator.pop(ctx);

                    try {
                      // Invokes the Node.js Cloud Function 'sendCustomAnnouncement'
                      final callable = _functions.httpsCallable('sendCustomAnnouncement');
                      final res = await callable.call({
                        'title': titleController.text.trim(),
                        'message': messageController.text.trim(),
                        'target': targetMode,
                        'targetPhone': selectedParentPhone,
                      });

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Announcement dispatched via FCM! Result: ${res.data['mode']}"),
                          backgroundColor: Colors.green.shade700,
                        ),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text("Cloud function trigger: $e")),
                      );
                    }
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  /// ADMIN PANEL: ENROLL NEW STUDENT
  /// Creates the student document in 'students' collection
  /// and sets up the initial 'fees' sub-collection document in Firestore.
  void _showAddStudentDialog() {
    final nameCtrl = TextEditingController();
    final rollCtrl = TextEditingController(text: "10${DateTime.now().millisecond}");
    final phoneCtrl = TextEditingController(text: "+91 ");
    final totalFeesCtrl = TextEditingController(text: _selectedGrade == "Std 11" || _selectedGrade == "Std 12" ? "60000" : "45000");
    final collectedCtrl = TextEditingController(text: "0");
    String grade = _selectedGrade;

    showDialog(
      context: context,
      builder: (BuildContext ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final double total = double.tryParse(totalFeesCtrl.text) ?? 0;
            final double collected = double.tryParse(collectedCtrl.text) ?? 0;
            final double pending = (total - collected) > 0 ? (total - collected) : 0;

            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Row(
                children: [
                  Icon(Icons.person_add_rounded, color: Colors.indigo),
                  SizedBox(width: 10),
                  Text("Enroll New Student", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Admin admission panel for Cloud Firestore", style: TextStyle(fontSize: 12, color: Colors.grey)),
                    const SizedBox(height: 16),
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: "Student Full Name *",
                        hintText: "e.g. Pooja Deshmukh",
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: grade,
                            decoration: const InputDecoration(labelText: "Grade", border: OutlineInputBorder()),
                            items: _gradeList.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setModalState(() {
                                  grade = val;
                                  if (val == "Std 11" || val == "Std 12") {
                                    totalFeesCtrl.text = "60000";
                                  } else if (val == "Std 9" || val == "Std 10") {
                                    totalFeesCtrl.text = "45000";
                                  } else {
                                    totalFeesCtrl.text = "32000";
                                  }
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: rollCtrl,
                            decoration: const InputDecoration(labelText: "Roll No", border: OutlineInputBorder()),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: "Parent Phone (OTP Login) *",
                        hintText: "+91 98765 43210",
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.phone),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text("Fee Structure", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: totalFeesCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: "Total (₹)", border: OutlineInputBorder()),
                            onChanged: (_) => setModalState(() {}),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            controller: collectedCtrl,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: "Paid (₹)", border: OutlineInputBorder()),
                            onChanged: (_) => setModalState(() {}),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Pending Balance: ₹${pending.toInt()}",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: pending > 0 ? Colors.red.shade700 : Colors.green.shade700,
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Cancel")),
                FilledButton.icon(
                  style: FilledButton.styleFrom(backgroundColor: Colors.indigo.shade800),
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text("Save & Enroll"),
                  onPressed: () async {
                    final name = nameCtrl.text.trim();
                    final phone = phoneCtrl.text.trim();
                    if (name.isEmpty || phone.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text("Name and Parent Phone are required.")),
                      );
                      return;
                    }

                    Navigator.pop(ctx);

                    try {
                      // 1. Create student document in 'students' collection
                      final studentRef = await _firestore.collection('students').add({
                        'name': name,
                        'class_grade': grade,
                        'parent_phone': phone,
                        'roll_number': rollCtrl.text.trim(),
                        'created_at': FieldValue.serverTimestamp(),
                        'enrolled_by': widget.teacherPhone,
                      });

                      // 2. Create initial 'fees/current' sub-collection document
                      await studentRef.collection('fees').doc('current').set({
                        'total_fees': total,
                        'collected': collected,
                        'pending': pending,
                        'receipt_pdf_url': pending == 0
                            ? 'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2F${studentRef.id}%2Ffee_receipt.pdf?alt=media'
                            : null,
                        'updated_at': FieldValue.serverTimestamp(),
                      });

                      if (mounted) {
                        setState(() => _selectedGrade = grade);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Enrolled $name in $grade successfully!"),
                            backgroundColor: Colors.green.shade700,
                          ),
                        );
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Enrollment error: $e")));
                    }
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ===========================================================================
  // FEATURE: EXPORT MONTHLY STUDENT ATTENDANCE REPORT AS CSV
  // ===========================================================================
  void _showExportCsvDialog() {
    int selectedYear = DateTime.now().year;
    int selectedMonth = DateTime.now().month;
    String gradeScope = _selectedGrade; // default to current grade, or "All"
    bool includeAllGrades = false;
    bool isExporting = false;

    final months = [
      {"name": "January", "value": 1},
      {"name": "February", "value": 2},
      {"name": "March", "value": 3},
      {"name": "April", "value": 4},
      {"name": "May", "value": 5},
      {"name": "June", "value": 6},
      {"name": "July", "value": 7},
      {"name": "August", "value": 8},
      {"name": "September", "value": 9},
      {"name": "October", "value": 10},
      {"name": "November", "value": 11},
      {"name": "December", "value": 12},
    ];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.table_chart_rounded, color: Colors.indigo.shade700, size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Export Attendance CSV", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text("Monthly student attendance register", style: TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Select Month & Year", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // Month dropdown
                      Expanded(
                        flex: 3,
                        child: DropdownButtonFormField<int>(
                          value: selectedMonth,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: months
                              .map((m) => DropdownMenuItem(
                                    value: m["value"] as int,
                                    child: Text(m["name"] as String, style: const TextStyle(fontSize: 13)),
                                  ))
                              .toList(),
                          onChanged: isExporting
                              ? null
                              : (val) => setModalState(() => selectedMonth = val ?? selectedMonth),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Year dropdown
                      Expanded(
                        flex: 2,
                        child: DropdownButtonFormField<int>(
                          value: selectedYear,
                          decoration: InputDecoration(
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          items: [2025, 2026, 2027]
                              .map((y) => DropdownMenuItem(
                                    value: y,
                                    child: Text("$y", style: const TextStyle(fontSize: 13)),
                                  ))
                              .toList(),
                          onChanged: isExporting
                              ? null
                              : (val) => setModalState(() => selectedYear = val ?? selectedYear),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text("Grade Scope", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Expanded(
                        child: ChoiceChip(
                          label: Text(_selectedGrade, style: const TextStyle(fontSize: 12)),
                          selected: !includeAllGrades,
                          onSelected: isExporting
                              ? null
                              : (selected) {
                                  if (selected) setModalState(() => includeAllGrades = false);
                                },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ChoiceChip(
                          label: const Text("All Std (2–12)", style: TextStyle(fontSize: 12)),
                          selected: includeAllGrades,
                          onSelected: isExporting
                              ? null
                              : (selected) {
                                  if (selected) setModalState(() => includeAllGrades = true);
                                },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.parse("1px solid ${Colors.blue.shade100}"),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline, size: 16, color: Colors.blue.shade800),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            "The exported CSV contains student roll numbers, names, parent contacts, daily present/absent logs for every date of the month, total working days, and attendance percentages.",
                            style: TextStyle(fontSize: 11, color: Color(0xFF1E3A8A), height: 1.3),
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isExporting) ...[
                    const SizedBox(height: 16),
                    const Center(
                      child: Column(
                        children: [
                          CircularProgressIndicator(strokeWidth: 2.5),
                          SizedBox(height: 8),
                          Text("Querying Firestore attendance logs...", style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isExporting ? null : () => Navigator.pop(ctx),
                child: const Text("Cancel"),
              ),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: Colors.indigo.shade800),
                icon: const Icon(Icons.download, size: 16),
                label: const Text("Generate & Export CSV"),
                onPressed: isExporting
                    ? null
                    : () async {
                        setModalState(() => isExporting = true);
                        try {
                          await _processAndExportCsv(
                            year: selectedYear,
                            month: selectedMonth,
                            grade: includeAllGrades ? "All_Grades" : _selectedGrade,
                          );
                          if (ctx.mounted) Navigator.pop(ctx);
                        } catch (e) {
                          setModalState(() => isExporting = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text("CSV Export failed: $e")),
                          );
                        }
                      },
              ),
            ],
          );
        },
      ),
    );
  }

  /// Queries Firestore sub-collections, builds RFC-4180 CSV, and shares/saves file
  Future<void> _processAndExportCsv({
    required int year,
    required int month,
    required String grade,
  }) async {
    final daysInMonth = DateTime(year, month + 1, 0).day;
    final monthName = DateFormat('MMMM').format(DateTime(year, month, 1));

    // 1. Fetch Students
    Query studentQuery = _firestore.collection('students');
    if (grade != "All_Grades") {
      studentQuery = studentQuery.where('class_grade', isEqualTo: grade);
    }
    final studentSnap = await studentQuery.get();

    if (studentSnap.docs.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("No students found for the selected scope.")),
      );
      return;
    }

    // 2. Build CSV Header
    final List<String> headers = [
      "Roll No",
      "Student Name",
      "Class Grade",
      "Parent Phone",
      "Total Working Days",
      "Days Present",
      "Days Absent",
      "Attendance Rate (%)",
    ];

    // Day 1 .. Day N headers
    for (int day = 1; day <= daysInMonth; day++) {
      final date = DateTime(year, month, day);
      final dayName = DateFormat('E').format(date); // Mon, Tue, Sun
      headers.add("Day $day ($dayName)");
    }

    final StringBuffer csvBuffer = StringBuffer();
    // Add UTF-8 BOM so Excel/Numbers automatically parses characters and formatting cleanly
    csvBuffer.write('\uFEFF');
    csvBuffer.writeln(headers.map(_escapeCsvField).join(','));

    // 3. For each student, query attendance records in the month
    final startOfMonth = DateTime(year, month, 1);
    final endOfMonth = DateTime(year, month, daysInMonth, 23, 59, 59);

    for (final doc in studentSnap.docs) {
      final student = Student.fromFirestore(doc);
      
      final attSnap = await doc.reference
          .collection('attendance')
          .where('date', isGreaterThanOrEqualTo: Timestamp.fromDate(startOfMonth))
          .where('date', isLessThanOrEqualTo: Timestamp.fromDate(endOfMonth))
          .get();

      // Map day -> status
      final Map<int, String> dayStatusMap = {};
      int presentCount = 0;
      int absentCount = 0;

      for (final attDoc in attSnap.docs) {
        final data = attDoc.data();
        final timestamp = data['date'] as Timestamp?;
        final status = (data['status'] as String? ?? '').toLowerCase();
        if (timestamp != null) {
          final dt = timestamp.toDate();
          final day = dt.day;
          dayStatusMap[day] = status;
          if (status == 'present') presentCount++;
          if (status == 'absent') absentCount++;
        }
      }

      final totalMarked = presentCount + absentCount;
      final double rate = totalMarked > 0 ? (presentCount / totalMarked) * 100 : 0.0;

      final List<String> row = [
        student.rollNumber ?? "-",
        student.name,
        student.classGrade,
        student.parentPhone,
        totalMarked.toString(),
        presentCount.toString(),
        absentCount.toString(),
        "${rate.toStringAsFixed(1)}%",
      ];

      // Add each day's status: P, A, Sunday, or "-"
      for (int day = 1; day <= daysInMonth; day++) {
        final date = DateTime(year, month, day);
        if (date.weekday == DateTime.sunday) {
          row.add("Sunday");
        } else if (dayStatusMap.containsKey(day)) {
          final s = dayStatusMap[day];
          row.add(s == 'present' ? 'Present' : 'Absent');
        } else {
          row.add("-");
        }
      }

      csvBuffer.writeln(row.map(_escapeCsvField).join(','));
    }

    // 4. Save and share the CSV file
    final fileName = "Educare_Attendance_${grade.replaceAll(' ', '_')}_${monthName}_$year.csv";
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/$fileName');
    await file.writeAsString(csvBuffer.toString(), flush: true);

    // 5. Open system share / download sheet
    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'text/csv')],
      text: "Educare Coaching Classes - Monthly Attendance Report for $monthName $year ($grade)",
      subject: fileName,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Exported attendance report for ${studentSnap.docs.length} students ($fileName)"),
          backgroundColor: Colors.green.shade700,
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  /// Escapes CSV fields containing commas, quotes, or newlines
  // ===========================================================================
  // FEATURE: FEES REPORT (ALL STANDARDS & STANDARD-WISE BREAKDOWN)
  // ===========================================================================
  void _showFeeReportsDialog() {
    String selectedReportScope = "ALL"; // "ALL" or specific grade like "Std 10"
    bool isExporting = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: Container(
              width: MediaQuery.of(context).size.width > 650 ? 600 : double.infinity,
              constraints: const BoxConstraints(maxHeight: 700),
              padding: const EdgeInsets.all(20),
              child: StreamBuilder<QuerySnapshot>(
                stream: _firestore.collection('students').snapshots(),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final docs = snap.data?.docs ?? [];
                  final List<Student> allStudents = docs.map((d) => Student.fromFirestore(d)).toList();

                  // Compute metrics for standard-wise and all
                  final Map<String, List<Student>> gradeMap = {};
                  for (final g in _gradeList) {
                    gradeMap[g] = [];
                  }
                  for (final s in allStudents) {
                    if (gradeMap.containsKey(s.classGrade)) {
                      gradeMap[s.classGrade]!.add(s);
                    } else {
                      gradeMap[s.classGrade] = [s];
                    }
                  }

                  // Active view students
                  final List<Student> activeList = selectedReportScope == "ALL"
                      ? allStudents
                      : (gradeMap[selectedReportScope] ?? []);

                  return FutureBuilder<List<Map<String, dynamic>>>(
                    future: _fetchFeesForStudents(activeList),
                    builder: (context, feeSnap) {
                      final bool loadingFees = feeSnap.connectionState == ConnectionState.waiting;
                      final studentFeeData = feeSnap.data ?? [];

                      double totalBilled = 0;
                      double totalCollected = 0;
                      double totalPending = 0;
                      int defaultersCount = 0;

                      for (final item in studentFeeData) {
                        final double tot = (item['total'] as num?)?.toDouble() ?? 0;
                        final double col = (item['collected'] as num?)?.toDouble() ?? 0;
                        final double pen = (tot - col) > 0 ? (tot - col) : 0;
                        totalBilled += tot;
                        totalCollected += col;
                        totalPending += pen;
                        if (pen > 0) defaultersCount++;
                      }

                      final double collectionRate = totalBilled > 0
                          ? (totalCollected / totalBilled) * 100
                          : 0.0;

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.emerald.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(Icons.account_balance_wallet_rounded,
                                    color: Colors.emerald.shade700, size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Fees Report & Ledger",
                                      style: TextStyle(
                                          fontSize: 18, fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      "All Standards & Standard-Wise Financial Summary",
                                      style: TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => Navigator.pop(ctx),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Standard Filter Toggle Strip
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                ChoiceChip(
                                  label: Text(
                                    "All Standards (${allStudents.length})",
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: selectedReportScope == "ALL"
                                          ? FontWeight.bold
                                          : FontWeight.normal,
                                    ),
                                  ),
                                  selected: selectedReportScope == "ALL",
                                  onSelected: (val) {
                                    if (val) setModalState(() => selectedReportScope = "ALL");
                                  },
                                ),
                                const SizedBox(width: 6),
                                ..._gradeList.map((grade) {
                                  final count = gradeMap[grade]?.length ?? 0;
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 6),
                                    child: ChoiceChip(
                                      label: Text(
                                        "$grade ($count)",
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: selectedReportScope == grade
                                              ? FontWeight.bold
                                              : FontWeight.normal,
                                        ),
                                      ),
                                      selected: selectedReportScope == grade,
                                      onSelected: (val) {
                                        if (val) setModalState(() => selectedReportScope = grade);
                                      },
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Summary Metric Cards
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.grey.shade300),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    _buildReportMetric(
                                      "Total Target",
                                      "₹${NumberFormat('#,##,###').format(totalBilled)}",
                                      Colors.slate.shade900,
                                    ),
                                    _buildReportMetric(
                                      "Collected",
                                      "₹${NumberFormat('#,##,###').format(totalCollected)}",
                                      Colors.emerald.shade700,
                                    ),
                                    _buildReportMetric(
                                      "Outstanding",
                                      "₹${NumberFormat('#,##,###').format(totalPending)}",
                                      totalPending > 0 ? Colors.rose.shade700 : Colors.emerald.shade700,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                // Progress bar for recovery rate
                                Row(
                                  children: [
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(8),
                                        child: LinearProgressIndicator(
                                          value: totalBilled > 0 ? totalCollected / totalBilled : 0,
                                          minHeight: 8,
                                          backgroundColor: Colors.rose.shade100,
                                          color: Colors.emerald.shade600,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      "${collectionRate.toStringAsFixed(1)}% Recovered",
                                      style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.slate.shade800),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      "· $defaultersCount Pending",
                                      style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: Colors.rose.shade700),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Student List / Ledger
                          Expanded(
                            child: loadingFees
                                ? const Center(child: CircularProgressIndicator())
                                : studentFeeData.isEmpty
                                    ? const Center(
                                        child: Text("No student records found in this scope.",
                                            style: TextStyle(color: Colors.grey)),
                                      )
                                    : ListView.separated(
                                        itemCount: studentFeeData.length,
                                        separatorBuilder: (_, __) =>
                                            const Divider(height: 1, color: Color(0xFFE2E8F0)),
                                        itemBuilder: (context, idx) {
                                          final item = studentFeeData[idx];
                                          final Student s = item['student'] as Student;
                                          final double tot = (item['total'] as num?)?.toDouble() ?? 0;
                                          final double col = (item['collected'] as num?)?.toDouble() ?? 0;
                                          final double pen = (tot - col) > 0 ? (tot - col) : 0;
                                          final bool isCleared = pen == 0;

                                          return Padding(
                                            padding: const EdgeInsets.symmetric(
                                                vertical: 8, horizontal: 4),
                                            child: Row(
                                              children: [
                                                CircleAvatar(
                                                  radius: 16,
                                                  backgroundColor: isCleared
                                                      ? Colors.emerald.shade50
                                                      : Colors.amber.shade50,
                                                  child: Text(
                                                    s.classGrade.replaceAll("Std ", "S"),
                                                    style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                        color: isCleared
                                                            ? Colors.emerald.shade800
                                                            : Colors.amber.shade900),
                                                  ),
                                                ),
                                                const SizedBox(width: 10),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment.start,
                                                    children: [
                                                      Text(
                                                        s.name,
                                                        style: const TextStyle(
                                                            fontSize: 13,
                                                            fontWeight: FontWeight.bold),
                                                      ),
                                                      Text(
                                                        "Roll: ${s.rollNumber ?? '-'} · ${s.parentPhone}",
                                                        style: const TextStyle(
                                                            fontSize: 10,
                                                            color: Colors.grey),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Column(
                                                  crossAxisAlignment: CrossAxisAlignment.end,
                                                  children: [
                                                    Text(
                                                      "₹${NumberFormat('#,##,###').format(col)} / ₹${NumberFormat('#,##,###').format(tot)}",
                                                      style: const TextStyle(
                                                          fontSize: 12,
                                                          fontFamily: 'monospace',
                                                          fontWeight: FontWeight.bold),
                                                    ),
                                                    Text(
                                                      isCleared
                                                          ? "Cleared"
                                                          : "Pending ₹${NumberFormat('#,##,###').format(pen)}",
                                                      style: TextStyle(
                                                          fontSize: 10,
                                                          fontWeight: FontWeight.bold,
                                                          color: isCleared
                                                              ? Colors.emerald.shade700
                                                              : Colors.rose.shade700),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          );
                                        },
                                      ),
                          ),
                          const SizedBox(height: 12),

                          // Footer Actions
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                "${studentFeeData.length} Students listed",
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                              Row(
                                children: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(ctx),
                                    child: const Text("Close"),
                                  ),
                                  const SizedBox(width: 6),
                                  FilledButton.icon(
                                    style: FilledButton.styleFrom(
                                        backgroundColor: Colors.emerald.shade800),
                                    icon: isExporting
                                        ? const SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(
                                                strokeWidth: 2, color: Colors.white),
                                          )
                                        : const Icon(Icons.download, size: 16),
                                    label: Text(isExporting ? "Exporting..." : "Export Fees CSV"),
                                    onPressed: isExporting || studentFeeData.isEmpty
                                        ? null
                                        : () async {
                                            setModalState(() => isExporting = true);
                                            try {
                                              await _processAndExportFeesCsv(
                                                scope: selectedReportScope,
                                                data: studentFeeData,
                                              );
                                              if (ctx.mounted) Navigator.pop(ctx);
                                            } catch (e) {
                                              setModalState(() => isExporting = false);
                                              ScaffoldMessenger.of(context).showSnackBar(
                                                SnackBar(content: Text("Fees CSV export failed: $e")),
                                              );
                                            }
                                          },
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildReportMetric(String label, String value, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w600)),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: color),
          ),
        ],
      ),
    );
  }

  /// Helper to fetch fees sub-collection for a list of students
  Future<List<Map<String, dynamic>>> _fetchFeesForStudents(List<Student> students) async {
    final List<Map<String, dynamic>> results = [];
    for (final s in students) {
      final feeDoc = await _firestore
          .collection('students')
          .doc(s.id)
          .collection('fees')
          .doc('current')
          .get();

      double total = 0;
      double collected = 0;
      String? receiptUrl;

      if (feeDoc.exists) {
        final data = feeDoc.data() ?? {};
        total = (data['total_fees'] as num?)?.toDouble() ?? 0;
        collected = (data['collected'] as num?)?.toDouble() ?? 0;
        receiptUrl = data['receipt_pdf_url'] as String?;
      }

      results.add({
        'student': s,
        'total': total,
        'collected': collected,
        'pending': (total - collected) > 0 ? (total - collected) : 0,
        'receiptUrl': receiptUrl,
      });
    }
    return results;
  }

  /// Exports Fees Report as RFC-4180 CSV
  Future<void> _processAndExportFeesCsv({
    required String scope,
    required List<Map<String, dynamic>> data,
  }) async {
    final List<String> headers = [
      "Roll Number",
      "Student Name",
      "Class Grade",
      "Parent Phone",
      "Total Fees (INR)",
      "Collected Fees (INR)",
      "Pending Dues (INR)",
      "Payment Status",
      "Receipt Issued",
    ];

    final StringBuffer buffer = StringBuffer();
    buffer.write('\uFEFF'); // UTF-8 BOM
    buffer.writeln(headers.map(_escapeCsvField).join(','));

    for (final item in data) {
      final Student s = item['student'] as Student;
      final double tot = (item['total'] as num?)?.toDouble() ?? 0;
      final double col = (item['collected'] as num?)?.toDouble() ?? 0;
      final double pen = (tot - col) > 0 ? (tot - col) : 0;
      final bool isCleared = pen == 0;
      final String? receipt = item['receiptUrl'] as String?;

      final List<String> row = [
        s.rollNumber ?? "-",
        s.name,
        s.classGrade,
        s.parentPhone,
        tot.toStringAsFixed(0),
        col.toStringAsFixed(0),
        pen.toStringAsFixed(0),
        isCleared ? "Fully Paid" : (col > 0 ? "Partial Paid" : "Unpaid"),
        receipt != null && receipt.isNotEmpty ? "Yes" : "No",
      ];

      buffer.writeln(row.map(_escapeCsvField).join(','));
    }

    final dateStr = DateFormat('dd_MMM_yyyy').format(DateTime.now());
    final fileName = "Educare_Fees_Report_${scope.replaceAll(' ', '_')}_$dateStr.csv";
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/$fileName');
    await file.writeAsString(buffer.toString(), flush: true);

    await Share.shareXFiles(
      [XFile(file.path, mimeType: 'text/csv')],
      text: "Educare Coaching Classes - Fees Report ($scope)",
      subject: fileName,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Exported fees report for ${data.length} students ($fileName)"),
          backgroundColor: Colors.green.shade700,
        ),
      );
    }
  }

  // ===========================================================================
  // FEATURE: ONE-CLICK BULK FEE REMINDERS PUSH NOTIFICATIONS
  // ===========================================================================
  void _showBulkFeeReminderDialog() {
    String scope = _selectedGrade;
    bool isAllStandards = false;
    bool isSending = false;
    final msgCtrl = TextEditingController(
      text: "Dear Parent, this is a gentle reminder from Educare Coaching Classes regarding pending dues of ₹{amount} for {name} ({grade}). Kindly clear the balance to access digital fee receipts.",
    );

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final targetGrade = isAllStandards ? "ALL" : scope;

          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
            insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            child: Container(
              width: MediaQuery.of(context).size.width > 650 ? 560 : double.infinity,
              constraints: const BoxConstraints(maxHeight: 650),
              padding: const EdgeInsets.all(20),
              child: FutureBuilder<QuerySnapshot>(
                future: isAllStandards
                    ? _firestore.collection('students').get()
                    : _firestore.collection('students').where('class_grade', isEqualTo: scope).get(),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final docs = snap.data?.docs ?? [];
                  final students = docs.map((d) => Student.fromFirestore(d)).toList();

                  return FutureBuilder<List<Map<String, dynamic>>>(
                    future: _fetchFeesForStudents(students),
                    builder: (context, feeSnap) {
                      if (feeSnap.connectionState == ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      final allFees = feeSnap.data ?? [];
                      // Filter defaulters
                      final defaulters = allFees.where((item) {
                        final double pen = (item['pending'] as num?)?.toDouble() ?? 0;
                        return pen > 0;
                      }).toList();

                      final double totalOutstanding = defaulters.fold(
                        0.0,
                        (sum, item) => sum + ((item['pending'] as num?)?.toDouble() ?? 0),
                      );

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: Colors.rose.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(Icons.notification_important_rounded,
                                    color: Colors.rose.shade700, size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Bulk Fee Reminder Notification",
                                      style: TextStyle(
                                          fontSize: 17, fontWeight: FontWeight.bold),
                                    ),
                                    Text(
                                      "Instant push alerts to parents with pending dues",
                                      style: TextStyle(fontSize: 11, color: Colors.grey),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () => Navigator.pop(ctx),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Scope Selector
                          Row(
                            children: [
                              Expanded(
                                child: ChoiceChip(
                                  label: Text(scope, style: const TextStyle(fontSize: 12)),
                                  selected: !isAllStandards,
                                  onSelected: isSending
                                      ? null
                                      : (val) {
                                          if (val) setModalState(() => isAllStandards = false);
                                        },
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: ChoiceChip(
                                  label: const Text("All Std (2–12)", style: TextStyle(fontSize: 12)),
                                  selected: isAllStandards,
                                  onSelected: isSending
                                      ? null
                                      : (val) {
                                          if (val) setModalState(() => isAllStandards = true);
                                        },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),

                          // Identified Defaulters Metric Banner
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: defaulters.isEmpty ? Colors.emerald.shade50 : Colors.rose.shade50,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: defaulters.isEmpty ? Colors.emerald.shade200 : Colors.rose.shade200,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      defaulters.isEmpty
                                          ? "Zero Dues Outstanding!"
                                          : "${defaulters.length} Parents Identified",
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.bold,
                                        color: defaulters.isEmpty ? Colors.emerald.shade900 : Colors.rose.shade900,
                                      ),
                                    ),
                                    Text(
                                      defaulters.isEmpty
                                          ? "All students in this scope have cleared their fees."
                                          : "Total Pending: ₹${NumberFormat('#,##,###').format(totalOutstanding)}",
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: defaulters.isEmpty ? Colors.emerald.shade700 : Colors.rose.shade700,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    "${defaulters.length} Defaulters",
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: defaulters.isEmpty ? Colors.emerald.shade700 : Colors.rose.shade700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Recipients Preview List
                          const Text(
                            "Recipients Preview:",
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 6),
                          Expanded(
                            child: defaulters.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.check_circle_outline_rounded,
                                            size: 40, color: Colors.emerald.shade400),
                                        const SizedBox(height: 6),
                                        const Text(
                                          "No pending fees found in this class scope.",
                                          style: TextStyle(fontSize: 12, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  )
                                : ListView.separated(
                                    itemCount: defaulters.length,
                                    separatorBuilder: (_, __) =>
                                        const Divider(height: 1, color: Color(0xFFE2E8F0)),
                                    itemBuilder: (context, idx) {
                                      final item = defaulters[idx];
                                      final Student s = item['student'] as Student;
                                      final double pen = (item['pending'] as num?)?.toDouble() ?? 0;

                                      return Padding(
                                        padding: const EdgeInsets.symmetric(vertical: 6),
                                        child: Row(
                                          children: [
                                            CircleAvatar(
                                              radius: 14,
                                              backgroundColor: Colors.rose.shade100,
                                              child: Text(
                                                s.classGrade.replaceAll("Std ", "S"),
                                                style: TextStyle(
                                                  fontSize: 9,
                                                  fontWeight: FontWeight.bold,
                                                  color: Colors.rose.shade900,
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Text(
                                                    s.name,
                                                    style: const TextStyle(
                                                        fontSize: 12, fontWeight: FontWeight.bold),
                                                  ),
                                                  Text(
                                                    "Parent: ${s.parentPhone}",
                                                    style: const TextStyle(
                                                        fontSize: 10, color: Colors.grey),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            Text(
                                              "₹${NumberFormat('#,##,###').format(pen)}",
                                              style: TextStyle(
                                                fontSize: 12,
                                                fontWeight: FontWeight.bold,
                                                fontFamily: 'monospace',
                                                color: Colors.rose.shade700,
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  ),
                          ),
                          const SizedBox(height: 10),

                          // Message Template Customizer
                          TextField(
                            controller: msgCtrl,
                            maxLines: 2,
                            style: const TextStyle(fontSize: 11),
                            decoration: InputDecoration(
                              labelText: "Notification Message Template",
                              helperText: "Variables {name}, {amount}, {grade} will be auto-replaced",
                              helperStyle: const TextStyle(fontSize: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                              contentPadding: const EdgeInsets.all(10),
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Send Button
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: isSending ? null : () => Navigator.pop(ctx),
                                child: const Text("Cancel"),
                              ),
                              const SizedBox(width: 6),
                              FilledButton.icon(
                                style: FilledButton.styleFrom(
                                  backgroundColor: Colors.rose.shade700,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                ),
                                icon: isSending
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2, color: Colors.white),
                                      )
                                    : const Icon(Icons.send_rounded, size: 16),
                                label: Text(
                                  isSending
                                      ? "Dispatching FCM Push..."
                                      : "Send Reminders (${defaulters.length})",
                                ),
                                onPressed: isSending || defaulters.isEmpty
                                    ? null
                                    : () async {
                                        setModalState(() => isSending = true);
                                        try {
                                          final callable = _functions.httpsCallable('sendBulkFeeReminders');
                                          final res = await callable.call({
                                            'classGrade': targetGrade,
                                            'customMessage': msgCtrl.text.trim(),
                                          });

                                          if (ctx.mounted) Navigator.pop(ctx);

                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                "Successfully sent push notifications to ${defaulters.length} parents!",
                                              ),
                                              backgroundColor: Colors.green.shade700,
                                              duration: const Duration(seconds: 4),
                                            ),
                                          );
                                        } catch (e) {
                                          setModalState(() => isSending = false);
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text("Reminder dispatch failed: $e")),
                                          );
                                        }
                                      },
                              ),
                            ],
                          ),
                        ],
                      );
                    },
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }


