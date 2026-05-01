import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import 'token_storage.dart';
import '../../shared/models/user_model.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.read(dioProvider), ref.read(tokenStorageProvider));
});

class AuthRepository {
  AuthRepository(this._dio, this._tokenStorage);

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /// Login — returns the saved [User] on success.
  Future<UserModel> login(String identifier, String password) async {
    final res = await _dio.post(ApiEndpoints.login, data: {
      'identifier': identifier,
      'password': password,
    });
    final token = res.data['token'] as String;
    await _tokenStorage.write(token);
    return UserModel.fromJson(res.data['user'] as Map<String, dynamic>);
  }

  /// Register (buyer or seller).
  Future<UserModel> register(Map<String, dynamic> body) async {
    final res = await _dio.post(ApiEndpoints.register, data: body);
    final token = res.data['token'] as String;
    await _tokenStorage.write(token);
    return UserModel.fromJson(res.data['user'] as Map<String, dynamic>);
  }

  /// Fetch authenticated user from /api/auth/me.
  Future<UserModel> getMe() async {
    final res = await _dio.get(ApiEndpoints.me);
    return UserModel.fromJson(res.data as Map<String, dynamic>);
  }

  /// Update profile — accepts plain [Map] or [FormData] for banner upload.
  Future<UserModel> updateProfile(dynamic body) async {
    final res = await _dio.put(
      ApiEndpoints.profile,
      data: body,
      options: body is FormData
          ? Options(contentType: 'multipart/form-data')
          : null,
    );
    return UserModel.fromJson(res.data as Map<String, dynamic>);
  }

  /// Change password.
  Future<void> updatePassword(String current, String next) async {
    await _dio.put(ApiEndpoints.password, data: {
      'currentPassword': current,
      'newPassword': next,
    });
  }

  /// Validate Egyptian National ID.
  Future<Map<String, dynamic>> verifyNationalId(String nationalId) async {
    final res = await _dio.post(ApiEndpoints.verifyId, data: {'nationalId': nationalId});
    return res.data as Map<String, dynamic>;
  }

  Future<void> logout() => _tokenStorage.delete();
}
