import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:farmflow_mobile/core/theme/app_theme.dart';

void main() {
  // Note: testing FarmFlowApp directly is not feasible in unit tests because
  // AuthNotifier immediately fires a real Dio request. These smoke tests verify
  // that Riverpod + theme scaffolding works.

  testWidgets('ProviderScope renders with AppTheme without crashing', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: AppTheme.light,
          home: const Scaffold(body: Center(child: Text('FarmFlow'))),
        ),
      ),
    );
    expect(find.text('FarmFlow'), findsOneWidget);
    expect(find.byType(MaterialApp), findsOneWidget);
  });

  testWidgets('RTL locale renders correctly', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ar'),
        home: const Scaffold(
          body: Center(
            child: Text('مرحباً', textDirection: TextDirection.rtl),
          ),
        ),
      ),
    );
    expect(find.text('مرحباً'), findsOneWidget);
  });
}
