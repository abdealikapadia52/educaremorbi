/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Educare Coaching Classes - Firebase Cloud Functions
 * Automated FCM push notifications for:
 * 1. Attendance marking (Present / Absent)
 * 2. Fee updates & Receipt ready notification
 * 3. Teacher custom announcements (All Parents or Specific Parent Phone)
 */

const { onDocumentCreated, onDocumentUpdated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

// Hardcoded authorized Teacher Phone Numbers
const TEACHER_PHONES = ["+919876500001", "+919876500002"];

/**
 * Helper to fetch FCM token for a given parent phone number from the users collection.
 * @param {string} parentPhone 
 * @returns {Promise<string|null>}
 */
async function getParentFcmToken(parentPhone) {
  if (!parentPhone) return null;
  const snap = await db.collection("users")
    .where("phone_number", "==", parentPhone)
    .limit(1)
    .get();

  if (snap.empty) {
    console.log(`[FCM] No user document found for parent phone: ${parentPhone}`);
    return null;
  }
  const token = snap.docs[0].data().fcm_token;
  return token || null;
}

/**
 * TRIGGER 1: Automated Push Notification on Attendance Creation or Update
 * Firestore path: students/{studentId}/attendance/{attendanceId}
 */
exports.onAttendanceRecordCreated = onDocumentCreated(
  "students/{studentId}/attendance/{attendanceId}",
  async (event) => {
    const studentId = event.params.studentId;
    const attendanceData = event.data?.data();

    if (!attendanceData) {
      console.log("[Attendance] No attendance data found.");
      return null;
    }

    try {
      // 1. Fetch student document to get student's name and parent phone
      const studentDoc = await db.collection("students").doc(studentId).get();
      if (!studentDoc.exists) {
        console.log(`[Attendance] Student doc ${studentId} does not exist.`);
        return null;
      }

      const student = studentDoc.data();
      const parentPhone = student.parent_phone;
      const studentName = student.name || "Student";
      const status = (attendanceData.status || "present").toUpperCase();

      // Format date for notification display
      let dateString = "today";
      if (attendanceData.date && attendanceData.date.toDate) {
        dateString = attendanceData.date.toDate().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric"
        });
      }

      // 2. Lookup parent FCM token
      const parentFcmToken = await getParentFcmToken(parentPhone);
      if (!parentFcmToken) {
        console.log(`[Attendance] Parent ${parentPhone} has no registered FCM token.`);
        return null;
      }

      // 3. Dispatch FCM Push Notification
      const isPresent = status === "PRESENT";
      const message = {
        token: parentFcmToken,
        notification: {
          title: `Attendance Alert: ${studentName}`,
          body: isPresent
            ? `Good news! ${studentName} is marked PRESENT for classes on ${dateString}.`
            : `Notice: ${studentName} has been marked ABSENT for classes on ${dateString}. Please contact us if unplanned.`
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "attendance_update",
          student_id: studentId,
          status: status.toLowerCase(),
          date: dateString
        },
        android: {
          priority: "high",
          notification: {
            channelId: "attendance_channel",
            color: isPresent ? "#16a34a" : "#dc2626",
            sound: "default"
          }
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1
            }
          }
        }
      };

      const response = await messaging.send(message);
      console.log(`[FCM Attendance] Notification sent successfully: ${response}`);
      return response;
    } catch (error) {
      console.error("[FCM Attendance] Error dispatching notification:", error);
      return null;
    }
  }
);

/**
 * TRIGGER 2: Automated Push Notification on Fee Update & Dynamic Calculation
 * Firestore path: students/{studentId}/fees/{feeId}
 */
