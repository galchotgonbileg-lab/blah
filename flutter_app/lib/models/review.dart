import 'package:cloud_firestore/cloud_firestore.dart';

class Review {
  const Review({
    required this.id,
    required this.userId,
    required this.userDisplayName,
    required this.tasteRating,
    required this.hygieneRating,
    required this.serviceRating,
    required this.comment,
    required this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String userId;
  final String userDisplayName;
  final int tasteRating;
  final int hygieneRating;
  final int serviceRating;
  final String comment;
  final DateTime createdAt;
  final DateTime? updatedAt;

  double get overallRating => (tasteRating + hygieneRating + serviceRating) / 3;

  factory Review.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Review(
      id: doc.id,
      userId: data['userId'] as String? ?? '',
      userDisplayName: data['userDisplayName'] as String? ?? 'Хэрэглэгч',
      tasteRating: (data['tasteRating'] as num?)?.toInt() ?? 0,
      hygieneRating: (data['hygieneRating'] as num?)?.toInt() ?? 0,
      serviceRating: (data['serviceRating'] as num?)?.toInt() ?? 0,
      comment: data['comment'] as String? ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
    );
  }
}
