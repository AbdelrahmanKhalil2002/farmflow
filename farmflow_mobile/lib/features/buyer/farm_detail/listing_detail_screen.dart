import 'package:cached_network_image/cached_network_image.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter/services.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/api/image_helper.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/models/listing_model.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/shimmer_widget.dart';
import '../orders/orders_service.dart';

// ── Provider: fetch a single listing ─────────────────────────────────────────
final _listingProvider =
    FutureProvider.family<ListingModel, String>((ref, id) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.listingById(id));
  return ListingModel.fromJson(res.data as Map<String, dynamic>);
});

class ListingDetailScreen extends ConsumerWidget {
  const ListingDetailScreen({super.key, required this.listingId});
  final String listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final asyncListing = ref.watch(_listingProvider(listingId));

    return asyncListing.when(
      loading: () => Scaffold(
        appBar: AppBar(backgroundColor: AppColors.green),
        body: const Center(child: CircularProgressIndicator(color: AppColors.green)),
      ),
      error: (e, _) => Scaffold(
        appBar: AppBar(
          backgroundColor: AppColors.green,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios, color: AppColors.white),
            onPressed: () => context.pop(),
          ),
        ),
        body: Center(
          child: Text('تعذّر التحميل: $e',
              style: const TextStyle(fontFamily: 'Cairo', color: AppColors.muted)),
        ),
      ),
      data: (listing) => _ListingDetailView(listing: listing),
    );
  }
}

class _ListingDetailView extends ConsumerWidget {
  const _ListingDetailView({required this.listing});
  final ListingModel listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: CustomScrollView(
        slivers: [
          // Hero image
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: AppColors.green,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios, color: AppColors.white),
              onPressed: () => context.pop(),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: listing.images.isNotEmpty
                  ? _ImageGallery(images: listing.images)
                  : _ListingImageFallback(type: listing.type),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type + Eid badge
                  Row(
                    children: [
                      _Chip(
                        label: listing.typeAr,
                        bg: AppColors.greenBg,
                        fg: AppColors.greenText,
                      ),
                      if (listing.breed != null) ...[
                        const SizedBox(width: 8),
                        _Chip(
                          label: listing.breed!,
                          bg: const Color(0xFFEFF6FF),
                          fg: const Color(0xFF1D4ED8),
                        ),
                      ],
                      if (listing.eidAvailable) ...[
                        const SizedBox(width: 8),
                        const _Chip(
                          label: '🌙 متاح للعيد',
                          bg: Color(0xFFFEF3C7),
                          fg: Color(0xFFD97706),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Price
                  Row(
                    children: [
                      Text(
                        '${listing.price.toStringAsFixed(0)} ج.م',
                        style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: AppColors.green,
                        ),
                      ),
                      if (listing.pricePerKg != null) ...[
                        const SizedBox(width: 8),
                        Text(
                          '(${listing.pricePerKg!.toStringAsFixed(0)} ج.م / كجم)',
                          style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 13,
                              color: AppColors.muted),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Specs card
                  _SpecsCard(listing: listing),
                  const SizedBox(height: 12),
                  // Delivery card
                  _DeliveryCard(listing: listing),
                  if (listing.description != null) ...[
                    const SizedBox(height: 12),
                    _DescriptionCard(text: listing.description!),
                  ],
                  // Slaughter service
                  if (listing.slaughterService) ...[
                    const SizedBox(height: 12),
                    _SlaughterCard(cost: listing.slaughterCost),
                  ],
                  // Seller contact card
                  const SizedBox(height: 12),
                  _SellerCard(listing: listing),
                  const SizedBox(height: 80), // bottom padding for FAB
                ],
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: _OrderBar(listing: listing),
    );
  }
}

// ── Image gallery (page view) ────────────────────────────────────────────────
class _ImageGallery extends StatefulWidget {
  const _ImageGallery({required this.images});
  final List<String> images;

  @override
  State<_ImageGallery> createState() => _ImageGalleryState();
}

class _ImageGalleryState extends State<_ImageGallery> {
  int _current = 0;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        PageView.builder(
          itemCount: widget.images.length,
          onPageChanged: (i) => setState(() => _current = i),
          itemBuilder: (_, i) => CachedNetworkImage(
            imageUrl: imageUrl(widget.images[i]),
            fit: BoxFit.cover,
            placeholder: (_, __) => const ShimmerFill(),
            errorWidget: (_, __, ___) =>
                const Center(child: Icon(Icons.broken_image, color: AppColors.muted)),
          ),
        ),
        if (widget.images.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                widget.images.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: _current == i ? 20 : 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: _current == i
                        ? AppColors.white
                        : AppColors.white.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _ListingImageFallback extends StatelessWidget {
  const _ListingImageFallback({required this.type});
  final String type;
  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };
  @override
  Widget build(BuildContext context) => Container(
    color: AppColors.greenBg,
    child: Center(child: Text(_emojis[type] ?? '🐾', style: const TextStyle(fontSize: 72))),
  );
}

// ── Specs card ────────────────────────────────────────────────────────────────
class _SpecsCard extends StatelessWidget {
  const _SpecsCard({required this.listing});
  final ListingModel listing;

  @override
  Widget build(BuildContext context) {
    return _Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionTitle(title: 'المواصفات'),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _SpecRow(icon: Icons.monitor_weight_outlined, label: 'الوزن', value: '${listing.weight} كجم')),
              Expanded(child: _SpecRow(icon: Icons.cake_outlined, label: 'العمر', value: listing.ageText)),
            ],
          ),
          if (listing.location != null)
            _SpecRow(icon: Icons.location_on_outlined, label: 'الموقع', value: listing.location!),
        ],
      ),
    );
  }
}

