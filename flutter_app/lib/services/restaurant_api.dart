import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/restaurant.dart';
import '../models/review.dart';

class RestaurantApi {
  static const String baseUrl = 'https://api1.gbogd.com';

  static Future<List<Restaurant>> fetchRestaurants() async {
    final response = await http.get(Uri.parse('$baseUrl/api/restaurants'));

    if (response.statusCode != 200) {
      throw Exception('Failed to load restaurants (${response.statusCode})');
    }

    final data = jsonDecode(response.body) as List;
    return data.map((item) => Restaurant.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<List<Review>> fetchReviews(String restaurantId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/restaurants/$restaurantId/reviews'));

    if (response.statusCode == 404) {
      throw Exception('Restaurant not found');
    }

    if (response.statusCode != 200) {
      throw Exception('Failed to load reviews (${response.statusCode})');
    }

    final data = jsonDecode(response.body) as List;
    return data.map((item) => Review.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<({Review review, Restaurant restaurant, String editToken})> submitReview({
    required String restaurantId,
    required String userDisplayName,
    required int tasteRating,
    required int hygieneRating,
    required int serviceRating,
    required String comment,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/restaurants/$restaurantId/reviews'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'userDisplayName': userDisplayName,
        'tasteRating': tasteRating,
        'hygieneRating': hygieneRating,
        'serviceRating': serviceRating,
        'comment': comment,
      }),
    );

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode != 201) {
      throw Exception(decoded['error'] as String? ?? 'Failed to submit review (${response.statusCode})');
    }

    final reviewJson = decoded['review'] as Map<String, dynamic>;
    return (
      review: Review.fromJson(reviewJson),
      restaurant: Restaurant.fromJson(decoded['restaurant'] as Map<String, dynamic>),
      editToken: reviewJson['editToken'] as String,
    );
  }

  static Future<({Restaurant restaurant, String editToken})> createRestaurant({
    required String name,
    required String city,
    required String district,
    required String category,
    String? address,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/restaurants'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'city': city,
        'district': district,
        'category': category,
        if (address != null && address.isNotEmpty) 'address': address,
      }),
    );

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode != 201) {
      throw Exception(decoded['error'] as String? ?? 'Failed to create restaurant (${response.statusCode})');
    }

    return (restaurant: Restaurant.fromJson(decoded), editToken: decoded['editToken'] as String);
  }

  static Future<Restaurant> updateRestaurant({
    required String id,
    required String editToken,
    String? name,
    String? city,
    String? district,
    String? category,
    String? address,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/restaurants/$id'),
      headers: {'Content-Type': 'application/json', 'X-Edit-Token': editToken},
      body: jsonEncode({
        if (name != null) 'name': name,
        if (city != null) 'city': city,
        if (district != null) 'district': district,
        if (category != null) 'category': category,
        if (address != null) 'address': address,
      }),
    );

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode != 200) {
      throw Exception(decoded['error'] as String? ?? 'Failed to update restaurant (${response.statusCode})');
    }

    return Restaurant.fromJson(decoded);
  }

  static Future<void> deleteRestaurant({required String id, required String editToken}) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/restaurants/$id'),
      headers: {'X-Edit-Token': editToken},
    );

    if (response.statusCode != 200) {
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      throw Exception(decoded['error'] as String? ?? 'Failed to delete restaurant (${response.statusCode})');
    }
  }

  static Future<Restaurant> deleteReview({
    required String restaurantId,
    required String reviewId,
    required String editToken,
  }) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/restaurants/$restaurantId/reviews/$reviewId'),
      headers: {'X-Edit-Token': editToken},
    );

    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode != 200) {
      throw Exception(decoded['error'] as String? ?? 'Failed to delete review (${response.statusCode})');
    }

    return Restaurant.fromJson(decoded['restaurant'] as Map<String, dynamic>);
  }
}
