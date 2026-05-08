import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/l10n/l10n_ext.dart';
import '../../core/theme/app_colors.dart';
import '../../shared/widgets/empty_state.dart';
import '../../shared/widgets/shimmer_widget.dart';
import '../admin/admin_dashboard_screen.dart';

// ── Provider ──────────────────────────────────────────────────────────────────

final pendingListingsProvider =
    FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final dio = ref.watch(dioProvider);
  final res  = await dio.get(ApiEndpoints.listings,
      queryParameters: {'status': 'all', 'limit': 100});
  final data = res.data as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Screen ────────────────────────────────────────────────────────────────────

class AdminListingsScreen extends ConsumerStatefulWidget {
  const AdminListingsScreen({super.key});

  @override
  ConsumerState<AdminListingsScreen> createState() => _AdminListingsScreenState();
}

class _AdminListingsScreenState extends ConsumerState<AdminListingsScreen> {
  String _typeFilter   = 'all';
  String _genderFilter = 'all';
  final Set<String> _selected = {};
  bool _multiSelect = false;

  static const _typeFilters = [
    ('all',     'الكل'),
    ('cattle',  'أبقار'),
    ('sheep',   'خراف'),
    ('goat',    'ماعز'),
    ('camel',   'إبل'),
    ('poultry', 'دواجن'),
  ];

  static const _typeAr = {
    'cattle': 'أبقار', 'buffalo': 'جاموس', 'sheep': 'خراف',
    'goat': 'ماعز', 'camel': 'إبل', 'horse': 'خيول',
    'poultry': 'دواجن', 'rabbit': 'أرانب',
  };

  static const _emojis = {
    'cattle': '🐄', 'buffalo': '🐃', 'sheep': '🐑', 'goat': '🐐',
    'camel': '🐪', 'horse': '🐴', 'poultry': '🐔', 'rabbit': '🐇',
  };