exports.onFeeUpdated = onDocumentWritten(
  "students/{studentId}/fees/{feeId}",
  async (event) => {
    const studentId = event.params.studentId;
    const feeData = event.data?.after?.data();

    if (!feeData) {
      console.log("[Fee] Document was deleted, skipping notification.");
      return null;
    }

    try {
      const studentDoc = await db.collection("students").doc(studentId).get();
      if (!studentDoc.exists) return null;

      const student = studentDoc.data();
      const parentPhone = student.parent_phone;
      const studentName = student.name || "Student";

      // Dynamic calculations
      const totalFees = Number(feeData.total_fees || 0);
      const collected = Number(feeData.collected || 0);
      const pending = Math.max(0, totalFees - collected);
      const receiptPdfUrl = feeData.receipt_pdf_url;

      // Check if pending stored in doc needs updating (optional sync)
      if (feeData.pending !== pending) {
        await event.data.after.ref.update({ pending: pending });
      }

      const parentFcmToken = await getParentFcmToken(parentPhone);
      if (!parentFcmToken) return null;

      let notifTitle = "";
      let notifBody = "";

      // Conditional receipt check: pending == 0 AND receipt_pdf_url is present
      if (pending === 0 && receiptPdfUrl) {
        notifTitle = `Fee Receipt Available: ${studentName}`;
        notifBody = `Full payment of ₹${collected.toLocaleString("en-IN")} received. All dues cleared! Tap to download your official receipt.`;
      } else {
        notifTitle = `Fee Record Updated: ${studentName}`;
        notifBody = `Total: ₹${totalFees.toLocaleString("en-IN")} | Paid: ₹${collected.toLocaleString("en-IN")} | Pending: ₹${pending.toLocaleString("en-IN")}.`;
      }

      const message = {
        token: parentFcmToken,
        notification: {
          title: notifTitle,
          body: notifBody
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "fee_update",
          student_id: studentId,
          pending: String(pending),
          has_receipt: String(pending === 0 && !!receiptPdfUrl)
        },
        android: {
          priority: "high",
          notification: {
            channelId: "fees_channel",
            sound: "default",
            color: "#4f46e5"
          }
        }
      };

      const response = await messaging.send(message);
      console.log(`[FCM Fees] Notification sent: ${response}`);
      return response;
    } catch (error) {
      console.error("[FCM Fees] Error processing fee update:", error);
      return null;
    }
  }
);

/**
 * TRIGGER 3: Custom Announcements from Teacher Dashboard
 * Can be invoked via Callable Cloud Function or Firestore Announcement creation.
 */
