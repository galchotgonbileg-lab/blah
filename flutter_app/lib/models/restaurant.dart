import 'package:cloud_firestore/cloud_firestore.dart';

class Restaurant {
  const Restaurant({
    required this.id,
    required this.name,
    required this.city,
    required this.district,
    required this.category,
    required this.createdBy,
    required this.createdAt,
    required this.reviewCount,
    required this.avgTaste,
    required this.avgHygiene,
    required this.avgService,
    required this.avgOverall,
    this.address,
    this.photoUrl,
  });

  final String id;
  final String name;
  final String city;
  final String district;
  final String category;
  final String createdBy;
  final DateTime createdAt;
  final int reviewCount;
  final double avgTaste;
  final double avgHygiene;
  final double avgService;
  final double avgOverall;
  final String? address;
  final String? photoUrl;

  factory Restaurant.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data()!;
    return Restaurant(
      id: doc.id,
      name: data['name'] as String? ?? '',
      city: data['city'] as String? ?? '',
      district: data['district'] as String? ?? '',
      category: data['category'] as String? ?? '',
      createdBy: data['createdBy'] as String? ?? '',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      reviewCount: (data['reviewCount'] as num?)?.toInt() ?? 0,
      avgTaste: (data['avgTaste'] as num?)?.toDouble() ?? 0,
      avgHygiene: (data['avgHygiene'] as num?)?.toDouble() ?? 0,
      avgService: (data['avgService'] as num?)?.toDouble() ?? 0,
      avgOverall: (data['avgOverall'] as num?)?.toDouble() ?? 0,
      address: data['address'] as String?,
      photoUrl: data['photoUrl'] as String?,
    );
  }

  static Map<String, dynamic> newDocData({
    required String name,
    required String city,
    required String district,
    required String category,
    required String createdBy,
    String? address,
    String? photoUrl,
  }) {
    return {
      'name': name,
      'nameLower': name.toLowerCase(),
      'city': city,
      'district': district,
      'category': category,
      'address': address,
      'photoUrl': photoUrl,
      'createdBy': createdBy,
      'createdAt': FieldValue.serverTimestamp(),
      'reviewCount': 0,
      'sumTaste': 0,
      'sumHygiene': 0,
      'sumService': 0,
      'avgTaste': 0,
      'avgHygiene': 0,
      'avgService': 0,
      'avgOverall': 0,
    };
  }
}
