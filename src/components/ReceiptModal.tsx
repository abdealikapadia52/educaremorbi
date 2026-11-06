import React from 'react';
import { X, Download, Printer, CheckCircle2, ShieldCheck } from 'lucide-react';
import { StudentData } from '../data/mockData';

interface ReceiptModalProps {
  student: StudentData;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ student, onClose }) => {
  const receiptNo = `EDU-${new Date().getFullYear()}-${student.rollNumber || '8941'}`;
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide">Official Fee Receipt</span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-mono text-indigo-300">{receiptNo}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={() => {
                const element = document.createElement('a');
                const file = new Blob([`Receipt No: ${receiptNo}\nStudent: ${student.name}\nTotal: ₹${student.totalFees}\nStatus: Paid`], { type: 'text/plain' });
                element.href = URL.createObjectURL(file);
                element.download = `${receiptNo}.txt`;
                document.body.appendChild(element);
                element.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-8 bg-white" id="receipt-printable">
          {/* Header */}
          <div className="flex items-start justify-between pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                  E
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    Educare Coaching Classes
                  </h2>
                  <p className="text-xs text-slate-500">
                    Excellence in Academics · Std 2 to 12 CBSE & State Board
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Main Campus: 402 Vidyapeeth Marg, Educational Enclave · Phone: +91 98765 00001
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                PAYMENT COMPLETED
              </span>
              <p className="mt-2 text-xs text-slate-500">Date: {currentDate}</p>
              <p className="text-xs font-mono text-slate-600">No: {receiptNo}</p>
            </div>
          </div>

          {/* Student Info Box */}
          <div className="grid grid-cols-2 gap-4 my-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block">Student Name</span>
              <span className="font-bold text-slate-900 text-sm">{student.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Grade / Standard</span>
              <span className="font-semibold text-slate-800 text-sm">{student.classGrade} (Roll #{student.rollNumber})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Registered Parent Mobile</span>
              <span className="font-mono text-slate-800 font-medium">{student.parentPhone}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Student ID</span>
              <span className="font-mono text-slate-800 font-medium">{student.id}</span>
            </div>
          </div>

          {/* Table Breakdown */}
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 font-semibold">Description</th>
                <th className="py-2.5 font-semibold">Academic Term</th>
                <th className="py-2.5 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 font-medium text-slate-900">
                  Full Coaching & Tutorial Fee
                  <span className="block text-[11px] text-slate-500">Includes classroom lectures, test series & doubt clearing</span>
                </td>
                <td className="py-3">Annual Session 2026-27</td>
                <td className="py-3 text-right font-mono font-medium">₹{(student.totalFees * 0.85).toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">
                  Curriculum Books & Study Material
                  <span className="block text-[11px] text-slate-500">Comprehensive study modules & solved question banks</span>
                </td>
                <td className="py-3">One-time</td>
                <td className="py-3 text-right font-mono font-medium">₹{(student.totalFees * 0.15).toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td colSpan={2} className="pt-3 font-semibold text-slate-900 text-right">Total Course Fees:</td>
                <td className="pt-3 text-right font-mono font-bold text-slate-900">₹{student.totalFees.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td colSpan={2} className="py-1 font-semibold text-emerald-700 text-right">Amount Collected / Paid:</td>
                <td className="py-1 text-right font-mono font-bold text-emerald-700">₹{student.collected.toLocaleString('en-IN')}</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td colSpan={2} className="pt-2 font-bold text-slate-900 text-right text-sm">Remaining Pending Dues:</td>
                <td className="pt-2 text-right font-mono font-bold text-emerald-700 text-sm">₹0 (NIL)</td>
              </tr>
            </tfoot>
          </table>

          {/* Verification Stamp & Signature */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-300 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="text-[11px] text-slate-500">
                <p className="font-semibold text-slate-800">Verified by Firebase Storage</p>
                <p>Authentic Digital Stamp · Educare Accounts Wing</p>
              </div>
            </div>

            <div className="text-right">
              <div className="font-serif italic text-base text-slate-800">S. K. Saxena</div>
              <div className="text-[11px] text-slate-500">Authorized Signatory / Administrator</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
