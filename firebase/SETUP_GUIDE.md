# Educare Coaching Classes: Firebase & Flutter Setup Guide

Comprehensive step-by-step setup guide to provision and link Firebase services (Authentication, Firestore, Cloud Storage, Cloud Messaging, and Cloud Functions) with the Flutter application.

---

## 1. Firebase Project Initialization & FlutterFire Setup

### A. Create Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** -> Name it `educare-coaching-classes`.
3. Enable Google Analytics (optional, recommended for tracking FCM deliveries).

### B. Install & Configure FlutterFire CLI
```bash
# 1. Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase CLI
firebase login

# 3. Activate FlutterFire CLI
dart pub global activate flutterfire_cli

# 4. In your Flutter project root, run the auto-configurator:
flutterfire configure --project=educare-coaching-classes
```
This automatically registers Android, iOS, and Web apps, downloads `google-services.json` and `GoogleService-Info.plist`, and generates `lib/firebase_options.dart`.

---

## 2. Phone OTP Authentication Configuration

### A. Enable Phone Provider
1. Firebase Console -> **Build** -> **Authentication** -> **Sign-in method**.
2. Click **Phone** -> Enable it.
3. Under **Phone numbers for testing (optional)**, add testing credentials so you don't burn SMS quota during development:
   - Teacher 1: `+91 98765 00001` -> Test OTP: `123456`
   - Teacher 2: `+91 98765 00002` -> Test OTP: `123456`
   - Test Parent: `+91 98765 43210` -> Test OTP: `123456`

### B. Android SHA-1 and SHA-256 Fingerprints (Crucial for Phone Auth & SafetyNet/Play Integrity)
```bash
cd android
./gradlew signingReport
```
Copy the `SHA-1` and `SHA-256` for `debug` and `release` into:
Firebase Console -> **Project Settings** -> **Your apps** -> **Android App** -> **Add fingerprint**.

### C. iOS Setup
1. Upload your APNs Authentication Key (`.p8`) to Firebase Console -> **Project Settings** -> **Cloud Messaging** -> **Apple app configuration**.
2. In Xcode, enable **Background Modes** (check *Remote notifications*) and **Push Notifications** under *Signing & Capabilities*.
3. Add `URL Schemes` for reversed client ID in `Info.plist`.

---

## 3. Cloud Firestore Provisioning & Indexing

1. Firebase Console -> **Build** -> **Firestore Database** -> **Create database**.
2. Select **Start in production mode** and pick your nearest regional location (e.g. `asia-south1` for Mumbai/India).
3. Deploy the security rules from `/firebase/firestore.rules`:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Composite Indexes Needed
For the query:
```dart
FirebaseFirestore.instance
  .collection('students')
  .doc(studentId)
  .collection('attendance')
  .orderBy('date', descending: true);
```
No composite index needed for single-field order. If querying across all students for a class grade:
`collectionGroup: 'attendance'`, fields: `class_grade ASC, date DESC`.

---

## 4. Firebase Cloud Storage Setup (PDF Receipts)

1. Firebase Console -> **Build** -> **Storage** -> **Get Started**.
2. Deploy the storage security rules from `/firebase/storage.rules`:
   ```bash
   firebase deploy --only storage
   ```
3. Path structure for receipts:
   `/receipts/{student_id}/fee_receipt_{receipt_id}.pdf`
4. The Cloud Function or Teacher Flutter app uploads the generated PDF directly to this path and sets the `receipt_pdf_url` attribute in the student's `fees` sub-collection document.

---

## 5. Firebase Cloud Messaging (FCM) & Cloud Functions

### A. Android Notification Channel Setup
In `android/app/src/main/AndroidManifest.xml`:
```xml
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="attendance_channel" />
```
Add permission in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
```

### B. Deploy Cloud Functions
```bash
cd firebase/functions
npm install
firebase deploy --only functions
```
The triggers:
- `onAttendanceRecordCreated`: fires when an attendance document is added.
- `onFeeUpdated`: fires when fees are updated, auto-calculates pending balance, and notifies parent.
- `sendCustomAnnouncement`: callable function for teachers to broadcast announcements.

---

## 6. Seed Data Quick Reference

### Teachers (Hardcoded Admin):
- `+919876500001` (Principal / Head Teacher)
- `+919876500002` (Administrator)

### Sample Student Schema:
```json
{
  "student_id": "STU_2026_001",
  "name": "Aarav Sharma",
  "parent_phone": "+919876543210",
  "class_grade": "Std 10",
  "enrolled_date": "2026-06-01"
}
```
Sub-collections:
- `/students/STU_2026_001/fees/current`:
  `{ total_fees: 45000, collected: 45000, pending: 0, receipt_pdf_url: "https://firebasestorage.googleapis.com/.../receipt.pdf" }`
- `/students/STU_2026_001/attendance/{autoId}`:
  `{ date: Timestamp.now(), status: "present", remarks: "Maths & Physics" }`
