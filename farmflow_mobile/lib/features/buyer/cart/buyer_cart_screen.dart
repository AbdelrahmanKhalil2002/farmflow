import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/primary_button.dart';
import 'cart_provider.dart';

// ── Animal type → emoji mapping ───────────────────────────────────────────────

const _typeEmoji = {
  'cattle':  '🐄',
  'buffalo': '🐃',
  'sheep':   '🐑',
  'goat':    '🐐',
  'camel':   '🐪',
  'horse':   '🐎',
  'poultry': '🐓',
  'rabbit':  '🐇',
  'other':   '🐾',
};

// ── Payment type enum ─────────────────────────────────────────────────────────

enum _PaymentType { cod, instaPay }

extension _PaymentTypeExt on _PaymentType {
  String get label {
    switch (this) {
      case _PaymentType.cod:
        return 'الدفع عند الاستلام';
      case _PaymentType.instaPay:
        return 'InstaPay';
    }
  }

  String get apiValue {
    switch (this) {
      case _PaymentType.cod:
        return 'cod';
      case _PaymentType.instaPay:
        return 'instapay';
    }
  }

  IconData get icon {
    switch (this) {
      case _PaymentType.cod:
        return Icons.payments_outlined;
      case _PaymentType.instaPay:
        return Icons.phone_android_outlined;
    }
  }
}

// ── Screen ────────────────────────────────────────────────────────────────────

class BuyerCartScreen extends ConsumerStatefulWidget {
  const BuyerCartScreen({super.key});

  @override
  ConsumerState<BuyerCartScreen> createState() => _BuyerCartScreenState();
}

class _BuyerCartScreenState extends ConsumerState<BuyerCartScreen> {
  int _step = 0; // 0 = cart, 1 = payment, 2 = success

  // Step 2 state
  _PaymentType _paymentType = _PaymentType.cod;
  final _instaPayRefCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  bool _loading = false;
  int _placedCount = 0;

  @override
  void dispose() {
    _instaPayRefCtrl.dispose();
    _addressCtrl.dispose();
    super.dispose();
  }

  // ── Order placement ───────────────────────────────────────────────────────

  Future<void> _placeOrders() async {
    final items = ref.read(cartProvider);
    if (items.isEmpty) return;

    setState(() => _loading = true);

    try {
      final dio = ref.read(dioProvider);
      final total = ref.read(cartTotalProvider);
      final notes = _addressCtrl.text.trim().isNotEmpty
          ? _addressCtrl.text.trim()
          : null;
      final paymentType = _paymentType.apiValue;

      // Fire a POST /orders for each item independently.
      // Each livestock listing is a unique transaction.
      final futures = items.map(
        (item) => dio.post(
          ApiEndpoints.orders,
          data: {
            'listingId': item.id,
            'paymentType': paymentType,
            'totalAmount': item.price,
            // Overall cart total surfaced as context for the seller.
            'cartTotal': total,
            if (notes != null) 'notes': notes,
            if (_paymentType == _PaymentType.instaPay &&
                _instaPayRefCtrl.text.trim().isNotEmpty)
              'instaPayRef': _instaPayRefCtrl.text.trim(),
          },
        ),
      );

      await Future.wait(futures);

      _placedCount = items.length;
      ref.read(cartProvider.notifier).clearCart();

      if (mounted) setState(() => _step = 2);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'فشل تقديم الطلبات. يرجى المحاولة مجددًا.',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: AppColors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          title: Text(
            _stepTitle,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.w800,
              color: AppColors.white,
            ),
          ),
          // Hide the back button on the success screen.
          automaticallyImplyLeading: _step < 2,
          iconTheme: const IconThemeData(color: AppColors.white),
        ),
        body: Column(
          children: [
            _StepIndicator(currentStep: _step),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: _stepBody,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String get _stepTitle {
    switch (_step) {
      case 0:
        return 'سلة المشتريات';
      case 1:
        return 'طريقة الدفع';
      default:
        return 'تم الطلب';
    }
  }

  Widget get _stepBody {
    switch (_step) {
      case 0:
        return _CartStep(
          key: const ValueKey('cart'),
          onNext: () => setState(() => _step = 1),
        );
      case 1:
        return _PaymentStep(
          key: const ValueKey('payment'),
          paymentType: _paymentType,
          instaPayRefCtrl: _instaPayRefCtrl,
          addressCtrl: _addressCtrl,
          loading: _loading,
          onPaymentChanged: (t) => setState(() => _paymentType = t),
          onConfirm: _placeOrders,
        );
      default:
        return _SuccessStep(
          key: const ValueKey('success'),
          orderCount: _placedCount,
        );
    }
  }
}

// ── Step indicator ────────────────────────────────────────────────────────────

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.currentStep});
  final int currentStep;

  static const _labels = ['السلة', 'الدفع', 'تم'];

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
      child: Row(
        children: List.generate(_labels.length * 2 - 1, (idx) {
          if (idx.isOdd) {
            // Connector
            final stepIdx = (idx - 1) ~/ 2;
            final active = currentStep > stepIdx;
            return Expanded(
              child: Container(
                height: 2,
                color: active ? AppColors.green : AppColors.border,
              ),
            );
          }

          final stepIdx = idx ~/ 2;
          final done = currentStep > stepIdx;
          final current = currentStep == stepIdx;

          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done || current ? AppColors.green : AppColors.bg,
                  border: Border.all(
                    color: done || current ? AppColors.green : AppColors.border,
                    width: current ? 2.5 : 1.5,
                  ),
                ),
                child: Center(
                  child: done
                      ? const Icon(Icons.check,
                          size: 15, color: AppColors.white)
                      : Text(
                          '${stepIdx + 1}',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: current ? AppColors.white : AppColors.muted,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _labels[stepIdx],
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 10,
                  fontWeight:
                      current ? FontWeight.w800 : FontWeight.w500,
                  color: done || current ? AppColors.green : AppColors.muted,
                ),
              ),
            ],
          );
        }),
      ),
    );
  }
}

