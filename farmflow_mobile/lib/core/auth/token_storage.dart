import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kTokenKey = 'farmflow_jwt';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

class TokenStorage {
  final _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );

  Future<void> write(String token) =>
      _storage.write(key: _kTokenKey, value: token);

  Future<String?> read() => _storage.read(key: _kTokenKey);

  Future<void> delete() => _storage.delete(key: _kTokenKey);
}
