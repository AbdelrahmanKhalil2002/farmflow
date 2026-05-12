import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

/// Fetches all orders for the authenticated seller.
final sellerOrdersProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res = await dio.get(ApiEndpoints.orders);
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Status update helper ──────────────────────────────────────────────────────

Future<void> updateOrderStatus(
  Dio dio,
  String orderId,
  String status,
) async {
  await dio.patch(
    ApiEndpoints.orderStatus(orderId),
    data: {'status': status},
  );
}

// ── Phone helpers ─────────────────────────────────────────────────────────────

String _normalizePhone(String phone) {
  final digits = phone.replaceAll(RegExp(r'\D'), '');
  if (digits.startsWith('20')) return digits;
  if (digits.startsWith('0')) return '20${digits.substring(1)}';
  return '20$digits';
}

Future<void> _launchCall(BuildContext ctx, String phone) async {
  final uri = Uri.parse('tel:$phone');
  final ok = await launchUrl(uri);
  if (!ok && ctx.mounted) {
    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
      content: Text('تعذّر إجراء الاتصال', style: TextStyle(fontFamily: 'Cairo')),
    ));
  }
}

Future<void> _launchWhatsApp(BuildContext ctx, String phone) async {
  final uri = Uri.parse('https://wa.me/${_normalizePhone(phone)}');
  final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!ok && ctx.mounted) {
    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
      content: Text('واتساب غير مثبّت', style: TextStyle(fontFamily: 'Cairo')),
    ));
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const _statusColors = <String, Color>{
  'pending':   AppColors.amber,
  'confirmed': AppColors.blue,
  'completed': AppColors.green,
  'cancelled': AppColors.red,
};

const _statusAr = <String, String>{
  'pending':   'معلقة',
  'confirmed': 'مؤكدة',
  'completed': 'مكتملة',
  'cancelled': 'ملغية',
};

const _paymentAr = <String, String>{
  'deposit':  'عربون',
  'cod':      'كاش عند الاستلام',
  'instapay': 'InstaPay',
};

const _typeEmoji = <String, String>{
  'cattle':  '🐄',
  'buffalo': '🐃',
  'sheep':   '🐑',
  'goat':    '🐐',
  'camel':   '🐪',
  'horse':   '🐴',
  'poultry': '🐓',
  'rabbit':  '🐇',
  'other':   '🐾',
};

const _tabs = <(String, String)>[
  ('all',       'الكل'),
  ('pending',   'معلقة'),
  ('confirmed', 'مؤكدة'),
  ('completed', 'مكتملة'),
  ('cancelled', 'ملغية'),
];

// ── Screen ────────────────────────────────────────────────────────────────────

class SellerOrdersScreen extends ConsumerStatefulWidget {
  const SellerOrdersScreen({super.key});

  @override
  ConsumerState<SellerOrdersScreen> createState() => _SellerOrdersScreenState();
}

class _SellerOrdersScreenState extends ConsumerState<SellerOrdersScreen> {
  String _activeTab = 'all';

