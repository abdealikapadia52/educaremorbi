import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'screens/parent_dashboard_screen.dart';
import 'screens/teacher_dashboard_screen.dart';

// Top-level background notification handler for FCM
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint("Handling background FCM message: ${message.messageId}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Request Notification Permissions (Android 13+ & iOS)
  final messaging = FirebaseMessaging.instance;
  await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );

  runApp(const EducareApp());
}

class EducareApp extends StatelessWidget {
  const EducareApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Educare Coaching Classes',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF3730A3),
          primary: const Color(0xFF3730A3),
        ),
        useMaterial3: true,
        fontFamily: 'Roboto',
      ),
      home: const AuthGate(),
    );
  }
}

/// Listens to Auth state and routes to Teacher or Parent Dashboard based on phone number
class AuthGate extends StatelessWidget {
  const AuthGate({Key? key}) : super(key: key);

  // Two hardcoded admin phone numbers per requirements
  static const List<String> teacherPhones = [
    '+919876500001',
    '+919876500002',
  ];

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<User?>(
      stream: FirebaseAuth.instance.authStateChanges(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final user = snapshot.data;
        if (user == null) {
          return const PhoneLoginScreen();
        }

        final phone = user.phoneNumber ?? '';

        // Save/Sync FCM Token to Firestore users collection
        _syncUserToken(user.uid, phone);

        // Teacher Check
        if (teacherPhones.contains(phone)) {
          return TeacherDashboardScreen(teacherPhone: phone);
        }

        // Parent (Default authenticated phone number)
        return ParentDashboardScreen(parentPhoneNumber: phone);
      },
    );
  }

  void _syncUserToken(String uid, String phone) async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        final isTeacher = teacherPhones.contains(phone);
        await FirebaseFirestore.instance.collection('users').doc(uid).set({
          'uid': uid,
          'phone_number': phone,
          'role': isTeacher ? 'teacher' : 'parent',
          'fcm_token': token,
          'last_active': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));

        if (!isTeacher) {
          // Subscribe parent to all_parents topic for broadcast alerts
          await FirebaseMessaging.instance.subscribeToTopic('all_parents');
        }
      }
    } catch (e) {
      debugPrint("Error syncing FCM token: $e");
    }
  }
}

class PhoneLoginScreen extends StatefulWidget {
  const PhoneLoginScreen({Key? key}) : super(key: key);

  @override
  State<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends State<PhoneLoginScreen> {
  final TextEditingController _phoneController = TextEditingController(text: "+91 ");
  final TextEditingController _otpController = TextEditingController();

  String? _verificationId;
  bool _codeSent = false;
  bool _isLoading = false;

  void _verifyPhone() async {
    setState(() => _isLoading = true);
    final phone = _phoneController.text.trim();

    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: phone,
      verificationCompleted: (PhoneAuthCredential credential) async {
        await FirebaseAuth.instance.signInWithCredential(credential);
      },
      verificationFailed: (FirebaseAuthException e) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Auth failed: ${e.message}")));
      },
      codeSent: (String verificationId, int? resendToken) {
        setState(() {
          _verificationId = verificationId;
          _codeSent = true;
          _isLoading = false;
        });
      },
      codeAutoRetrievalTimeout: (String verificationId) {
        _verificationId = verificationId;
      },
    );
  }

  void _submitOtp() async {
    if (_verificationId == null) return;
    setState(() => _isLoading = true);

    try {
      final credential = PhoneAuthProvider.credential(
        verificationId: _verificationId!,
        smsCode: _otpController.text.trim(),
      );
      await FirebaseAuth.instance.signInWithCredential(credential);
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Invalid OTP: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: Colors.indigo.shade50,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.school, color: Colors.indigo.shade700, size: 28),
              ),
              const SizedBox(height: 20),
              const Text(
                "Educare Coaching",
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              Text(
                _codeSent ? "Enter 6-digit OTP sent to your phone" : "Parent-Teacher portal authentication via Phone OTP",
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
              const SizedBox(height: 32),

              if (!_codeSent) ...[
                TextField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: "Mobile Number",
                    hintText: "+91 98765 43210",
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.phone_android),
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    backgroundColor: Colors.indigo.shade700,
                  ),
                  onPressed: _isLoading ? null : _verifyPhone,
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Send Verification OTP"),
                ),
              ] else ...[
                TextField(
                  controller: _otpController,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  decoration: const InputDecoration(
                    labelText: "Enter 6-digit OTP",
                    hintText: "123456",
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock_clock),
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    backgroundColor: Colors.indigo.shade700,
                  ),
                  onPressed: _isLoading ? null : _submitOtp,
                  child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Verify & Enter Portal"),
                ),
                const SizedBox(height: 12),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() => _codeSent = false),
                    child: const Text("Change Phone Number"),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