// ── Step 1: Cart ──────────────────────────────────────────────────────────────

class _CartStep extends ConsumerWidget {
  const _CartStep({super.key, required this.onNext});
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(cartProvider);
    final total = ref.watch(cartTotalProvider);

    if (items.isEmpty) {
      return EmptyState(
        icon: Icons.shopping_cart_outlined,
        title: 'السلة فارغة',
        subtitle: 'أضف مواشي من الصفحة الرئيسية',
        actionLabel: 'تصفح المواشي',
        action: () => context.go('/buyer'),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (_, i) => _CartItemCard(item: items[i]),
          ),
        ),
        _CartFooter(total: total, onNext: onNext),
      ],
    );
  }
}

class _CartItemCard extends ConsumerWidget {
  const _CartItemCard({required this.item});
  final CartItem item;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final emoji = _typeEmoji[item.type] ?? '🐾';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(
              color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          // Thumbnail / emoji fallback
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: item.imageUrl != null
                ? CachedNetworkImage(
                    imageUrl: item.imageUrl!,
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                    errorWidget: (_, __, ___) => _EmojiBox(emoji: emoji),
                  )
                : _EmojiBox(emoji: emoji),
          ),
          const SizedBox(width: 12),
          // Title + price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.price.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: AppColors.green,
                  ),
                ),
              ],
            ),
          ),
          // Remove button
          GestureDetector(
            onTap: () =>
                ref.read(cartProvider.notifier).removeItem(item.id),
            child: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: AppColors.redBg,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close_rounded,
                  size: 16, color: AppColors.red),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmojiBox extends StatelessWidget {
  const _EmojiBox({required this.emoji});
  final String emoji;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: AppColors.greenBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Center(
        child: Text(emoji, style: const TextStyle(fontSize: 28)),
      ),
    );
  }
}

class _CartFooter extends StatelessWidget {
  const _CartFooter({required this.total, required this.onNext});
  final double total;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.border)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'الإجمالي',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                ),
              ),
              Text(
                '${total.toStringAsFixed(0)} ج.م',
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: AppColors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          PrimaryButton(
            label: 'متابعة للدفع',
            onPressed: onNext,
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                size: 16, color: AppColors.white),
          ),
        ],
      ),
    );
  }
}

// ── Step 2: Payment ───────────────────────────────────────────────────────────

class _PaymentStep extends ConsumerWidget {
  const _PaymentStep({
    super.key,
    required this.paymentType,
    required this.instaPayRefCtrl,
    required this.addressCtrl,
    required this.loading,
    required this.onPaymentChanged,
    required this.onConfirm,
  });

  final _PaymentType paymentType;
  final TextEditingController instaPayRefCtrl;
  final TextEditingController addressCtrl;
  final bool loading;
  final ValueChanged<_PaymentType> onPaymentChanged;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final total = ref.watch(cartTotalProvider);
    final count = ref.watch(cartCountProvider);

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Order summary ───────────────────────────────────────────
                _SectionLabel(label: 'ملخص الطلب'),
                const SizedBox(height: 8),
                _SummaryCard(itemCount: count, total: total),
                const SizedBox(height: 20),

                // ── Payment method ──────────────────────────────────────────
                _SectionLabel(label: 'طريقة الدفع'),
                const SizedBox(height: 8),
                ..._PaymentType.values.map(
                  (type) => _PaymentOptionTile(
                    type: type,
                    selected: paymentType == type,
                    onTap: () => onPaymentChanged(type),
                  ),
                ),

