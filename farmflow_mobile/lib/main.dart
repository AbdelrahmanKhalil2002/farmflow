import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/l10n/app_localizations.dart';
import 'core/router/app_router.dart';
import 'core/services/fcm_service.dart';
import 'core/theme/app_theme.dart';
import 'core/utils/scaffold_messenger_key.dart';
import 'core/providers/locale_provider.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Load .env (falls back gracefully if file is missing in release)
  await dotenv.load(fileName: '.env', mergeWith: {});
  // Lock to portrait
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const ProviderScope(child: FarmFlowApp()));
}

class FarmFlowApp extends ConsumerStatefulWidget {
  const FarmFlowApp({super.key});

  @override
  ConsumerState<FarmFlowApp> createState() => _FarmFlowAppState();
}

class _FarmFlowAppState extends ConsumerState<FarmFlowApp> {
  bool _fcmInitialised = false;

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);

    // Initialise FCM once the router is ready (fire-and-forget)
    if (!_fcmInitialised) {
      _fcmInitialised = true;
      ref.read(fcmServiceProvider).init(router);
    }

    return MaterialApp.router(
      title: 'FarmFlow',
      debugShowCheckedModeBanner: false,

      // ── Locale (switchable AR/EN) ─────────────────────────────────────────────
      locale: locale,
      supportedLocales: const [
        Locale('ar'),
        Locale('en'),
      ],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      // ── Theme ─────────────────────────────────────────────────────────────────
      theme: AppTheme.light,

      // ── Router ────────────────────────────────────────────────────────────────
      scaffoldMessengerKey: scaffoldMessengerKey,
      routerConfig: router,
    );
  }
}
