import 'package:flutter/material.dart';

import '../models/restaurant.dart';
import '../models/review.dart';
import '../services/edit_token_store.dart';
import '../services/restaurant_api.dart';
import '../widgets/add_restaurant_sheet.dart';
import '../widgets/confirm_delete_dialog.dart';
import '../widgets/rating_input.dart';
import '../widgets/star_rating.dart';

class RestaurantDetailPage extends StatefulWidget {
  const RestaurantDetailPage({super.key, required this.restaurant});

  final Restaurant restaurant;

  @override
  State<RestaurantDetailPage> createState() => _RestaurantDetailPageState();
}

class _RestaurantDetailPageState extends State<RestaurantDetailPage> {
  late Restaurant _restaurant = widget.restaurant;
  late Future<List<Review>> _reviewsFuture;
  bool _ownsRestaurant = false;
  Set<String> _ownedReviewIds = {};

  @override
  void initState() {
    super.initState();
    _reviewsFuture = RestaurantApi.fetchReviews(widget.restaurant.id);
    EditTokenStore().getRestaurantToken(widget.restaurant.id).then((token) {
      if (mounted) setState(() => _ownsRestaurant = token != null);
    });
    EditTokenStore().loadOwnedReviewIds().then((ids) {
      if (mounted) setState(() => _ownedReviewIds = ids);
    });
  }

  void _retry() {
    setState(() {
      _reviewsFuture = RestaurantApi.fetchReviews(widget.restaurant.id);
    });
  }

  Future<void> _openAddReviewSheet() async {
    final result = await showModalBottomSheet<({Review review, Restaurant restaurant, String editToken})>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AddReviewSheet(restaurantId: _restaurant.id),
    );

