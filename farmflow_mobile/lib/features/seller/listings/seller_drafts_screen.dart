import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../../../shared/widgets/confirm_dialog.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

/// Fetches the current seller's draft listings (status=draft).
final sellerDraftsProvider = FutureProvider.autoDispose<List<ListingModel>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(
    ApiEndpoints.myListings,
    queryParameters: {'status': 'draft'},
  );
  final data = res.data as List? ?? [];
  return data
      .map((e) => ListingModel.fromJson(e as Map<String, dynamic>))
      .toList();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerDraftsScreen extends ConsumerStatefulWidget {
  const SellerDraftsScreen({super.key});

  @override
  ConsumerState<SellerDraftsScreen> createState() => _SellerDraftsScreenState();
}

class _SellerDraftsScreenState extends ConsumerState<SellerDraftsScreen> {
  /// IDs currently undergoing a network action (publish or delete) — used to
  /// show an inline loading state on the affected card.
  final Set<String> _pendingIds = {};

  void _setPending(String id, bool pending) {
    if (!mounted) return;
    setState(() {
      pending ? _pendingIds.add(id) : _pendingIds.remove(id);
    });
  }

  Future<void> _publish(ListingModel draft) async {
    _setPending(draft.id, true);
    try {
      await ref.read(dioProvider).patch(ApiEndpoints.publishListing(draft.id));
      if (mounted) {
        ref.invalidate(sellerDraftsProvider);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'تم نشر الإعلان بنجاح',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.green,
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      // Error snackbar is handled globally by dioProvider interceptor.
    } finally {
      _setPending(draft.id, false);
    }
  }

  Future<void> _delete(ListingModel draft) async {
    final confirmed = await showConfirmDialog(
      context,
      title: 'حذف المسودة',
      message: 'هل أنت متأكد من حذف هذه المسودة؟ لا يمكن التراجع عن هذا الإجراء.',
      confirmLabel: 'حذف',
      dangerous: true,
    );
    if (!confirmed || !mounted) return;

    _setPending(draft.id, true);
    try {
      await ref.read(dioProvider).delete(ApiEndpoints.listingById(draft.id));
      if (mounted) {
        ref.invalidate(sellerDraftsProvider);
      }
    } catch (_) {
      // Error snackbar is handled globally by dioProvider interceptor.
    } finally {
      _setPending(draft.id, false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final asyncDrafts = ref.watch(sellerDraftsProvider);

    return Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          centerTitle: true,
          title: const Text(
            'المسودات',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white,
              fontSize: 18,
            ),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded, color: AppColors.white),
              tooltip: 'تحديث',
              onPressed: () => ref.invalidate(sellerDraftsProvider),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton.extended(
          backgroundColor: AppColors.green,
          onPressed: () => context.push('/seller/listings/add'),
          icon: const Icon(Icons.add, color: AppColors.white),
          label: const Text(
            'إعلان جديد',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w700,
              color: AppColors.white,
            ),
          ),
        ),
        body: asyncDrafts.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 4, cardHeight: 130),
          ),
          error: (e, _) => EmptyState(
            icon: Icons.wifi_off_rounded,
            title: 'تعذّر تحميل المسودات',
            subtitle: 'تحقق من الاتصال بالإنترنت وحاول مجدداً',
            actionLabel: 'إعادة المحاولة',
            action: () => ref.invalidate(sellerDraftsProvider),
          ),
          data: (drafts) {
            if (drafts.isEmpty) {
              return EmptyState(
                icon: Icons.edit_note_rounded,
                title: 'لا توجد مسودات',
                subtitle: 'أنشئ إعلانًا جديدًا لحفظه كمسودة',
                actionLabel: 'إعلان جديد',
                action: () => context.push('/seller/listings/add'),
              );
            }

            return RefreshIndicator(
              color: AppColors.green,
              onRefresh: () async => ref.invalidate(sellerDraftsProvider),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                itemCount: drafts.length,
                itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _DraftCard(
                    draft: drafts[i],
                    isPending: _pendingIds.contains(drafts[i].id),
                    onEdit: () => context.push(
                      '/seller/listings/${drafts[i].id}/edit',
                      extra: drafts[i],
                    ),
                    onPublish: () => _publish(drafts[i]),
                    onDelete: () => _delete(drafts[i]),
                  ),
                ),
              ),
            );
          },
        ),
      );
  }
}

// ── Draft card ────────────────────────────────────────────────────────────────

class _DraftCard extends StatelessWidget {
  const _DraftCard({
    required this.draft,
    required this.isPending,
    required this.onEdit,
    required this.onPublish,
    required this.onDelete,
  });

  final ListingModel draft;
  final bool isPending;
  final VoidCallback onEdit;
  final VoidCallback onPublish;
  final VoidCallback onDelete;

  static const _emojis = <String, String>{
    'cattle':  '🐄',
    'buffalo': '🐃',
    'sheep':   '🐑',
    'goat':    '🐐',
    'camel':   '🐪',
    'horse':   '🐎',
    'poultry': '🐔',
    'rabbit':  '🐇',
  };

  String get _emoji => _emojis[draft.type] ?? '🐾';

