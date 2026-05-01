import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../shared/models/notification_model.dart';

class NotificationsNotifier
    extends StateNotifier<AsyncValue<List<NotificationModel>>> {
  NotificationsNotifier(this._ref) : super(const AsyncValue.loading()) {
    load();
  }

  final Ref _ref;

  Future<void> load() async {
    state = const AsyncValue.loading();
    try {
      final dio  = _ref.read(dioProvider);
      final res  = await dio.get(ApiEndpoints.notifications);
      final data = res.data as List? ?? [];
      state = AsyncValue.data(
        data.map((e) => NotificationModel.fromJson(e as Map<String, dynamic>)).toList(),
      );
    } catch (e, s) {
      state = AsyncValue.error(e, s);
    }
  }

  Future<void> markRead(String id) async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.patch(ApiEndpoints.markRead(id));
      state = state.whenData((list) => list
          .map((n) => n.id == id ? n.copyWith(read: true) : n)
          .toList());
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    try {
      final dio = _ref.read(dioProvider);
      await dio.patch(ApiEndpoints.markAllRead);
      state = state.whenData(
        (list) => list.map((n) => n.copyWith(read: true)).toList(),
      );
    } catch (_) {}
  }

  int get unreadCount =>
      state.valueOrNull?.where((n) => !n.read).length ?? 0;
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier,
    AsyncValue<List<NotificationModel>>>((ref) {
  return NotificationsNotifier(ref);
});

final unreadCountProvider = Provider<int>((ref) {
  return ref.watch(notificationsProvider).valueOrNull
          ?.where((n) => !n.read)
          .length ??
      0;
});