  @override
  Widget build(BuildContext context) {
    final asyncOrders = ref.watch(sellerOrdersProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text(
          'طلباتي',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            color: AppColors.white,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(46),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: Row(
              children: _tabs.map((tab) {
                final selected = _activeTab == tab.$1;
                return GestureDetector(
                  onTap: () => setState(() => _activeTab = tab.$1),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    margin: const EdgeInsets.only(left: 6),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected
                          ? AppColors.white
                          : AppColors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      tab.$2,
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: selected ? AppColors.green : AppColors.white,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ),
      body: asyncOrders.when(
        loading: () => const Padding(
          padding: EdgeInsets.all(16),
          child: ShimmerList(count: 5, cardHeight: 160),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'فشل تحميل الطلبات',
          subtitle: e.toString(),
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(sellerOrdersProvider),
        ),
        data: (orders) {
          final filtered = _activeTab == 'all'
              ? orders
              : orders
                  .where((o) => (o['status'] as String?) == _activeTab)
                  .toList();

          // Summary stats
          final totalCount     = orders.length;
          final pendingCount   = orders.where((o) => o['status'] == 'pending').length;
          final completedCount = orders.where((o) => o['status'] == 'completed').length;
          final totalRevenue   = orders.fold<double>(
            0,
            (acc, o) => acc + ((o['totalAmount'] as num?)?.toDouble() ?? 0),
          );
          final fmt = NumberFormat('#,##0', 'ar');

          return Column(
            children: [
              // ── Summary strip ────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
                child: Row(children: [
                  _SummaryChip(
                    label: 'إجمالي',
                    value: '$totalCount',
                    color: AppColors.blue,
                  ),
                  const SizedBox(width: 6),
                  _SummaryChip(
                    label: 'معلقة',
                    value: '$pendingCount',
                    color: AppColors.amber,
                  ),
                  const SizedBox(width: 6),
                  _SummaryChip(
                    label: 'مكتملة',
                    value: '$completedCount',
                    color: AppColors.green,
                  ),
                  const SizedBox(width: 6),
                  _SummaryChip(
                    label: 'الإيراد',
                    value: '${fmt.format(totalRevenue)} ج',
                    color: AppColors.greenDark,
                  ),
                ]),
              ),

              // ── Orders list ──────────────────────────────────────────
              Expanded(
                child: filtered.isEmpty
                    ? const EmptyState(
                        icon: Icons.receipt_long_outlined,
                        title: 'لا توجد طلبات',
                        subtitle: 'لم يصلك أي طلب في هذه الفئة بعد',
                      )
                    : RefreshIndicator(
                        color: AppColors.green,
                        onRefresh: () async =>
                            ref.invalidate(sellerOrdersProvider),
                        child: ListView.separated(
                          padding: const EdgeInsets.all(12),
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (_, i) => _SellerOrderCard(
                            order: filtered[i],
                            onRefresh: () =>
                                ref.invalidate(sellerOrdersProvider),
                          ),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ── Order card ────────────────────────────────────────────────────────────────

class _SellerOrderCard extends ConsumerStatefulWidget {
  const _SellerOrderCard({
    required this.order,
    required this.onRefresh,
  });

  final Map<String, dynamic> order;
  final VoidCallback onRefresh;

  @override
  ConsumerState<_SellerOrderCard> createState() => _SellerOrderCardState();
}

class _SellerOrderCardState extends ConsumerState<_SellerOrderCard> {
  bool _loading  = false;
  bool _expanded = false;

  Map<String, dynamic> get _o => widget.order;

  String get _orderId      => _o['_id'] as String? ?? '';
  String get _status       => _o['status'] as String? ?? 'pending';
  double get _totalAmount  =>
      (_o['totalAmount'] as num?)?.toDouble() ?? 0;
  String get _paymentType  => _o['paymentType'] as String? ?? '';
  String get _createdAt    => _o['createdAt'] as String? ?? '';

  Map<String, dynamic> get _buyer =>
      (_o['buyer'] is Map<String, dynamic>
          ? _o['buyer'] as Map<String, dynamic>
          : <String, dynamic>{});

  Map<String, dynamic> get _listing =>
      (_o['listing'] is Map<String, dynamic>
          ? _o['listing'] as Map<String, dynamic>
          : <String, dynamic>{});

  String get _buyerName =>
      _buyer['name'] as String? ??
      _buyer['farmName'] as String? ??
      '—';

  String get _buyerPhone =>
      _buyer['phone'] as String? ??
      _buyer['personalPhone'] as String? ??
      '';

  String get _listingType  => _listing['type']  as String? ?? 'other';
  String get _listingBreed => _listing['breed'] as String? ?? '';
  List<String> get _images =>
      (_listing['images'] as List?)?.map((e) => e.toString()).toList() ??
      const [];

  String get _emoji => _typeEmoji[_listingType] ?? '🐾';

  Color get _statusColor => _statusColors[_status] ?? AppColors.muted;
  String get _statusLabel => _statusAr[_status] ?? _status;

  Future<void> _changeStatus(String newStatus) async {
    final actionLabel = switch (newStatus) {
      'confirmed' => 'تأكيد الطلب',
      'completed' => 'تأكيد التسليم',
      'cancelled' => 'إلغاء الطلب',
      _           => 'تغيير الحالة',
    };
    final message = switch (newStatus) {
      'confirmed' => 'هل تريد تأكيد هذا الطلب؟',
      'completed' => 'هل تريد تأكيد التسليم وإتمام الطلب؟',
      'cancelled' => 'هل تريد إلغاء هذا الطلب؟ لا يمكن التراجع.',
      _           => 'هل تريد تغيير حالة الطلب؟',
    };
    final isDangerous = newStatus == 'cancelled';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16)),
        title: Text(
          actionLabel,
          textAlign: TextAlign.right,
          style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.text),
        ),
        content: Text(
          message,
          textAlign: TextAlign.right,
          style: const TextStyle(
              fontFamily: 'Cairo', fontSize: 14, color: AppColors.muted),
        ),
        actionsAlignment: MainAxisAlignment.start,
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'تراجع',
              style: TextStyle(fontFamily: 'Cairo', color: AppColors.muted),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  isDangerous ? AppColors.red : AppColors.green,
              foregroundColor: AppColors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: Text(
              actionLabel,
              style: const TextStyle(
                  fontFamily: 'Cairo', fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await updateOrderStatus(dio, _orderId, newStatus);
      widget.onRefresh();
    } on DioException catch (e) {
      if (mounted) {
        final msg = (e.response?.data is Map)
            ? (e.response!.data['message'] as String? ?? 'حدث خطأ')
            : 'حدث خطأ';
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(msg,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
        setState(() => _loading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat('#,##0', 'ar');
    final canConfirm   = _status == 'pending';
    final canComplete  = _status == 'confirmed';
    final canCancel    = _status == 'pending' || _status == 'confirmed';
    final showActions  = canConfirm || canComplete || canCancel;

    final deliveryLoc =
        _o['deliveryLocation'] is Map<String, dynamic>
            ? _o['deliveryLocation'] as Map<String, dynamic>
            : null;
    final deliveryAddress = deliveryLoc?['address'] as String?;
    final deliveryCost    =
        (_o['deliveryCost'] as num?)?.toDouble() ?? 0;
    final deliveryStatus  = _o['deliveryStatus'] as String? ?? 'pending';

    DateTime? createdDate;
    try {
      if (_createdAt.isNotEmpty) {
        createdDate = DateTime.parse(_createdAt);
      }
    } catch (_) {}

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
              color: Color(0x08000000),
              blurRadius: 8,
              offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Main row ────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Animal image / emoji fallback
                _AnimalImage(
                  images: _images,
                  emoji: _emoji,
                  statusColor: _statusColor,
                ),
                const SizedBox(width: 12),

                // Order details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              _listingBreed.isNotEmpty
                                  ? _listingBreed
                                  : (_typeEmoji[_listingType] != null
                                      ? '${_typeEmoji[_listingType]} $_listingType'
                                      : _listingType),
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: AppColors.text,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _StatusBadge(
                              status: _status,
                              label: _statusLabel,
                              color: _statusColor),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // Buyer name
                      Row(children: [
                        const Icon(Icons.person_outline,
                            size: 13, color: AppColors.muted),
                        const SizedBox(width: 4),
                        Text(
                          _buyerName,
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            color: AppColors.muted,
                          ),
                        ),
                      ]),
                      const SizedBox(height: 3),

                      // Amount + payment
                      Row(children: [
                        Text(
                          '${fmt.format(_totalAmount)} ج.م',
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.greenBg,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            _paymentAr[_paymentType] ?? _paymentType,
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: AppColors.greenText,
                            ),
                          ),
                        ),
                      ]),
                      const SizedBox(height: 3),

                      // Date
                      if (createdDate != null)
                        Text(
                          DateFormat('d MMM yyyy', 'ar').format(createdDate),
                          style: const TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 11,
                            color: AppColors.muted,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // ── Contact buttons ──────────────────────────────────────────
          if (_buyerPhone.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: Row(children: [
                Expanded(
                  child: _ContactBtn(
                    label: 'اتصال',
                    icon: Icons.phone_outlined,
                    color: AppColors.blue,
                    onTap: () {
                      HapticFeedback.lightImpact();
                      _launchCall(context, _buyerPhone);
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _ContactBtn(
                    label: 'واتساب',
                    icon: Icons.chat_outlined,
                    color: const Color(0xFF25D366),
                    onTap: () {
                      HapticFeedback.lightImpact();
                      _launchWhatsApp(context, _buyerPhone);
                    },
                  ),
                ),
              ]),
            ),

          // ── Delivery expand toggle ────────────────────────────────────
          GestureDetector(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Container(
              margin: const EdgeInsets.fromLTRB(14, 0, 14, 0),
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.bg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(children: [
                const Icon(Icons.local_shipping_outlined,
                    size: 14, color: AppColors.muted),
                const SizedBox(width: 6),
                const Text(
                  'تفاصيل التوصيل',
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text,
                  ),
                ),
                const Spacer(),
                Icon(
                  _expanded ? Icons.expand_less : Icons.expand_more,
                  size: 16,
                  color: AppColors.muted,
                ),
              ]),
            ),
          ),

          // ── Delivery details (expanded) ───────────────────────────────
          if (_expanded) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 0),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (deliveryAddress != null &&
                        deliveryAddress.isNotEmpty)
                      _DeliveryRow(
                        icon: Icons.location_on_outlined,
                        label: 'العنوان',
                        value: deliveryAddress,
                      ),
                    if (deliveryCost > 0)
                      _DeliveryRow(
                        icon: Icons.payments_outlined,
                        label: 'تكلفة التوصيل',
                        value: '${fmt.format(deliveryCost)} ج.م',
                      ),
                    _DeliveryRow(
                      icon: Icons.sync_outlined,
                      label: 'حالة الشحن',
                      value: switch (deliveryStatus) {
                        'in_transit' => 'في الطريق',
                        'delivered'  => 'تم التسليم',
                        _            => 'لم يُشحن بعد',
                      },
                    ),
                    if (_o['notes'] is String &&
                        (_o['notes'] as String).isNotEmpty)
                      _DeliveryRow(
                        icon: Icons.notes_outlined,
                        label: 'ملاحظات',
                        value: _o['notes'] as String,
                      ),
                  ],
                ),
              ),
            ),
          ],

          const SizedBox(height: 10),

          // ── Action buttons ────────────────────────────────────────────
          if (showActions)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Row(children: [
                if (canConfirm) ...[
                  Expanded(
                    child: _ActionButton(
                      label: 'تأكيد الطلب',
                      color: AppColors.green,
                      loading: _loading,
                      onTap: () => _changeStatus('confirmed'),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                if (canComplete) ...[
                  Expanded(
                    child: _ActionButton(
                      label: 'تأكيد التسليم',
                      color: AppColors.green,
                      loading: _loading,
                      onTap: () => _changeStatus('completed'),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                if (canCancel)
                  Expanded(
                    child: _ActionButton(
                      label: 'إلغاء',
                      color: AppColors.red,
                      outlined: true,
                      loading: _loading,
                      onTap: () => _changeStatus('cancelled'),
                    ),
                  ),
              ]),
            )
          else
            const SizedBox(height: 4),
        ],
      ),
    );
  }
}

// ── Animal image widget ───────────────────────────────────────────────────────

class _AnimalImage extends StatelessWidget {
  const _AnimalImage({
    required this.images,
    required this.emoji,
    required this.statusColor,
  });

  final List<String> images;
  final String       emoji;
  final Color        statusColor;

  @override
  Widget build(BuildContext context) {
    final url = images.isNotEmpty ? imageUrl(images.first) : '';

    if (url.isNotEmpty) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: url,
          width: 72,
          height: 72,
          fit: BoxFit.cover,
          placeholder: (_, __) => Container(
            width: 72,
            height: 72,
            color: AppColors.grey100,
            child: const Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: AppColors.green),
              ),
            ),
          ),
          errorWidget: (_, __, ___) => _EmojiBox(
              emoji: emoji, color: statusColor),
        ),
      );
    }

    return _EmojiBox(emoji: emoji, color: statusColor);
  }
}

class _EmojiBox extends StatelessWidget {
  const _EmojiBox({required this.emoji, required this.color});
  final String emoji;
  final Color  color;

  @override
  Widget build(BuildContext context) => Container(
    width: 72,
    height: 72,
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: color.withValues(alpha: 0.25)),
    ),
    child: Center(
      child: Text(emoji, style: const TextStyle(fontSize: 32)),
    ),
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.status,
    required this.label,
    required this.color,
  });
  final String status;
  final String label;
  final Color  color;

  @override
  Widget build(BuildContext context) => Container(
    padding:
        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(
      label,
      style: TextStyle(
        fontFamily: 'Cairo',
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: color,
      ),
    ),
  );
}

// ── Delivery info row ─────────────────────────────────────────────────────────

class _DeliveryRow extends StatelessWidget {
  const _DeliveryRow({
    required this.icon,
    required this.label,
    required this.value,
  });
  final IconData icon;
  final String   label;
  final String   value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 14, color: AppColors.muted),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(
              fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.text,
            ),
          ),
        ),
      ],
    ),
  );
}

