import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/restaurant.dart';
import '../models/review.dart';

class RestaurantApi {
  static const String baseUrl = 'http://localhost:3000';

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
}
