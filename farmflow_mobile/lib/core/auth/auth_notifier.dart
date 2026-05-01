import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_repository.dart';
import '../../shared/models/user_model.dart';

/// The global auth state. `null` means unauthenticated / loading.
final authNotifierProvider =
    AsyncNotifierProvider<AuthNotifier, UserModel?>(AuthNotifier.new);

class AuthNotifier extends AsyncNotifier<UserModel?> {
  @override
  Future<UserModel?> build() async {
    // On app start, try to load the stored JWT and fetch /me
    final repo = ref.read(authRepositoryProvider);
    try {
      return await repo.getMe();
    } catch (_) {
      return null;
    }
  }

  Future<void> login(String identifier, String password) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(authRepositoryProvider);
      return repo.login(identifier, password);
    });
  }

  Future<void> register(Map<String, dynamic> body) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(authRepositoryProvider);
      return repo.register(body);
    });
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  Future<void> refresh() async {
    state = await AsyncValue.guard(() => ref.read(authRepositoryProvider).getMe());
  }

  Future<void> updateUser(UserModel updated) async {
    state = AsyncData(updated);
  }
}
