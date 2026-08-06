import 'package:cloud_firestore/cloud_firestore.dart';

class AppUser {
  const AppUser({
    required this.uid,
    required this.displayName,
    required this.email,
  });

  final String uid;
  final String displayName;
  final String email;

  factory AppUser.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return AppUser(
      uid: doc.id,
      displayName: data['displayName'] as String? ?? '',
      email: data['email'] as String? ?? '',
    );
  }
}