class _SpecRow extends StatelessWidget {
  const _SpecRow({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(
      children: [
        Icon(icon, size: 16, color: AppColors.green),
        const SizedBox(width: 6),
        Text('$label: ', style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
        Flexible(child: Text(value, style: const TextStyle(fontFamily: 'Cairo', fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.text))),
      ],
    ),
  );
}

// ── Delivery card ─────────────────────────────────────────────────────────────
class _DeliveryCard extends StatelessWidget {
  const _DeliveryCard({required this.listing});
  final ListingModel listing;

  static const _deliveryAr = {
    'none':  'الاستلام من المزرعة فقط',
    'farm':  'توصيل عبر المزرعة',
    'admin': 'توصيل عبر FarmFlow',
  };

  @override
  Widget build(BuildContext context) {
    final label = _deliveryAr[listing.deliveryType] ?? listing.deliveryType;
    return _Card(
      child: Row(
        children: [
          Icon(
            listing.deliveryType == 'none'
                ? Icons.store_outlined
                : Icons.local_shipping_outlined,
            color: AppColors.green,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: AppColors.text)),
                if (listing.deliveryCost != null && listing.deliveryType != 'none')
                  Text('تكلفة التوصيل: ${listing.deliveryCost!.toStringAsFixed(0)} ج.م',
                      style: const TextStyle(
                          fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Description card ──────────────────────────────────────────────────────────
class _DescriptionCard extends StatelessWidget {
  const _DescriptionCard({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) => _Card(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(title: 'وصف الإعلان'),
        const SizedBox(height: 8),
        Text(text,
            style: const TextStyle(
                fontFamily: 'Cairo', fontSize: 13, color: AppColors.text, height: 1.5)),
      ],
    ),
  );
}

// ── Slaughter card ────────────────────────────────────────────────────────────
class _SlaughterCard extends StatelessWidget {
  const _SlaughterCard({required this.cost});
  final double? cost;

  @override
  Widget build(BuildContext context) => _Card(
    child: Row(
      children: [
        const Text('🔪', style: TextStyle(fontSize: 20)),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('خدمة الذبح متاحة',
                  style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: AppColors.text)),
              if (cost != null)
                Text('تكلفة الذبح: ${cost!.toStringAsFixed(0)} ج.م',
                    style: const TextStyle(
                        fontFamily: 'Cairo', fontSize: 12, color: AppColors.muted)),
            ],
          ),
        ),
      ],
    ),
  );
}

// ── Order bar ─────────────────────────────────────────────────────────────────
class _OrderBar extends StatelessWidget {
  const _OrderBar({required this.listing});
  final ListingModel listing;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          border: const Border(top: BorderSide(color: AppColors.border)),
        ),
        child: PrimaryButton(
          label: 'اطلب الآن',
          onPressed: () => _showOrderModal(context, listing),
        ),
      ),
    );
  }
}

void _showOrderModal(BuildContext context, ListingModel listing) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => _OrderModal(listing: listing),
  );
}

// ── Order modal ───────────────────────────────────────────────────────────────
class _OrderModal extends ConsumerStatefulWidget {
  const _OrderModal({required this.listing});
  final ListingModel listing;

  @override
  ConsumerState<_OrderModal> createState() => _OrderModalState();
}