  String _formatDateAr(DateTime dt) {
    try {
      return DateFormat('d MMM yyyy', 'ar').format(dt);
    } catch (_) {
      return DateFormat('d MMM yyyy').format(dt);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = draft.images.isNotEmpty;

    return AnimatedOpacity(
      opacity: isPending ? 0.55 : 1.0,
      duration: const Duration(milliseconds: 200),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE5E5DC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0A000000),
              blurRadius: 6,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Stack(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Top row: thumbnail + info ──────────────────────────────
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Thumbnail / emoji placeholder
                    ClipRRect(
                      borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(13),
                        bottomRight: Radius.circular(4),
                      ),
                      child: SizedBox(
                        width: 88,
                        height: 88,
                        child: hasImage
                            ? Image.network(
                                imageUrl(draft.images.first),
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) =>
                                    _EmojiPlaceholder(emoji: _emoji),
                              )
                            : _EmojiPlaceholder(emoji: _emoji),
                      ),
                    ),
                    // Info block
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 8),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Type / breed + badge row
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Expanded(
                                  child: Text(
                                    _titleText(),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontFamily: 'Cairo',
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: Color(0xFF1A2E1A),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                _DraftBadge(),
                              ],
                            ),
                            const SizedBox(height: 4),
                            // Weight & age
                            if (draft.weight > 0 || draft.age > 0)
                              Text(
                                _metaText(),
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 12,
                                  color: Color(0xFF9CA3AF),
                                ),
                              ),
                            const SizedBox(height: 4),
                            // Price (if set)
                            if (draft.price > 0)
                              Text(
                                '${NumberFormat('#,##0', 'ar').format(draft.price)} ج.م',
                                style: const TextStyle(
                                  fontFamily: 'Cairo',
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.green,
                                ),
                              ),
                            const SizedBox(height: 4),
                            // Created date
                            Row(
                              children: [
                                const Icon(
                                  Icons.calendar_today_outlined,
                                  size: 11,
                                  color: Color(0xFF9CA3AF),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDateAr(draft.createdAt),
                                  style: const TextStyle(
                                    fontFamily: 'Cairo',
                                    fontSize: 11,
                                    color: Color(0xFF9CA3AF),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                // ── Divider ────────────────────────────────────────────────
                const Divider(height: 1, color: Color(0xFFE5E5DC)),

                // ── Action buttons row ─────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
                  child: Row(
                    children: [
                      // تعديل
                      _ActionButton(
                        label: 'تعديل',
                        icon: Icons.edit_outlined,
                        color: const Color(0xFF1A2E1A),
                        borderColor: const Color(0xFFE5E5DC),
                        backgroundColor: AppColors.white,
                        onPressed: isPending ? null : onEdit,
                      ),
                      const SizedBox(width: 8),
                      // نشر
                      _ActionButton(
                        label: 'نشر',
                        icon: Icons.publish_rounded,
                        color: AppColors.white,
                        backgroundColor: AppColors.green,
                        borderColor: AppColors.green,
                        onPressed: isPending ? null : onPublish,
                      ),
                      const Spacer(),
                      // حذف
                      _ActionButton(
                        label: 'حذف',
                        icon: Icons.delete_outline_rounded,
                        color: AppColors.red,
                        borderColor: AppColors.red,
                        backgroundColor: AppColors.white,
                        onPressed: isPending ? null : onDelete,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Pending overlay spinner
            if (isPending)
              Positioned.fill(
                child: Container(
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: AppColors.green,
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  /// Returns a descriptive title: "نوع — سلالة" or "مسودة — بدون نوع".
  String _titleText() {
    final typeAr = draft.typeAr;
    if (draft.type == 'other' && draft.breed == null) {
      return 'مسودة — بدون نوع';
    }
    if (draft.breed != null && draft.breed!.isNotEmpty) {
      return '$typeAr — ${draft.breed}';
    }
    return typeAr;
  }

  String _metaText() {
    final parts = <String>[];
    if (draft.weight > 0) parts.add('${draft.weight.toStringAsFixed(0)} كجم');
    if (draft.age > 0) parts.add(draft.ageText);
    return parts.join('  •  ');
  }
}

// ── Supporting widgets ────────────────────────────────────────────────────────

class _DraftBadge extends StatelessWidget {
  const _DraftBadge();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7ED),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFFED7AA)),
      ),
      child: const Text(
        'مسودة',
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: Color(0xFFEA580C),
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.backgroundColor,
    required this.borderColor,
    this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color color;
  final Color backgroundColor;
  final Color borderColor;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 15, color: color),
      label: Text(
        label,
        style: TextStyle(
          fontFamily: 'Cairo',
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: color,
        ),
      ),
      style: OutlinedButton.styleFrom(
        backgroundColor: backgroundColor,
        side: BorderSide(color: borderColor),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}

class _EmojiPlaceholder extends StatelessWidget {
  const _EmojiPlaceholder({required this.emoji});
  final String emoji;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.greenBg,
      child: Center(
        child: Text(emoji, style: const TextStyle(fontSize: 34)),
      ),
    );
  }
}
