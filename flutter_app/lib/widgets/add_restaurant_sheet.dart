import 'package:flutter/material.dart';

import '../constants/districts.dart';
import '../models/restaurant.dart';
import '../services/edit_token_store.dart';
import '../services/restaurant_api.dart';

class AddRestaurantSheet extends StatefulWidget {
  const AddRestaurantSheet({super.key, this.existing});

  final Restaurant? existing;

  @override
  State<AddRestaurantSheet> createState() => _AddRestaurantSheetState();
}

class _AddRestaurantSheetState extends State<AddRestaurantSheet> {
  final _formKey = GlobalKey<FormState>();
  late final _nameController = TextEditingController(text: widget.existing?.name ?? '');
  late final _cityController = TextEditingController(text: widget.existing?.city ?? 'Улаанбаатар');
  late final _addressController = TextEditingController(text: widget.existing?.address ?? '');
  String? _district;
  String? _category;
  bool _isSubmitting = false;
  String? _errorText;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    _district = widget.existing?.district;
    _category = widget.existing?.category;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _cityController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false) || _district == null || _category == null) {
      setState(() {
        if (_district == null || _category == null) {
          _errorText = 'Дүүрэг болон ангиллаа сонгоно уу.';
        }
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorText = null;
    });

    try {
      if (_isEditing) {
        final existing = widget.existing!;
        final token = await EditTokenStore().getRestaurantToken(existing.id);
        if (token == null) {
          throw Exception('Энэ ресторанг засах эрхгүй байна.');
        }

        final updated = await RestaurantApi.updateRestaurant(
          id: existing.id,
          editToken: token,
          name: _nameController.text.trim(),
          city: _cityController.text.trim(),
          district: _district!,
          category: _category!,
          address: _addressController.text.trim(),
        );

        if (mounted) {
          Navigator.of(context).pop(updated);
        }
      } else {
        final result = await RestaurantApi.createRestaurant(
          name: _nameController.text.trim(),
          city: _cityController.text.trim(),
          district: _district!,
          category: _category!,
          address: _addressController.text.trim(),
        );

        await EditTokenStore().saveRestaurantToken(result.restaurant.id, result.editToken);

        if (mounted) {
          Navigator.of(context).pop(result.restaurant);
        }
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
              _isEditing ? 'Ресторан засах' : 'Шинэ ресторан нэмэх',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Нэр'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Нэрээ оруулна уу.' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _cityController,
              decoration: const InputDecoration(labelText: 'Хот'),
              validator: (value) =>
                  (value == null || value.trim().isEmpty) ? 'Хотоо оруулна уу.' : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _district,
              decoration: const InputDecoration(labelText: 'Дүүрэг'),
              items: mongolianDistricts
                  .map((district) => DropdownMenuItem(value: district, child: Text(district)))
                  .toList(),
              onChanged: (value) => setState(() => _district = value),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _category,
              decoration: const InputDecoration(labelText: 'Ангилал'),
              items: restaurantCategories
                  .map((category) => DropdownMenuItem(value: category, child: Text(category)))
                  .toList(),
              onChanged: (value) => setState(() => _category = value),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(labelText: 'Хаяг (сонголтоор)'),
            ),
            if (_errorText != null) ...[
              const SizedBox(height: 8),
              Text(
                _errorText!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            const SizedBox(height: 16),
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
                    : Text(_isEditing ? 'Хадгалах' : 'Үүсгэх'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
