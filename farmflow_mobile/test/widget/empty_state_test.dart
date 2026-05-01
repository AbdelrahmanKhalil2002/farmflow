import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:farmflow_mobile/shared/widgets/empty_state.dart';
import 'package:farmflow_mobile/core/theme/app_theme.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: child),
    );

void main() {
  group('EmptyState widget', () {
    testWidgets('renders icon and title', (tester) async {
      await tester.pumpWidget(_wrap(
        const EmptyState(icon: Icons.pets_outlined, title: 'لا توجد حيوانات'),
      ));

      expect(find.byIcon(Icons.pets_outlined), findsOneWidget);
      expect(find.text('لا توجد حيوانات'), findsOneWidget);
    });

    testWidgets('renders optional subtitle when provided', (tester) async {
      await tester.pumpWidget(_wrap(
        const EmptyState(
          icon: Icons.pets_outlined,
          title: 'لا توجد حيوانات',
          subtitle: 'سجّل حيوانك الأول',
        ),
      ));

      expect(find.text('سجّل حيوانك الأول'), findsOneWidget);
    });

    testWidgets('hides subtitle when not provided', (tester) async {
      await tester.pumpWidget(_wrap(
        const EmptyState(icon: Icons.search_off_rounded, title: 'لا نتائج'),
      ));

      // Only the title text should be present
      expect(find.byType(Text), findsOneWidget);
    });

    testWidgets('renders action button with label when both provided',
        (tester) async {
      bool tapped = false;
      await tester.pumpWidget(_wrap(
        EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'خطأ في الاتصال',
          actionLabel: 'إعادة المحاولة',
          action: () => tapped = true,
        ),
      ));

      expect(find.text('إعادة المحاولة'), findsOneWidget);
      await tester.tap(find.text('إعادة المحاولة'));
      expect(tapped, isTrue);
    });

    testWidgets('hides button when action is null', (tester) async {
      await tester.pumpWidget(_wrap(
        const EmptyState(
          icon: Icons.sell_outlined,
          title: 'لا توجد إعلانات',
          actionLabel: 'أضف إعلان',
          // action is null — button should not appear
        ),
      ));

      expect(find.byType(FilledButton), findsNothing);
    });

    testWidgets('icon is wrapped in circular container', (tester) async {
      await tester.pumpWidget(_wrap(
        const EmptyState(icon: Icons.pets_outlined, title: 'اختبار'),
      ));

      // Container with BoxDecoration circle shape holds the icon
      final containers = tester
          .widgetList<Container>(find.byType(Container))
          .where((c) =>
              c.decoration is BoxDecoration &&
              (c.decoration as BoxDecoration).shape == BoxShape.circle)
          .toList();
      expect(containers, isNotEmpty);
    });
  });
}
