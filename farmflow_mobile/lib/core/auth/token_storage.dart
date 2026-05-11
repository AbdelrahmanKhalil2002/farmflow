import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kSecureKey   = 'farmflow_jwt';
const _kFallbackKey = 'farmflow_jwt_fallback';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

class TokenStorage {
  final _secure = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> write(String token) async {
    try {
      await _secure.write(key: _kSecureKey, value: token);
    } on PlatformException {
      // Device keystore unavailable (no lock screen, corrupted keystore, etc.)
      // Fall back to SharedPreferences so login/register can still succeed.
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kFallbackKey, token);
    }
  }

  Future<String?> read() async {
    try {
      final token = await _secure.read(key: _kSecureKey);
      if (token != null) return token;
    } on PlatformException {
      // ignore — fall through to fallback
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kFallbackKey);
  }

  Future<void> delete() async {
    try {
      await _secure.delete(key: _kSecureKey);
    } on PlatformException {
      // ignore
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kFallbackKey);
  }
}