class _OrderModalState extends ConsumerState<_OrderModal> {
  String _paymentType = 'cod';
  final _notesCtrl = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  double get _total {
    var t = widget.listing.price;
    if (widget.listing.deliveryType != 'none' &&
        widget.listing.deliveryCost != null) {
      t += widget.listing.deliveryCost!;
    }
    return t;
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });
    try {
      final dio = ref.read(dioProvider);
      final body = {
        'listing': widget.listing.id,
        'paymentType': _paymentType,
        'totalAmount': _total,
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
      };
      await placeOrder(dio, body);
      ref.invalidate(myOrdersProvider);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('تم إرسال طلبك بنجاح!',
                style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: AppColors.green,
          ),
        );
      }
    } on DioException catch (e) {
      setState(() => _error = dioErrorMessage(e));
    } catch (_) {
      setState(() => _error = 'حدث خطأ غير متوقع');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context).viewInsets;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 0, 20, 20 + insets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const Text(
            'تأكيد الطلب',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          // Summary
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppColors.greenBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${widget.listing.typeAr}'
                  '${widget.listing.breed != null ? ' — ${widget.listing.breed}' : ''}',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.text,
                  ),
                ),
                Text(
                  '${_total.toStringAsFixed(0)} ج.م',
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.green,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Payment method
          const Text('طريقة الدفع',
              style: TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.muted)),
          const SizedBox(height: 8),
          _PaymentOption(
            label: 'كاش عند الاستلام',
            icon: Icons.payments_outlined,
            value: 'cod',
            groupValue: _paymentType,
            onChanged: (v) => setState(() => _paymentType = v),
          ),
          const SizedBox(height: 6),
          _PaymentOption(
            label: 'InstaPay',
            icon: Icons.phone_android_outlined,
            value: 'instapay',
            groupValue: _paymentType,
            onChanged: (v) => setState(() => _paymentType = v),
          ),
          const SizedBox(height: 14),
          // Notes
          TextField(
            controller: _notesCtrl,
            textDirection: TextDirection.rtl,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'ملاحظات إضافية (اختياري)',
              hintStyle: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 13,
                  color: AppColors.muted.withValues(alpha: 0.7)),
              filled: true,
              fillColor: AppColors.bg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: const BorderSide(color: AppColors.green),
              ),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.redBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(_error!,
                  style: const TextStyle(
                      fontFamily: 'Cairo', fontSize: 12, color: AppColors.red)),
            ),
          ],
          const SizedBox(height: 16),
          PrimaryButton(
            label: 'تأكيد الطلب',
            onPressed: _submit,
            loading: _loading,
          ),
        ],
      ),
    );
  }
}

class _PaymentOption extends StatelessWidget {
  const _PaymentOption({
    required this.label,
    required this.icon,
    required this.value,
    required this.groupValue,
    required this.onChanged,
  });

  final String label;
  final IconData icon;
  final String value;
  final String groupValue;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final selected = value == groupValue;
    return GestureDetector(
      onTap: () => onChanged(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? AppColors.greenBg : AppColors.bg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? AppColors.green : AppColors.border,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? AppColors.green : AppColors.muted, size: 20),
            const SizedBox(width: 10),
            Text(label,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: selected ? AppColors.green : AppColors.text,
                )),
            const Spacer(),
            if (selected)
              const Icon(Icons.check_circle, color: AppColors.green, size: 18),
          ],
        ),
      ),
    );
  }
}

// ── Shared small widgets ──────────────────────────────────────────────────────
class _Card extends StatelessWidget {
  const _Card({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AppColors.border),
    ),
    child: child,
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});
  final String title;
  @override
  Widget build(BuildContext context) => Text(
    title,
    style: const TextStyle(
      fontFamily: 'Cairo',
      fontSize: 13,
      fontWeight: FontWeight.w800,
      color: AppColors.muted,
      letterSpacing: 0.3,
    ),
  );
}

// ── Seller card ───────────────────────────────────────────────────────────────
class _SellerCard extends StatelessWidget {
  const _SellerCard({required this.listing});
  final ListingModel listing;

  @override
  Widget build(BuildContext context) {
    final name = listing.sellerFarmName ?? listing.sellerName ?? '—';

    return _Card(
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: const BoxDecoration(
            color: AppColors.greenBg,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              name.isNotEmpty ? name[0] : '؟',
              style: const TextStyle(fontFamily: 'Cairo', fontSize: 18,
                  fontWeight: FontWeight.w800, color: AppColors.green),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
            Text(name,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 14,
                    fontWeight: FontWeight.w700, color: AppColors.text)),
            const Text('البائع',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                    color: AppColors.muted)),
          ]),
        ),
        GestureDetector(
          onTap: () {
            HapticFeedback.lightImpact();
            context.push('/buyer/farm/${listing.sellerId}');
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.greenBg,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: const Text('عرض المزرعة',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.greenText)),
          ),
        ),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.bg, required this.fg});
  final String label;
  final Color bg;
  final Color fg;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
    child: Text(label,
        style: TextStyle(fontFamily: 'Cairo', fontSize: 11, fontWeight: FontWeight.w700, color: fg)),
  );
}