exports.sendCustomAnnouncement = onCall(async (request) => {
  // 1. Verify caller is an authenticated teacher
  const callerPhone = request.auth?.token?.phone_number;
  if (!callerPhone || !TEACHER_PHONES.includes(callerPhone)) {
    throw new HttpsError(
      "permission-denied",
      "Only authorized Educare teachers can broadcast announcements."
    );
  }

  const { title, message, target, targetPhone } = request.data;
  if (!title || !message) {
    throw new HttpsError("invalid-argument", "Announcement title and message are required.");
  }

  try {
    // Save to announcements collection for in-app history
    await db.collection("announcements").add({
      title,
      message,
      target: target === "ALL" ? "all" : targetPhone,
      sender_phone: callerPhone,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    if (target === "ALL") {
      // Option A: Send via FCM Topic subscribed by parents
      const topicMessage = {
        topic: "all_parents",
        notification: {
          title: `Educare Announcement: ${title}`,
          body: message
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "announcement",
          broadcast: "true"
        }
      };
      const response = await messaging.send(topicMessage);
      return { success: true, mode: "topic_broadcast", messageId: response };
    } else {
      // Option B: Send to a specific parent phone
      if (!targetPhone) {
        throw new HttpsError("invalid-argument", "Target parent phone number is required.");
      }

      const fcmToken = await getParentFcmToken(targetPhone);
      if (!fcmToken) {
        return {
          success: false,
          error: `Parent with phone ${targetPhone} is not currently registered or has no active FCM token.`
        };
      }

      const singleMessage = {
        token: fcmToken,
        notification: {
          title: `Message from Educare: ${title}`,
          body: message
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "announcement",
          broadcast: "false"
        }
      };
      const response = await messaging.send(singleMessage);
      return { success: true, mode: "direct_parent", messageId: response };
    }
  } catch (err) {
    console.error("[FCM Announcement] Broadcast error:", err);
    throw new HttpsError("internal", err.message);
  }
});

/**
 * CALLABLE FUNCTION 2: One-Click Bulk Fee Payment Reminder Push Notifications
 * Identifies all students with pending dues (all standards or specific grade)
 * and dispatches individualized FCM notifications to their parents.
 */
exports.sendBulkFeeReminders = onCall({ region: "asia-south1" }, async (request) => {
  const callerPhone = request.auth?.token?.phone_number;
  if (!isTeacher(callerPhone)) {
    throw new HttpsError(
      "permission-denied",
      "Only authorized Educare teachers/admins can send bulk fee reminders."
    );
  }

  const { classGrade, customMessage, minimumPending = 1 } = request.data || {};

  try {
    let studentQuery = db.collection("students");
    if (classGrade && classGrade !== "ALL") {
      studentQuery = studentQuery.where("class_grade", "==", classGrade);
    }
    const studentSnapshot = await studentQuery.get();

    if (studentSnapshot.empty) {
      return { success: true, count: 0, message: "No students found." };
    }

    const defaulters = [];
    let totalOutstanding = 0;

    for (const doc of studentSnapshot.docs) {
      const student = doc.data();
      const feeDoc = await doc.ref.collection("fees").doc("current").get();
      if (!feeDoc.exists) continue;

      const feeData = feeDoc.data();
      const totalFees = Number(feeData.total_fees || 0);
      const collected = Number(feeData.collected || 0);
      const pending = Math.max(0, totalFees - collected);

      if (pending >= minimumPending) {
        totalOutstanding += pending;
        defaulters.push({
          studentId: doc.id,
          studentName: student.name || "Student",
          classGrade: student.class_grade || "-",
          parentPhone: student.parent_phone,
          totalFees,
          collected,
          pending,
        });
      }
    }

    if (defaulters.length === 0) {
      return {
        success: true,
        count: 0,
        totalOutstanding: 0,
        message: "All students in this scope have fully cleared their dues!"
      };
    }

    let dispatchedCount = 0;
    const notificationPromises = defaulters.map(async (defaulter) => {
      const fcmToken = await getParentFcmToken(defaulter.parentPhone);
      if (!fcmToken) {
        console.warn(`[Bulk Reminder] No token for parent ${defaulter.parentPhone}`);
        return null;
      }

      const bodyText = customMessage
        ? customMessage
            .replace("{name}", defaulter.studentName)
            .replace("{amount}", `₹${defaulter.pending.toLocaleString("en-IN")}`)
            .replace("{grade}", defaulter.classGrade)
        : `Fee Reminder: A balance of ₹${defaulter.pending.toLocaleString("en-IN")} is pending for ${defaulter.studentName} (${defaulter.classGrade}). Kindly clear dues to download the official fee receipt.`;

      const message = {
        token: fcmToken,
        notification: {
          title: "Fee Reminder • Educare Classes",
          body: bodyText,
        },
        data: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          type: "bulk_fee_reminder",
          student_id: defaulter.studentId,
          pending_amount: String(defaulter.pending),
        },
        android: {
          priority: "high",
          notification: {
            channelId: "fee_channel",
            color: "#e11d48",
            sound: "default",
          },
        },
      };

      try {
        const res = await messaging.send(message);
        dispatchedCount++;
        return res;
      } catch (err) {
        console.error(`[Bulk Reminder] Failed to send to ${defaulter.parentPhone}:`, err);
        return null;
      }
    });

    await Promise.all(notificationPromises);

    await db.collection("fee_reminder_logs").add({
      sender_phone: callerPhone,
      scope: classGrade || "ALL",
      defaulters_count: defaulters.length,
      dispatched_count: dispatchedCount,
      total_outstanding: totalOutstanding,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      defaultersCount: defaulters.length,
      dispatchedCount,
      totalOutstanding,
      message: `Sent fee reminders to ${dispatchedCount} parents successfully.`,
    };
  } catch (error) {
    console.error("[Bulk Fee Reminder Error]:", error);
    throw new HttpsError("internal", error.message);
  }
});
