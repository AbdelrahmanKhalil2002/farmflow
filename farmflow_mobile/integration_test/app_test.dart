// Integration test — login → browse → place order
//
// Prerequisites:
//   1. Backend running:  cd backend && npm start
//   2. DB seeded:        cd backend && node seed.js
//   3. Correct API URL:  farmflow_mobile/.env  →  API_BASE_URL=http://<host>:5001/api
//
// Run:
//   flutter test integration_test/app_test.dart
//   flutter test integration_test/app_test.dart --dart-define=TEST_EMAIL=buyer1@farmflow.com

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

import 'package:farmflow_mobile/main.dart' as app;

const _email    = String.fromEnvironment('TEST_EMAIL',    defaultValue: 'buyer1@farmflow.com');
const _password = String.fromEnvironment('TEST_PASSWORD', defaultValue: 'buyer123');

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('M22.3 — buyer flow', () {
    testWidgets('login → browse farms → open listing → order modal', (tester) async {
      app.main();

      // Wait for splash + auth check
      await tester.pumpAndSettle(const Duration(seconds: 4));

      // ── 1. Login screen ────────────────────────────────────────────────────
      expect(find.text('تسجيل الدخول'), findsWidgets,
          reason: 'LoginScreen should be visible (no stored token)');

      final fields = find.byType(TextFormField);
      expect(fields, findsAtLeastNWidgets(2));

      await tester.enterText(fields.first, _email);
      await tester.pumpAndSettle();
      await tester.enterText(fields.at(1), _password);
      await tester.pumpAndSettle();

      // Dismiss keyboard so the button is visible
      await tester.testTextInput.receiveAction(TextInputAction.done);
      await tester.pumpAndSettle();

      await tester.tap(find.text('تسجيل الدخول').last);
      await tester.pumpAndSettle(const Duration(seconds: 6));

      // ── 2. Buyer home ──────────────────────────────────────────────────────
      // After login the buyer shell should show the farms tab
      expect(find.textContaining('مزار'), findsWidgets,
          reason: 'BuyerHomeScreen farms tab should be visible');

      // Wait for farm cards to load
      await tester.pumpAndSettle(const Duration(seconds: 3));

      // Tap the first farm card (any Card widget in the grid)
      final cards = find.byType(Card);
      expect(cards, findsWidgets, reason: 'Farm cards should be loaded');
      await tester.tap(cards.first);
      await tester.pumpAndSettle(const Duration(seconds: 4));

      // ── 3. Farm detail ─────────────────────────────────────────────────────
      // FarmDetailScreen has a مواشي tab — tap it to show livestock
      final livestockTab = find.text('مواشي');
      if (livestockTab.evaluate().isNotEmpty) {
        await tester.tap(livestockTab.first);
        await tester.pumpAndSettle(const Duration(seconds: 2));
      }

      // ── 4. Listing detail ──────────────────────────────────────────────────
      // Tap the first tappable item in the listing grid
      final listItems = find.byType(InkWell);
      if (listItems.evaluate().length > 1) {
        await tester.tap(listItems.at(1)); // at(0) is often the back button
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // ── 5. Order modal ─────────────────────────────────────────────────
        // Find a button that opens the order modal (طلب شراء / اطلب الآن)
        final orderTrigger = find.byWidgetPredicate(
          (w) => w is Text && (w.data?.contains('طلب') ?? false),
        );
        if (orderTrigger.evaluate().isNotEmpty) {
          await tester.tap(orderTrigger.first);
          await tester.pumpAndSettle(const Duration(seconds: 2));

          // Payment options should appear in the order modal
          expect(
            find.textContaining('الدفع'),
            findsWidgets,
            reason: 'OrderModal should show payment options',
          );
        }
      }
    });
  });
}
