import 'package:flutter/material.dart';

class RatingInput extends StatelessWidget {
  const RatingInput({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        SizedBox(
          width: 96,
          child: Text(label, style: theme.textTheme.bodyMedium),
        ),
        ...List.generate(5, (index) {
          final starValue = index + 1;
          return IconButton(
            onPressed: () => onChanged(starValue),
            icon: Icon(
              starValue <= value ? Icons.star_rounded : Icons.star_outline_rounded,
              color: theme.colorScheme.primary,
            ),
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          );
        }),
      ],
    );
  }
}