    if (result != null) {
      await EditTokenStore().saveReviewToken(result.review.id, result.editToken);
      setState(() {
        _restaurant = result.restaurant;
        _reviewsFuture = RestaurantApi.fetchReviews(_restaurant.id);
        _ownedReviewIds = {..._ownedReviewIds, result.review.id};
      });
    }
  }

  Future<void> _openEditRestaurantSheet() async {
    final updated = await showModalBottomSheet<Restaurant>(
      context: context,
      isScrollControlled: true,
      builder: (context) => AddRestaurantSheet(existing: _restaurant),
    );

    if (updated != null) {
      setState(() => _restaurant = updated);
    }
  }

  Future<void> _deleteRestaurant() async {
    final confirmed = await confirmDelete(
      context,
      title: 'Ресторан устгах',
      message: '"${_restaurant.name}"-г устгах уу? Энэ үйлдлийг буцаах боломжгүй.',
    );
    if (!confirmed) return;

    final token = await EditTokenStore().getRestaurantToken(_restaurant.id);
    if (token == null) return;

    try {
      await RestaurantApi.deleteRestaurant(id: _restaurant.id, editToken: token);
      await EditTokenStore().removeRestaurantToken(_restaurant.id);
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  Future<void> _deleteReview(Review review) async {
    final confirmed = await confirmDelete(
      context,
      title: 'Сэтгэгдэл устгах',
      message: 'Энэ сэтгэгдлийг устгах уу?',
    );
    if (!confirmed) return;

    final token = await EditTokenStore().getReviewToken(review.id);
    if (token == null) return;

    try {
      final updatedRestaurant = await RestaurantApi.deleteReview(
        restaurantId: _restaurant.id,
        reviewId: review.id,
        editToken: token,
      );
      await EditTokenStore().removeReviewToken(review.id);

      if (mounted) {
        setState(() {
          _restaurant = updatedRestaurant;
          _reviewsFuture = _reviewsFuture.then(
            (list) => list.where((r) => r.id != review.id).toList(),
          );
          _ownedReviewIds = {..._ownedReviewIds}..remove(review.id);
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(error.toString().replaceFirst('Exception: ', ''))),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final restaurant = _restaurant;

    return Scaffold(
      appBar: AppBar(
        title: Text(restaurant.name),
        actions: [
          if (_ownsRestaurant)
            PopupMenuButton<String>(
              onSelected: (value) {
                if (value == 'edit') _openEditRestaurantSheet();
                if (value == 'delete') _deleteRestaurant();
              },
              itemBuilder: (context) => const [
                PopupMenuItem(value: 'edit', child: Text('Засах')),
                PopupMenuItem(value: 'delete', child: Text('Устгах')),
              ],
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddReviewSheet,
        icon: const Icon(Icons.rate_review_rounded),
        label: const Text('Сэтгэгдэл нэмэх'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: theme.colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.restaurant_rounded,
                  size: 40,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
                const SizedBox(height: 12),
                Text(
                  restaurant.name,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${restaurant.category} · ${restaurant.district}, ${restaurant.city}',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                ),
                if (restaurant.address != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    restaurant.address!,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    StarRating(rating: restaurant.avgOverall, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      '${restaurant.avgOverall.toStringAsFixed(1)} (${restaurant.reviewCount} үнэлгээ)',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: _RatingStat(label: 'Амт', value: restaurant.avgTaste),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _RatingStat(label: 'Ариун цэвэр', value: restaurant.avgHygiene),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _RatingStat(label: 'Үйлчилгээ', value: restaurant.avgService),
              ),
            ],
          ),
          const SizedBox(height: 24),
          FutureBuilder<List<Review>>(
            future: _reviewsFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              if (snapshot.hasError) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Сэтгэгдэл ачаалж чадсангүй.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: _retry,
                        child: const Text('Дахин оролдох'),
                      ),
                    ],
                  ),
                );
              }

              final reviews = snapshot.data ?? const [];

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Сэтгэгдэл (${reviews.length})',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  if (reviews.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Text(
                        'Одоогоор сэтгэгдэл алга.',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  else
                    ...reviews.map((review) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 16,
                                        backgroundColor: theme.colorScheme.secondaryContainer,
                                        child: Text(
                                          review.userDisplayName.isNotEmpty
                                              ? review.userDisplayName[0]
                                              : '?',
                                          style: TextStyle(
                                            color: theme.colorScheme.onSecondaryContainer,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Text(
                                          review.userDisplayName,
                                          style: theme.textTheme.bodyMedium?.copyWith(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      StarRating(rating: review.overallRating, size: 15),
                                      if (_ownedReviewIds.contains(review.id))
                                        IconButton(
                                          onPressed: () => _deleteReview(review),
                                          icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
                                          visualDensity: VisualDensity.compact,
                                          tooltip: 'Устгах',
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(review.comment),
                                ],
                              ),
                            ),
                          ),
                        )),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _AddReviewSheet extends StatefulWidget {
  const _AddReviewSheet({required this.restaurantId});

  final String restaurantId;

  @override
  State<_AddReviewSheet> createState() => _AddReviewSheetState();
}

class _AddReviewSheetState extends State<_AddReviewSheet> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _commentController = TextEditingController();
  int _tasteRating = 0;
  int _hygieneRating = 0;
  int _serviceRating = 0;
  bool _isSubmitting = false;
  String? _errorText;

  @override
  void dispose() {
    _nameController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  bool get _ratingsValid => _tasteRating > 0 && _hygieneRating > 0 && _serviceRating > 0;

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false) || !_ratingsValid) {
      setState(() {
        if (!_ratingsValid) {
          _errorText = 'Бүх үнэлгээг сонгоно уу.';
        }
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      final result = await RestaurantApi.submitReview(
        restaurantId: widget.restaurantId,
        userDisplayName: _nameController.text.trim(),
        tasteRating: _tasteRating,
        hygieneRating: _hygieneRating,
        serviceRating: _serviceRating,
        comment: _commentController.text.trim(),
      );

      if (mounted) {
        Navigator.of(context).pop<({Review review, Restaurant restaurant, String editToken})>(result);
      }
    } catch (error) {
      setState(() {
        _errorText = error.toString().replaceFirst('Exception: ', '');
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Сэтгэгдэл нэмэх',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Таны нэр'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Нэрээ оруулна уу.' : null,
            ),
            const SizedBox(height: 16),
            RatingInput(
              label: 'Амт',
              value: _tasteRating,
              onChanged: (value) => setState(() => _tasteRating = value),
            ),
            RatingInput(
              label: 'Ариун цэвэр',
              value: _hygieneRating,
              onChanged: (value) => setState(() => _hygieneRating = value),
            ),
            RatingInput(
              label: 'Үйлчилгээ',
              value: _serviceRating,
              onChanged: (value) => setState(() => _serviceRating = value),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _commentController,
              decoration: const InputDecoration(labelText: 'Сэтгэгдэл'),
              maxLength: 500,
              maxLines: 3,
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Сэтгэгдэл бичнэ үү.' : null,
            ),
            if (_errorText != null) ...[
              Text(
                _errorText!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
              const SizedBox(height: 8),
            ],
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Илгээх'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatingStat extends StatelessWidget {
  const _RatingStat({required this.label, required this.value});

  final String label;
  final double value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outlineVariant),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        children: [
          Text(
            value.toStringAsFixed(1),
            style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}
