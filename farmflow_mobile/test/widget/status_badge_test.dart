import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:farmflow_mobile/shared/widgets/status_badge.dart';
import 'package:farmflow_mobile/core/theme/app_theme.dart';

Widget _wrap(Widget child) => MaterialApp(
      theme: AppTheme.light,
      home: Scaffold(body: Center(child: child)),
    );

void main() {
  group('StatusBadge — Arabic labels', () {
    final cases = {
      'pending':    'قيد المراجعة',
      'approved':   'مُعتمد',
      'rejected':   'مرفوض',
      'sold':       'مُباع',
      'sold_out':   'نفد المخزون',
      'placed':     'تم الطلب',
      'confirmed':  'مؤكد',
      'in_transit': 'جاري التوصيل',
      'completed':  'مكتمل',
      'cancelled':  'ملغي',
      'healthy':    'بصحة جيدة',
      'sick':       'مريض',
      'quarantine': 'حجر صحي',
      'deceased':   'نافق',
      'active':     'نشط',
    };

    for (final entry in cases.entries) {
      testWidgets('status "${entry.key}" shows "${entry.value}"',
          (tester) async {
        await tester.pumpWidget(_wrap(StatusBadge(status: entry.key)));
        expect(find.text(entry.value), findsOneWidget);
      });
    }

    testWidgets('unknown status falls back to "غير معروف"', (tester) async {
      await tester.pumpWidget(_wrap(const StatusBadge(status: 'mystery')));
      expect(find.text('غير معروف'), findsOneWidget);
    });
  });

  group('StatusBadge — small vs normal size', () {
    testWidgets('normal badge renders a Container', (tester) async {
      await tester.pumpWidget(_wrap(const StatusBadge(status: 'approved')));
      expect(find.byType(Container), findsWidgets);
    });

    testWidgets('small=true badge renders with smaller font', (tester) async {
      await tester.pumpWidget(_wrap(
        const StatusBadge(status: 'approved', small: true),
      ));
      final text = tester.widget<Text>(find.text('مُعتمد'));
      expect(text.style?.fontSize, equals(10.0));
    });

    testWidgets('small=false badge uses 11pt font', (tester) async {
      await tester.pumpWidget(_wrap(
        const StatusBadge(status: 'approved', small: false),
      ));
      final text = tester.widget<Text>(find.text('مُعتمد'));
      expect(text.style?.fontSize, equals(11.0));
    });
  });
}
