import 'package:shared_preferences/shared_preferences.dart';

class EditTokenStore {
  static const _restaurantPrefix = 'edit_token:restaurant:';
  static const _reviewPrefix = 'edit_token:review:';

  Future<void> saveRestaurantToken(String id, String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('$_restaurantPrefix$id', token);
    } catch (_) {
      // Ignore storage failures; the user simply won't see edit/delete affordances.
    }
  }

  Future<void> saveReviewToken(String id, String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('$_reviewPrefix$id', token);
    } catch (_) {}
  }

  Future<String?> getRestaurantToken(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('$_restaurantPrefix$id');
    } catch (_) {
      return null;
    }
  }

  Future<String?> getReviewToken(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('$_reviewPrefix$id');
    } catch (_) {
      return null;
    }
  }

  Future<void> removeRestaurantToken(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('$_restaurantPrefix$id');
    } catch (_) {}
  }

  Future<void> removeReviewToken(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('$_reviewPrefix$id');
    } catch (_) {}
  }

  Future<Set<String>> loadOwnedRestaurantIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs
          .getKeys()
          .where((key) => key.startsWith(_restaurantPrefix))
          .map((key) => key.substring(_restaurantPrefix.length))
          .toSet();
    } catch (_) {
      return {};
    }
  }

  Future<Set<String>> loadOwnedReviewIds() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs
          .getKeys()
          .where((key) => key.startsWith(_reviewPrefix))
          .map((key) => key.substring(_reviewPrefix.length))
          .toSet();
    } catch (_) {
      return {};
    }
  }
}
