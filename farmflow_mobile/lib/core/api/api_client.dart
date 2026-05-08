import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../auth/token_storage.dart';
import '../utils/scaffold_messenger_key.dart';

/// Priority: .env file → --dart-define → platform localhost fallback.
String get _kBaseUrl {
  final dotenvUrl = dotenv.maybeGet('API_BASE_URL') ?? '';
  if (dotenvUrl.isNotEmpty) return dotenvUrl;
  const compileUrl = String.fromEnvironment('API_BASE_URL');
  if (compileUrl.isNotEmpty) return compileUrl;
  return Platform.isAndroid
      ? 'http://10.0.2.2:5001/api'
      : 'http://localhost:5001/api';
}

final dioProvider = Provider<Dio>((ref) {
  final tokenStorage = ref.read(tokenStorageProvider);
  final dio = Dio(BaseOptions(
    baseUrl: _kBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {
      'Accept': 'application/json',
    },
  ));

  // ── Request interceptor: inject Bearer token ─────────────────────────────────
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await tokenStorage.read();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (DioException error, handler) async {
      // 401 → clear token; the router will redirect to /login
      if (error.response?.statusCode == 401) {
        await tokenStorage.delete();
      }
      // Network / server errors (no response or 5xx) → global snackbar
      final status = error.response?.statusCode;
      if (status == null || status >= 500) {
        scaffoldMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(
              dioErrorMessage(error),
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 13),
            ),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 3),
          ),
        );
      }
      handler.next(error);
    },
  ));

  return dio;
});

/// Extracts a human-readable Arabic error message from a DioException.
String dioErrorMessage(DioException e) {
  if (e.response?.data is Map) {
    final msg = e.response!.data['message'];
    if (msg is String && msg.isNotEmpty) return msg;
    final errors = e.response!.data['errors'];
    if (errors is List && errors.isNotEmpty) {
      final first = errors.first;
      if (first is Map && first['msg'] is String) return first['msg'] as String;
    }
  }
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.receiveTimeout:
      return 'انتهت مهلة الاتصال. تحقق من الإنترنت.';
    case DioExceptionType.connectionError:
      return 'تعذّر الاتصال بالخادم. تحقق من الشبكة.';
    default:
      return 'حدث خطأ غير متوقع. حاول مجدداً.';
  }
}
