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

  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      city: json['city'] as String? ?? '',
      district: json['district'] as String? ?? '',
      category: json['category'] as String? ?? '',
      createdBy: json['createdBy'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      reviewCount: (json['reviewCount'] as num?)?.toInt() ?? 0,
      avgTaste: (json['avgTaste'] as num?)?.toDouble() ?? 0,
      avgHygiene: (json['avgHygiene'] as num?)?.toDouble() ?? 0,
      avgService: (json['avgService'] as num?)?.toDouble() ?? 0,
      avgOverall: (json['avgOverall'] as num?)?.toDouble() ?? 0,
      address: json['address'] as String?,
      photoUrl: json['photoUrl'] as String?,
    );
  }
}
