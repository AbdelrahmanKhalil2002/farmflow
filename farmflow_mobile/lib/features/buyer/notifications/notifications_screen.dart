import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/l10n/l10n_ext.dart';
import '../../../shared/models/notification_model.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import 'notifications_service.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        title: Text(
          context.l10n.notificationsTitle,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        iconTheme: const IconThemeData(color: AppColors.white),
        elevation: 0,
        actions: [
          if (state.valueOrNull?.any((n) => !n.read) == true)
            TextButton(
              onPressed: () =>
                  ref.read(notificationsProvider.notifier).markAllRead(),
              child: Text(
                context.l10n.markAllRead,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  color: AppColors.white,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
      body: state.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 5, cardHeight: 70),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadNotificationsFailed,
          actionLabel: context.l10n.retry,
          action: () => ref.read(notificationsProvider.notifier).load(),
        ),
        data: (notifications) {
          if (notifications.isEmpty) {
            return EmptyState(
              icon: Icons.notifications_off_outlined,
              title: context.l10n.noNotifications,
              subtitle: context.l10n.noNotificationsSubtitle,
            );
          }
          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async =>
                ref.read(notificationsProvider.notifier).load(),
            child: ListView.separated(
              itemCount: notifications.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, indent: 60),
              itemBuilder: (_, i) => _NotifTile(
                notification: notifications[i],
                onTap: () => ref
                    .read(notificationsProvider.notifier)
                    .markRead(notifications[i].id),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _NotifTile extends StatelessWidget {
  const _NotifTile({required this.notification, required this.onTap});
  final NotificationModel notification;
  final VoidCallback onTap;

  static const _typeIcon = {
    'new_order':        Icons.shopping_bag_outlined,
    'order_confirmed':  Icons.check_circle_outline,
    'order_completed':  Icons.done_all,
    'order_cancelled':  Icons.cancel_outlined,
    'order_in_transit': Icons.local_shipping_outlined,
    'vaccination_due':  Icons.vaccines_outlined,
    'weighing_due':     Icons.monitor_weight_outlined,
    'pregnancy_due':    Icons.baby_changing_station,
    'dairy_expiry':     Icons.local_drink_outlined,
    'medical_followup': Icons.medical_services_outlined,
    'weight_milestone': Icons.emoji_events_outlined,
    'general':          Icons.notifications_outlined,
  };

  @override
  Widget build(BuildContext context) {
    final icon = _typeIcon[notification.type] ?? Icons.notifications_outlined;
    final fmt  = DateFormat('d MMM — h:mm a', 'ar');

    return InkWell(
      onTap: onTap,
      child: Container(
        color: notification.read
            ? Colors.transparent
            : AppColors.greenBg.withValues(alpha: 0.5),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: notification.read ? AppColors.bg : AppColors.greenBg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon,
                  size: 20,
                  color: notification.read ? AppColors.muted : AppColors.green),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    notification.title,
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: notification.read
                          ? FontWeight.w600
                          : FontWeight.w800,
                      color: AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    notification.message,
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        color: AppColors.muted,
                        height: 1.3),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    fmt.format(notification.createdAt),
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 10, color: AppColors.muted),
                  ),
                ],
              ),
            ),
            if (!notification.read)
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4, right: 4),
                decoration: const BoxDecoration(
                  color: AppColors.green,
                  shape: BoxShape.circle,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
