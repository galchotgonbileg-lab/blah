import 'package:flutter/material.dart';

import '../models/restaurant.dart';
import '../models/review.dart';
import '../services/restaurant_api.dart';
import '../widgets/star_rating.dart';

class RestaurantDetailPage extends StatefulWidget {
  const RestaurantDetailPage({super.key, required this.restaurant});

  final Restaurant restaurant;

  @override
  State<RestaurantDetailPage> createState() => _RestaurantDetailPageState();
}

class _RestaurantDetailPageState extends State<RestaurantDetailPage> {
  late Future<List<Review>> _reviewsFuture;

  @override
  void initState() {
    super.initState();
    _reviewsFuture = RestaurantApi.fetchReviews(widget.restaurant.id);
  }

  void _retry() {
    setState(() {
      _reviewsFuture = RestaurantApi.fetchReviews(widget.restaurant.id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final restaurant = widget.restaurant;

    return Scaffold(
      appBar: AppBar(
        title: Text(restaurant.name),
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