  Future<void> _bulkAction(String status) async {
    if (_selected.isEmpty) return;
    final ids = List<String>.from(_selected);
    final dio = ref.read(dioProvider);
    int success = 0;
    for (final id in ids) {
      try {
        await dio.patch(ApiEndpoints.listingStatus(id),
            data: {'status': status});
        success++;
      } catch (_) {}
    }
    setState(() {
      _selected.clear();
      _multiSelect = false;
    });
    ref.invalidate(pendingListingsProvider);
    ref.invalidate(adminStatsProvider);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('تم تحديث $success إعلانات',
            style: const TextStyle(fontFamily: 'Cairo')),
        backgroundColor: AppColors.green,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pendingListingsProvider);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: _multiSelect
            ? Text('${_selected.length} محدد',
                style: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800, color: AppColors.white))
            : Text(context.l10n.adminListingsTitle,
                style: const TextStyle(fontFamily: 'Cairo',
                    fontWeight: FontWeight.w800, color: AppColors.white)),
        actions: _multiSelect
            ? [
                IconButton(
                  icon: const Icon(Icons.check_circle_outline,
                      color: AppColors.white),
                  tooltip: 'موافقة على الكل',
                  onPressed: () => _bulkAction('approved'),
                ),
                IconButton(
                  icon: const Icon(Icons.cancel_outlined,
                      color: AppColors.white),
                  tooltip: 'رفض الكل',
                  onPressed: () => _bulkAction('rejected'),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.white),
                  onPressed: () => setState(() {
                    _selected.clear();
                    _multiSelect = false;
                  }),
                ),
              ]
            : null,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(88),
          child: Column(children: [
            // Type filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 4),
              child: Row(
                children: _typeFilters.map((f) {
                  final sel = _typeFilter == f.$1;
                  return GestureDetector(
                    onTap: () => setState(() => _typeFilter = f.$1),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      margin: const EdgeInsets.only(left: 6),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: sel
                            ? AppColors.white
                            : AppColors.white.withValues(alpha: 0.18),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(f.$2,
                          style: TextStyle(fontFamily: 'Cairo', fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: sel ? AppColors.green : AppColors.white)),
                    ),
                  );
                }).toList(),
              ),
            ),
            // Gender filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: Row(
                children: [
                  for (final gf in [
                    ('all', 'الكل'),
                    ('male', 'ذكر'),
                    ('female', 'أنثى'),
                  ]) ...[
                    GestureDetector(
                      onTap: () => setState(() => _genderFilter = gf.$1),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: _genderFilter == gf.$1
                              ? AppColors.white.withValues(alpha: 0.9)
                              : AppColors.white.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: _genderFilter == gf.$1
                                ? AppColors.white
                                : AppColors.white.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Text(gf.$2,
                            style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: _genderFilter == gf.$1
                                    ? AppColors.green
                                    : AppColors.white)),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ]),
        ),
      ),
      body: async.when(
        loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: ShimmerList(count: 5, cardHeight: 110)),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: context.l10n.loadingFailed,
          subtitle: e.toString(),
          actionLabel: context.l10n.retry,
          action: () => ref.invalidate(pendingListingsProvider),
        ),
        data: (listings) {
          final filtered = listings.where((l) {
            final type   = l['type'] as String? ?? '';
            final gender = l['gender'] as String? ?? '';
            final typeOk   = _typeFilter == 'all' || type == _typeFilter;
            final genderOk = _genderFilter == 'all' || gender == _genderFilter;
            return typeOk && genderOk;
          }).toList();

          if (filtered.isEmpty) {
            return EmptyState(
              icon: Icons.check_circle_outline,
              title: context.l10n.noListings,
              subtitle: context.l10n.approvedStatus,
            );
          }

          // Select all / deselect all header
          return Column(
            children: [
              if (_multiSelect)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(children: [
                    TextButton.icon(
                      onPressed: () => setState(() {
                        if (_selected.length == filtered.length) {
                          _selected.clear();
                        } else {
                          _selected.addAll(filtered
                              .map((l) => l['_id'] as String? ?? ''));
                        }
                      }),
                      icon: Icon(
                        _selected.length == filtered.length
                            ? Icons.deselect
                            : Icons.select_all,
                        size: 18, color: AppColors.green,
                      ),
                      label: Text(
                        _selected.length == filtered.length
                            ? 'إلغاء تحديد الكل'
                            : 'تحديد الكل',
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontSize: 13, color: AppColors.green),
                      ),
                    ),
                  ]),
                ),
              Expanded(
                child: RefreshIndicator(
                  color: AppColors.green,
                  onRefresh: () async => ref.invalidate(pendingListingsProvider),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final listing = filtered[i];
                      final id = listing['_id'] as String? ?? '';
                      return GestureDetector(
                        onLongPress: () => setState(() {
                          _multiSelect = true;
                          _selected.add(id);
                        }),
                        onTap: _multiSelect
                            ? () => setState(() {
                                if (_selected.contains(id)) {
                                  _selected.remove(id);
                                  if (_selected.isEmpty) _multiSelect = false;
                                } else {
                                  _selected.add(id);
                                }
                              })
                            : () => _showDetailSheet(context, listing),
                        child: Stack(
                          children: [
                            _ListingReviewCard(
                              listing: listing,
                              typeAr: _typeAr,
                              emojis: _emojis,
                              onAction: () {
                                ref.invalidate(pendingListingsProvider);
                                ref.invalidate(adminStatsProvider);
                              },
                            ),
                            if (_multiSelect)
                              Positioned(
                                top: 10,
                                left: 10,
                                child: Container(
                                  width: 22, height: 22,
                                  decoration: BoxDecoration(
                                    color: _selected.contains(id)
                                        ? AppColors.green
                                        : AppColors.white,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                        color: AppColors.green, width: 2),
                                  ),
                                  child: _selected.contains(id)
                                      ? const Icon(Icons.check,
                                          size: 14, color: AppColors.white)
                                      : null,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showDetailSheet(
      BuildContext context, Map<String, dynamic> listing) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _ListingDetailSheet(
        listing: listing,
        typeAr: _typeAr,
        emojis: _emojis,
        onAction: () {
          ref.invalidate(pendingListingsProvider);
          ref.invalidate(adminStatsProvider);
        },
      ),
    );
  }
}

// ── Listing detail bottom sheet ───────────────────────────────────────────────

class _ListingDetailSheet extends ConsumerStatefulWidget {
  const _ListingDetailSheet({
    required this.listing,
    required this.typeAr,
    required this.emojis,
    required this.onAction,
  });
  final Map<String, dynamic> listing;
  final Map<String, String>  typeAr;
  final Map<String, String>  emojis;
  final VoidCallback onAction;

  @override
  ConsumerState<_ListingDetailSheet> createState() =>
      _ListingDetailSheetState();
}

class _ListingDetailSheetState extends ConsumerState<_ListingDetailSheet> {
  bool _loading = false;
  final _noteCtrl = TextEditingController();
  int _photoIndex = 0;

  @override
  void initState() {
    super.initState();
    _noteCtrl.text = widget.listing['adminNotes'] as String? ?? '';
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _setStatus(String status, {String? reason}) async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.listingStatus(widget.listing['_id'] as String),
        data: {
          'status': status,
          if (reason != null && reason.isNotEmpty) 'rejectionReason': reason,
        },
      );
      widget.onAction();
      if (mounted) Navigator.of(context).pop();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _saveNote() async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.put(
        ApiEndpoints.listingById(widget.listing['_id'] as String),
        data: {'adminNotes': _noteCtrl.text.trim()},
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('تم حفظ الملاحظة',
              style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.green,
        ));
      }
    } catch (_) {} finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l       = widget.listing;
    final type    = l['type'] as String? ?? 'other';
    final breed   = l['breed'] as String?;
    final age     = l['ageMonths'] as int?;
    final weight  = (l['weight'] as num?)?.toDouble() ?? 0;
    final price   = (l['price'] as num?)?.toDouble() ?? 0;
    final gender  = l['gender'] as String?;
    final location = l['governorate'] as String? ?? l['location'] as String? ?? '—';
    final seller  = l['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final photos  = (l['photos'] as List?)?.cast<String>() ?? [];
    final status  = l['status'] as String? ?? 'pending';
    final fmt     = NumberFormat('#,##0', 'ar');
    final statusColors = {
      'pending':  AppColors.amber,
      'approved': AppColors.green,
      'rejected': AppColors.red,
    };
    final statusColor = statusColors[status] ?? AppColors.muted;
    final statusAr = {
      'pending':  'قيد المراجعة',
      'approved': 'مقبول',
      'rejected': 'مرفوض',
    };

    return DraggableScrollableSheet(
      initialChildSize: 0.88,
      maxChildSize: 0.95,
      minChildSize: 0.5,
      builder: (_, scrollCtrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(children: [
          // Handle
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 6),
            width: 36, height: 4,
            decoration: BoxDecoration(
              color: AppColors.border,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              Expanded(
                child: Text(breed ?? widget.typeAr[type] ?? type,
                    style: const TextStyle(fontFamily: 'Cairo', fontSize: 16,
                        fontWeight: FontWeight.w800, color: AppColors.text)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(statusAr[status] ?? status,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 11,
                        fontWeight: FontWeight.w700, color: statusColor)),
              ),
            ]),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView(
              controller: scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                // Photo carousel
                if (photos.isNotEmpty) ...[
                  SizedBox(
                    height: 200,
                    child: Stack(children: [
                      PageView.builder(
                        itemCount: photos.length,
                        onPageChanged: (i) =>
                            setState(() => _photoIndex = i),
                        itemBuilder: (_, i) => ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            photos[i],
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.greenBg,
                              child: const Center(
                                child: Icon(Icons.image_not_supported_outlined,
                                    color: AppColors.muted, size: 32),
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (photos.length > 1)
                        Positioned(
                          bottom: 8,
                          left: 0, right: 0,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: List.generate(photos.length, (i) =>
                              Container(
                                margin: const EdgeInsets.symmetric(horizontal: 3),
                                width: _photoIndex == i ? 10 : 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: _photoIndex == i
                                      ? AppColors.green
                                      : AppColors.white.withValues(alpha: 0.6),
                                  borderRadius: BorderRadius.circular(3),
                                ),
                              )),
                          ),
                        ),
                    ]),
                  ),
                  const SizedBox(height: 14),
                ] else ...[
                  Container(
                    height: 100,
                    decoration: BoxDecoration(
                      color: AppColors.greenBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(widget.emojis[type] ?? '🐾',
                          style: const TextStyle(fontSize: 40)),
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Specs grid
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.bg,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(children: [
                    _SpecRow('النوع', widget.typeAr[type] ?? type),
                    if (breed != null) _SpecRow('السلالة', breed),
                    if (age != null) _SpecRow('العمر', '$age شهر'),
                    _SpecRow('الوزن', '${weight.toStringAsFixed(0)} كجم'),
                    _SpecRow('السعر', '${fmt.format(price)} ج.م'),
                    if (gender != null) _SpecRow('الجنس', gender == 'male' ? 'ذكر' : 'أنثى'),
                    _SpecRow('المحافظة', location),
                    _SpecRow('البائع', sellerName),
                  ]),
                ),
                const SizedBox(height: 14),

                // Admin notes
                const Text('ملاحظات الإدارة',
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 13,
                        fontWeight: FontWeight.w700, color: AppColors.text)),
                const SizedBox(height: 8),
                TextField(
                  controller: _noteCtrl,
                  maxLines: 3,
                  style: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.text),
                  decoration: InputDecoration(
                    hintText: 'أضف ملاحظة...',
                    hintStyle: const TextStyle(fontFamily: 'Cairo',
                        fontSize: 13, color: AppColors.muted),
                    filled: true, fillColor: AppColors.bg,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide:
                            const BorderSide(color: AppColors.border)),
                    enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide:
                            const BorderSide(color: AppColors.border)),
                  ),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: _loading ? null : _saveNote,
                    child: const Text('حفظ الملاحظة',
                        style: TextStyle(fontFamily: 'Cairo',
                            fontSize: 12, color: AppColors.green)),
                  ),
                ),
                const SizedBox(height: 14),

                // Approve / Reject buttons
                Row(children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _loading || status == 'approved'
                          ? null
                          : () => _setStatus('approved'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.green,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: _loading
                          ? const SizedBox(width: 16, height: 16,
                              child: CircularProgressIndicator(
                                  color: AppColors.white, strokeWidth: 2))
                          : const Icon(Icons.check, size: 16,
                              color: AppColors.white),
                      label: const Text('موافقة',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              color: AppColors.white)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _loading || status == 'rejected'
                          ? null
                          : () => _showRejectSheet(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.red),
                        padding:
                            const EdgeInsets.symmetric(vertical: 12),
                      ),
                      icon: const Icon(Icons.close,
                          size: 16, color: AppColors.red),
                      label: const Text('رفض',
                          style: TextStyle(fontFamily: 'Cairo',
                              fontWeight: FontWeight.w700,
                              color: AppColors.red)),
                    ),
                  ),
                ]),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ]),
      ),
    );
  }

  void _showRejectSheet(BuildContext context) {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('سبب الرفض',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 15,
                    fontWeight: FontWeight.w800, color: AppColors.text)),
            const SizedBox(height: 14),
            TextField(
              controller: ctrl,
              maxLines: 3,
              autofocus: true,
              style: const TextStyle(fontFamily: 'Cairo',
                  fontSize: 13, color: AppColors.text),
              decoration: InputDecoration(
                hintText: 'اكتب سبب الرفض...',
                hintStyle: const TextStyle(fontFamily: 'Cairo',
                    fontSize: 13, color: AppColors.muted),
                filled: true, fillColor: AppColors.bg,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: AppColors.border)),
                enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide:
                        const BorderSide(color: AppColors.border)),
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _setStatus('rejected', reason: ctrl.text.trim());
                },
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.red,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                child: const Text('تأكيد الرفض',
                    style: TextStyle(fontFamily: 'Cairo',
                        fontWeight: FontWeight.w700,
                        color: AppColors.white)),
              ),
            ),
            const SizedBox(height: 8),
          ]),
        ),
      ),
    );
  }
}

