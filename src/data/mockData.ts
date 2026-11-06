export interface FeeTransaction {
  id: string;
  date: string; // 'YYYY-MM-DD'
  amount: number;
  paymentMode: 'UPI' | 'NetBanking' | 'Bank Transfer' | 'Cheque' | 'Cash Receipt';
  referenceNo: string;
  status: 'verified';
  note?: string;
}

export interface StudentData {
  id: string;
  name: string;
  parentPhone: string;
  classGrade: string;
  rollNumber: string;
  totalFees: number;
  collected: number;
  receiptPdfUrl: string | null;
  attendance: Record<string, 'present' | 'absent'>; // 'YYYY-MM-DD' => status
  transactions: FeeTransaction[];
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  target: 'ALL' | string;
  timestamp: string;
  sender: string;
}

export interface FcmNotification {
  id: string;
  title: string;
  body: string;
  type: 'attendance' | 'fee' | 'announcement';
  timestamp: string;
  read: boolean;
}

// Today formatted as YYYY-MM-DD
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Generate sample attendance records for the current month
export function generateInitialAttendance(): Record<string, 'present' | 'absent'> {
  const records: Record<string, 'present' | 'absent'> = {};
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  for (let day = 1; day <= now.getDate(); day++) {
    const d = new Date(year, month, day);
    // Skip Sundays
    if (d.getDay() === 0) continue;
    
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Mostly present, 2 random absents for realism
    if (day === 4 || day === 18) {
      records[dateKey] = 'absent';
    } else {
      records[dateKey] = 'present';
    }
  }
  return records;
}

export const INITIAL_STUDENTS: StudentData[] = [
  {
    id: 'STU_1001',
    name: 'Aarav Sharma',
    parentPhone: '+91 98765 43210',
    classGrade: 'Std 10',
    rollNumber: '1042',
    totalFees: 45000,
    collected: 40000,
    receiptPdfUrl: 'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2FSTU_1001%2Ffee_receipt_2026.pdf?alt=media',
    attendance: generateInitialAttendance(),
    transactions: [
      {
        id: 'TXN-2026-0615',
        date: '2026-06-15',
        amount: 20000,
        paymentMode: 'UPI',
        referenceNo: 'UPI/61720849102',
        status: 'verified',
        note: 'Admission & Term 1 Study Materials',
      },
      {
        id: 'TXN-2026-0910',
        date: '2026-09-10',
        amount: 20000,
        paymentMode: 'NetBanking',
        referenceNo: 'HDFC-IMPS-90241',
        status: 'verified',
        note: 'Term 2 Tuition Installment',
      },
    ],
  },
  {
    id: 'STU_1002',
    name: 'Diya Patel',
    parentPhone: '+91 98765 43211',
    classGrade: 'Std 10',
    rollNumber: '1043',
    totalFees: 45000,
    collected: 45000,
    receiptPdfUrl: 'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2FSTU_1002%2Ffee_receipt_2026.pdf?alt=media',
    attendance: generateInitialAttendance(),
    transactions: [
      {
        id: 'TXN-2026-0601',
        date: '2026-06-01',
        amount: 45000,
        paymentMode: 'NetBanking',
        referenceNo: 'SBI-NEFT-881923',
        status: 'verified',
        note: 'Full Annual Tuition Fee (Single Payment)',
      },
    ],
  },
  {
    id: 'STU_1003',
    name: 'Rohan Mehta',
    parentPhone: '+91 98765 43212',
    classGrade: 'Std 10',
    rollNumber: '1044',
    totalFees: 45000,
    collected: 25000,
    receiptPdfUrl: null,
    attendance: generateInitialAttendance(),
    transactions: [
      {
        id: 'TXN-2026-0620',
        date: '2026-06-20',
        amount: 25000,
        paymentMode: 'Bank Transfer',
        referenceNo: 'ICICI-IMPS-44321',
        status: 'verified',
        note: 'Term 1 Installment & Modules',
      },
    ],
  },
  {
    id: 'STU_1201',
    name: 'Ananya Verma',
    parentPhone: '+91 98765 43213',
    classGrade: 'Std 12',
    rollNumber: '1205',
    totalFees: 60000,
    collected: 60000,
    receiptPdfUrl: 'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2FSTU_1201%2Ffee_receipt_2026.pdf?alt=media',
    attendance: generateInitialAttendance(),
    transactions: [
      {
        id: 'TXN-2026-0605',
        date: '2026-06-05',
        amount: 30000,
        paymentMode: 'UPI',
        referenceNo: 'UPI/99120485912',
        status: 'verified',
        note: 'Term 1 Science & Test Series',
      },
      {
        id: 'TXN-2026-0925',
        date: '2026-09-25',
        amount: 30000,
        paymentMode: 'NetBanking',
        referenceNo: 'AXIS-NEFT-55129',
        status: 'verified',
        note: 'Term 2 Final Settlement',
      },
    ],
  },
  {
    id: 'STU_0901',
    name: 'Kabir Joshi',
    parentPhone: '+91 98765 43214',
    classGrade: 'Std 9',
    rollNumber: '912',
    totalFees: 38000,
    collected: 38000,
    receiptPdfUrl: 'https://firebasestorage.googleapis.com/v0/b/educare-classes.appspot.com/o/receipts%2FSTU_0901%2Ffee_receipt_2026.pdf?alt=media',
    attendance: generateInitialAttendance(),
    transactions: [
      {
        id: 'TXN-2026-0610',
        date: '2026-06-10',
        amount: 38000,
        paymentMode: 'Cash Receipt',
        referenceNo: 'CASH-REC-00912',
        status: 'verified',
        note: 'Annual Coaching & Library Membership',
      },
    ],
  },
];