                // InstaPay reference field
                if (paymentType == _PaymentType.instaPay) ...[
                  const SizedBox(height: 12),
                  _FieldLabel(label: 'رقم مرجع InstaPay'),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: instaPayRefCtrl,
                    keyboardType: TextInputType.text,
                    textDirection: TextDirection.ltr,
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 14,
                        color: AppColors.text),
                    decoration: const InputDecoration(
                      hintText: 'أدخل رقم المرجع',
                      prefixIcon: Icon(Icons.tag_rounded,
                          color: AppColors.muted, size: 18),
                    ),
                  ),
                ],

                const SizedBox(height: 20),

                // ── Delivery address ────────────────────────────────────────
                _SectionLabel(label: 'عنوان التسليم (اختياري)'),
                const SizedBox(height: 8),
                TextFormField(
                  controller: addressCtrl,
                  maxLines: 3,
                  keyboardType: TextInputType.multiline,
                  style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      color: AppColors.text),
                  decoration: const InputDecoration(
                    hintText: 'ادخل عنوانك أو ملاحظات التسليم...',
                    alignLabelWithHint: true,
                  ),
                ),

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
        // ── Confirm button ──────────────────────────────────────────────────
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
          decoration: const BoxDecoration(
            color: AppColors.white,
            border: Border(top: BorderSide(color: AppColors.border)),
          ),
          child: PrimaryButton(
            label: 'تأكيد الطلب',
            loading: loading,
            onPressed: onConfirm,
            icon: const Icon(Icons.check_circle_outline_rounded,
                size: 18, color: AppColors.white),
          ),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontFamily: 'Cairo',
        fontSize: 14,
        fontWeight: FontWeight.w800,
        color: AppColors.text,
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label,
      style: const TextStyle(
        fontFamily: 'Cairo',
        fontSize: 13,
        fontWeight: FontWeight.w700,
        color: AppColors.text,
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.itemCount, required this.total});
  final int itemCount;
  final double total;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.greenBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.greenBorder),
      ),
      child: Row(
        children: [
          const Icon(Icons.shopping_bag_outlined,
              color: AppColors.green, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$itemCount ${_itemsLabel(itemCount)}',
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: AppColors.greenText,
              ),
            ),
          ),
          Text(
            '${total.toStringAsFixed(0)} ج.م',
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: AppColors.green,
            ),
          ),
        ],
      ),
    );
  }

  String _itemsLabel(int n) {
    if (n == 1) return 'رأس ماشية';
    if (n == 2) return 'رأسان';
    if (n >= 3 && n <= 10) return 'رؤوس';
    return 'رأس';
  }
}

class _PaymentOptionTile extends StatelessWidget {
  const _PaymentOptionTile({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  final _PaymentType type;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: selected ? AppColors.greenLight : AppColors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.green : AppColors.border,
            width: selected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: selected
                    ? AppColors.green.withValues(alpha: 0.12)
                    : AppColors.bg,
                shape: BoxShape.circle,
              ),
              child: Icon(type.icon,
                  color: selected ? AppColors.green : AppColors.muted,
                  size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                type.label,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: selected ? AppColors.green : AppColors.text,
                ),
              ),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: selected ? AppColors.green : AppColors.white,
                border: Border.all(
                  color: selected ? AppColors.green : AppColors.border,
                  width: 2,
                ),
              ),
              child: selected
                  ? const Icon(Icons.check, size: 12, color: AppColors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Step 3: Success ───────────────────────────────────────────────────────────

class _SuccessStep extends ConsumerWidget {
  const _SuccessStep({super.key, required this.orderCount});
  final int orderCount;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final countLabel = _ordersLabel(orderCount);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Green checkmark circle
          Container(
            width: 100,
            height: 100,
            decoration: const BoxDecoration(
              color: AppColors.greenBg,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              size: 60,
              color: AppColors.green,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'تم تقديم طلباتك بنجاح!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'تم إرسال $countLabel إلى البائعين',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 14,
              color: AppColors.muted,
            ),
          ),
          const SizedBox(height: 40),
          // Primary action
          PrimaryButton(
            label: 'عرض طلباتي',
            onPressed: () => context.go('/buyer/orders'),
            icon: const Icon(Icons.receipt_long_outlined,
                size: 18, color: AppColors.white),
          ),
          const SizedBox(height: 12),
          // Secondary action
          SizedBox(
            width: double.infinity,
            height: 52,
            child: OutlinedButton(
              onPressed: () => context.go('/buyer'),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.green),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text(
                'العودة للرئيسية',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.w700,
                  color: AppColors.green,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _ordersLabel(int n) {
    if (n == 1) return 'طلب واحد';
    if (n == 2) return 'طلبان';
    if (n >= 3 && n <= 10) return '$n طلبات';
    return '$n طلبًا';
  }
}
