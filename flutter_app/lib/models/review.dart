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

  factory Review.fromJson(Map<String, dynamic> json) {
    return Review(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      userDisplayName: json['userDisplayName'] as String? ?? 'Хэрэглэгч',
      tasteRating: (json['tasteRating'] as num?)?.toInt() ?? 0,
      hygieneRating: (json['hygieneRating'] as num?)?.toInt() ?? 0,
      serviceRating: (json['serviceRating'] as num?)?.toInt() ?? 0,
      comment: json['comment'] as String? ?? '',
      createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ?? DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.tryParse(json['updatedAt'] as String) : null,
    );
  }
}
