import 'package:flutter/material.dart';

import 'menu_page.dart';

void main() {
  runApp(const RestaurantApp());
}

class RestaurantApp extends StatelessWidget {
  const RestaurantApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Restaurant App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepOrange),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant App'),
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.restaurant, size: 64),
            SizedBox(height: 16),
            Text(
              'Flutter starter бэлэн боллоо',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('Та эндээс хөгжүүлж эхлэх боломжтой.'),
            SizedBox(height: 24),
            _ViewMenuButton(),
          ],
        ),
      ),
    );
  }
}

class _ViewMenuButton extends StatelessWidget {
  const _ViewMenuButton();

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => const MenuPage()),
        );
      },
      icon: const Icon(Icons.restaurant_menu),
      label: const Text('View Menu'),
    );
  }
}