// ── Contact button ────────────────────────────────────────────────────────────

class _ContactBtn extends StatelessWidget {
  const _ContactBtn({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });
  final String       label;
  final IconData     icon;
  final Color        color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 9),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, size: 15, color: color),
        const SizedBox(width: 5),
        Text(
          label,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ]),
    ),
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.color,
    required this.loading,
    required this.onTap,
    this.outlined = false,
  });
  final String       label;
  final Color        color;
  final bool         loading;
  final bool         outlined;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: loading ? null : onTap,
    child: AnimatedOpacity(
      duration: const Duration(milliseconds: 150),
      opacity: loading ? 0.6 : 1.0,
      child: Container(
        padding:
            const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: outlined
              ? Colors.transparent
              : color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.5)),
        ),
        child: Center(
          child: loading
              ? SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                      color: color, strokeWidth: 2),
                )
              : Text(
                  label,
                  style: TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
        ),
      ),
    ),
  );
}

// ── Summary chip ──────────────────────────────────────────────────────────────

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({
    required this.label,
    required this.value,
    required this.color,
  });
  final String label;
  final String value;
  final Color  color;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding:
          const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(
          value,
          style: TextStyle(
            fontFamily: 'Cairo',
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontFamily: 'Cairo',
            fontSize: 9,
            color: AppColors.muted,
          ),
          textAlign: TextAlign.center,
        ),
      ]),
    ),
  );
}