// ── Spec row ──────────────────────────────────────────────────────────────────

class _SpecRow extends StatelessWidget {
  const _SpecRow(this.label, this.value);
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(children: [
      Text(label,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              color: AppColors.muted)),
      const Spacer(),
      Text(value,
          style: const TextStyle(fontFamily: 'Cairo', fontSize: 12,
              fontWeight: FontWeight.w600, color: AppColors.text)),
    ]),
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────

class _ListingReviewCard extends ConsumerStatefulWidget {
  const _ListingReviewCard({
    required this.listing,
    required this.typeAr,
    required this.emojis,
    required this.onAction,
  });
  final Map<String, dynamic> listing;
  final Map<String, String>  typeAr;
  final Map<String, String>  emojis;
  final VoidCallback onAction;

  @override
  ConsumerState<_ListingReviewCard> createState() =>
      _ListingReviewCardState();
}

class _ListingReviewCardState extends ConsumerState<_ListingReviewCard> {
  bool _loading   = false;
  bool _rejecting = false;
  final _reasonCtrl = TextEditingController();

  @override
  void dispose() {
    _reasonCtrl.dispose();
    super.dispose();
  }

  Future<void> _setStatus(String status, {String? reason}) async {
    setState(() => _loading = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch(
        ApiEndpoints.listingStatus(widget.listing['_id'] as String),
        data: {
          'status': status,
          if (reason != null && reason.isNotEmpty)
            'rejectionReason': reason,
        },
      );
      widget.onAction();
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(context.l10n.errorOccurred,
              style: const TextStyle(fontFamily: 'Cairo')),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l      = widget.listing;
    final type   = l['type'] as String? ?? 'other';
    final breed  = l['breed'] as String?;
    final weight = (l['weight'] as num?)?.toDouble() ?? 0;
    final price  = (l['price'] as num?)?.toDouble() ?? 0;
    final status = l['status'] as String? ?? 'pending';
    final seller = l['seller'] as Map? ?? {};
    final sellerName = seller['farmName'] as String?
        ?? seller['name'] as String? ?? '—';
    final fmt = NumberFormat('#,##0', 'ar');
    final isPending = status == 'pending';
    final statusColors = {
      'pending':  AppColors.amber,
      'approved': AppColors.green,
      'rejected': AppColors.red,
    };
    final statusAr = {
      'pending':  'قيد المراجعة',
      'approved': 'مقبول',
      'rejected': 'مرفوض',
    };
    final statusColor = statusColors[status] ?? AppColors.muted;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6,
              offset: Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Info row ─────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  color: AppColors.greenBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(widget.emojis[type] ?? '🐾',
                      style: const TextStyle(fontSize: 26)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(breed ?? widget.typeAr[type] ?? type,
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 14, fontWeight: FontWeight.w700,
                          color: AppColors.text)),
                  const SizedBox(height: 2),
                  Text('${weight.toStringAsFixed(0)} كجم  •  ${fmt.format(price)} ج.م',
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 12, color: AppColors.muted)),
                  Text('${context.l10n.seller}: $sellerName',
                      style: const TextStyle(fontFamily: 'Cairo',
                          fontSize: 11, color: AppColors.muted)),
                ],
              )),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(statusAr[status] ?? status,
                    style: TextStyle(fontFamily: 'Cairo', fontSize: 10,
                        fontWeight: FontWeight.w700, color: statusColor)),
              ),
            ]),
          ),

          // ── Reject reason input ─────────────────────────────────────
          if (_rejecting)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 10),
              child: TextField(
                controller: _reasonCtrl,
                maxLines: 2,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 13,
                    color: AppColors.text),
                decoration: InputDecoration(
                  hintText: context.l10n.noteOptional,
                  hintStyle: const TextStyle(fontFamily: 'Cairo',
                      fontSize: 13, color: AppColors.muted),
                  filled: true, fillColor: AppColors.bg,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                  enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide:
                          const BorderSide(color: AppColors.border)),
                ),
              ),
            ),

          // ── Action buttons (pending only) ───────────────────────────
          if (isPending)
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Row(children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _loading ? null
                        : () => _setStatus('approved'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.green,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    icon: _loading
                        ? const SizedBox(width: 16, height: 16,
                            child: CircularProgressIndicator(
                                color: AppColors.white, strokeWidth: 2))
                        : const Icon(Icons.check, size: 16,
                            color: AppColors.white),
                    label: Text(context.l10n.approveButton,
                        style: const TextStyle(fontFamily: 'Cairo',
                            fontWeight: FontWeight.w700,
                            color: AppColors.white)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _rejecting
                      ? FilledButton.icon(
                          onPressed: _loading ? null
                              : () => _setStatus('rejected',
                                  reason: _reasonCtrl.text.trim()),
                          style: FilledButton.styleFrom(
                            backgroundColor: AppColors.red,
                            padding: const EdgeInsets.symmetric(
                                vertical: 10),
                          ),
                          icon: const Icon(Icons.send, size: 16,
                              color: AppColors.white),
                          label: Text(context.l10n.confirmReject,
                              style: const TextStyle(fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.white)),
                        )
                      : OutlinedButton.icon(
                          onPressed: _loading ? null
                              : () => setState(() => _rejecting = true),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: AppColors.red),
                            padding: const EdgeInsets.symmetric(
                                vertical: 10),
                          ),
                          icon: const Icon(Icons.close, size: 16,
                              color: AppColors.red),
                          label: Text(context.l10n.rejectButton,
                              style: const TextStyle(fontFamily: 'Cairo',
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.red)),
                        ),
                ),
              ]),
            ),
        ],
      ),
    );
  }
}
