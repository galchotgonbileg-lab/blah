import 'package:flutter/material.dart';

import '../constants/districts.dart';
import '../models/restaurant.dart';
import '../services/edit_token_store.dart';
import '../services/restaurant_api.dart';
import '../widgets/add_restaurant_sheet.dart';
import '../widgets/confirm_delete_dialog.dart';
import '../widgets/star_rating.dart';
import 'restaurant_detail_page.dart';

class RestaurantListPage extends StatefulWidget {
  const RestaurantListPage({super.key});

  @override
  State<RestaurantListPage> createState() => _RestaurantListPageState();
}

class _RestaurantListPageState extends State<RestaurantListPage> {
  String? _selectedCategory;
  final _searchController = TextEditingController();
  String _query = '';
  late Future<List<Restaurant>> _restaurantsFuture;
  Set<String> _ownedRestaurantIds = {};

  @override
  void initState() {
    super.initState();
    _restaurantsFuture = RestaurantApi.fetchRestaurants();
    EditTokenStore().loadOwnedRestaurantIds().then((ids) {
      if (mounted) setState(() => _ownedRestaurantIds = ids);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _retry() {
    setState(() {
      _restaurantsFuture = RestaurantApi.fetchRestaurants();
    });
  }

  Future<void> _openAddRestaurantSheet() async {
    final created = await showModalBottomSheet<Restaurant>(
      context: context,
      isScrollControlled: true,
      builder: (context) => const AddRestaurantSheet(),
    );

    if (created != null) {
      setState(() {
        _restaurantsFuture = _restaurantsFuture
            .then((list) => [...list, created])
            .catchError((_) => [created]);
        _ownedRestaurantIds = {..._ownedRestaurantIds, created.id};
      });
    }
  }

  Future<void> _openEditRestaurantSheet(Restaurant restaurant) async {
    final updated = await showModalBottomSheet<Restaurant>(
      context: context,
      isScrollControlled: true,
      builder: (context) => AddRestaurantSheet(existing: restaurant),
    );

    if (updated != null) {
      setState(() {
        _restaurantsFuture = _restaurantsFuture.then(
          (list) => [for (final r in list) if (r.id == updated.id) updated else r],
        );
      });
    }
  }

  Future<void> _deleteRestaurant(Restaurant restaurant) async {
    final confirmed = await confirmDelete(
      context,
      title: 'Ресторан устгах',
      message: '"${restaurant.name}"-г устгах уу? Энэ үйлдлийг буцаах боломжгүй.',
    );
    if (!confirmed) return;

    final token = await EditTokenStore().getRestaurantToken(restaurant.id);
    if (token == null) return;

    try {
      await RestaurantApi.deleteRestaurant(id: restaurant.id, editToken: token);
      await EditTokenStore().removeRestaurantToken(restaurant.id);

      if (mounted) {
        setState(() {
          _restaurantsFuture = _restaurantsFuture.then(
            (list) => list.where((r) => r.id != restaurant.id).toList(),
          );
          _ownedRestaurantIds = {..._ownedRestaurantIds}..remove(restaurant.id);
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

  List<Restaurant> _filter(List<Restaurant> restaurants) {
    return restaurants.where((restaurant) {
      final matchesCategory =
          _selectedCategory == null || restaurant.category == _selectedCategory;
      final matchesQuery =
          _query.isEmpty || restaurant.name.toLowerCase().contains(_query.toLowerCase());
      return matchesCategory && matchesQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Рестораны жагсаалт'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddRestaurantSheet,
        icon: const Icon(Icons.add_business_rounded),
        label: const Text('Ресторан нэмэх'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (value) => setState(() => _query = value),
              decoration: InputDecoration(
                hintText: 'Ресторан хайх...',
                prefixIcon: const Icon(Icons.search),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _CategoryChip(
                  label: 'Бүгд',
                  selected: _selectedCategory == null,
                  onTap: () => setState(() => _selectedCategory = null),
                ),
                for (final category in restaurantCategories)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _CategoryChip(
                      label: category,
                      selected: _selectedCategory == category,
                      onTap: () => setState(() => _selectedCategory = category),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: FutureBuilder<List<Restaurant>>(
              future: _restaurantsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return _ErrorState(onRetry: _retry);
                }

                final restaurants = _filter(snapshot.data ?? const []);

                if (restaurants.isEmpty) {
                  return const _EmptyState();
                }

                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  itemCount: restaurants.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, index) => _RestaurantCard(
                    restaurant: restaurants[index],
                    onReturn: _retry,
                    isOwned: _ownedRestaurantIds.contains(restaurants[index].id),
                    onEdit: () => _openEditRestaurantSheet(restaurants[index]),
                    onDelete: () => _deleteRestaurant(restaurants[index]),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onTap(),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  const _RestaurantCard({
    required this.restaurant,
    required this.onReturn,
    required this.isOwned,
    required this.onEdit,
    required this.onDelete,
  });

  final Restaurant restaurant;
  final VoidCallback onReturn;
  final bool isOwned;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.of(context)
              .push(
                MaterialPageRoute(
                  builder: (context) => RestaurantDetailPage(restaurant: restaurant),
                ),
              )
              .then((_) => onReturn());
        },
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  Icons.restaurant_rounded,
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      restaurant.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${restaurant.category} · ${restaurant.district}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        StarRating(rating: restaurant.avgOverall, size: 16),
                        const SizedBox(width: 6),
                        Text(
                          restaurant.avgOverall.toStringAsFixed(1),
                          style: theme.textTheme.bodySmall?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '(${restaurant.reviewCount})',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (isOwned) ...[
                IconButton(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined),
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Засах',
                ),
                IconButton(
                  onPressed: onDelete,
                  icon: Icon(Icons.delete_outline, color: theme.colorScheme.error),
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Устгах',
                ),
              ] else
                const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.search_off_rounded,
            size: 48,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 12),
          const Text('Илэрц олдсонгүй'),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.wifi_off_rounded,
            size: 48,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 12),
          const Text('Мэдээлэл ачаалж чадсангүй.\nСервер ажиллаж байгаа эсэхийг шалгана уу.',
              textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton.tonal(
            onPressed: onRetry,
            child: const Text('Дахин оролдох'),
          ),
        ],
      ),
    );
  }
}
