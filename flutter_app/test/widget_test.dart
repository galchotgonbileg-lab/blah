import 'package:flutter_test/flutter_test.dart';

import 'package:restaurant_flutter_app/main.dart';

void main() {
  testWidgets('Home page navigates to restaurant list', (WidgetTester tester) async {
    await tester.pumpWidget(const RestaurantApp());

    expect(find.text('Ресторан үзэх'), findsOneWidget);

    await tester.tap(find.text('Ресторан үзэх'));
    await tester.pumpAndSettle();

    expect(find.text('Рестораны жагсаалт'), findsOneWidget);
  });
}
