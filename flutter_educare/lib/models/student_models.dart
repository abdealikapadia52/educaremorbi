import 'package:cloud_firestore/cloud_firestore.dart';

class Student {
  final String studentId;
  final String name;
  final String parentPhone;
  final String classGrade; // e.g. "Std 10"

  Student({
    required this.studentId,
    required this.name,
    required this.parentPhone,
    required this.classGrade,
  });

  factory Student.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    return Student(
      studentId: doc.id,
      name: data['name'] ?? 'Student',
      parentPhone: data['parent_phone'] ?? '',
      classGrade: data['class_grade'] ?? 'Std 10',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'student_id': studentId,
      'name': name,
      'parent_phone': parentPhone,
      'class_grade': classGrade,
    };
  }
}

class FeeRecord {
  final double totalFees;
  final double collected;
  final double pending; // Dynamically calculated or stored
  final String? receiptPdfUrl;

  FeeRecord({
    required this.totalFees,
    required this.collected,
    required this.pending,
    this.receiptPdfUrl,
  });

  factory FeeRecord.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    final double total = (data['total_fees'] as num?)?.toDouble() ?? 0.0;
    final double coll = (data['collected'] as num?)?.toDouble() ?? 0.0;
    // Dynamic fallback calculation ensures pending is never stale
    final double pend = (total - coll) > 0 ? (total - coll) : 0.0;

    return FeeRecord(
      totalFees: total,
      collected: coll,
      pending: pend,
      receiptPdfUrl: data['receipt_pdf_url'] as String?,
    );
  }

  /// Conditional Visibility Rule:
  /// Button must remain hidden until pending == 0 AND receipt_pdf_url is not null.
  bool get canDownloadReceipt => pending == 0 && (receiptPdfUrl != null && receiptPdfUrl!.trim().isNotEmpty);
}

class FeeTransaction {
  final String id;
  final DateTime date;
  final double amount;
  final String paymentMode; // "UPI", "NetBanking", "Bank Transfer", "Cheque", "Cash"
  final String referenceNo;
  final String status;
  final String? note;

  FeeTransaction({
    required this.id,
    required this.date,
    required this.amount,
    required this.paymentMode,
    required this.referenceNo,
    this.status = 'verified',
    this.note,
  });

  factory FeeTransaction.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    final timestamp = data['date'] as Timestamp?;
    return FeeTransaction(
      id: doc.id,
      date: timestamp != null ? timestamp.toDate() : DateTime.now(),
      amount: (data['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMode: data['payment_mode'] ?? 'UPI',
      referenceNo: data['reference_no'] ?? '',
      status: data['status'] ?? 'verified',
      note: data['note'] as String?,
    );
  }
}

enum AttendanceStatus { present, absent }

class AttendanceRecord {
  final String id;
  final DateTime date;
  final AttendanceStatus status;
  final String? remarks;

  AttendanceRecord({
    required this.id,
    required this.date,
    required this.status,
    this.remarks,
  });

  factory AttendanceRecord.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>? ?? {};
    final timestamp = data['date'] as Timestamp?;
    final date = timestamp != null ? timestamp.toDate() : DateTime.now();
    final statusStr = (data['status'] as String? ?? 'present').toLowerCase();

    return AttendanceRecord(
      id: doc.id,
      date: date,
      status: statusStr == 'absent' ? AttendanceStatus.absent : AttendanceStatus.present,
      remarks: data['remarks'] as String?,
    );
  }
}
