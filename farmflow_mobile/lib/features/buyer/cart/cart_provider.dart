import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../shared/models/listing_model.dart';

// ── Cart item ─────────────────────────────────────────────────────────────────

class CartItem {
  const CartItem({
    required this.id,
    required this.title,
    required this.type,
    required this.price,
    this.imageUrl,
  });

  /// Listing ID — serves as the unique key.
  final String id;

  /// Human-readable label: breed + type (e.g. "بلدي • أبقار").
  final String title;

  /// Raw type slug (cattle / sheep / …).
  final String type;

  final double price;
  final String? imageUrl;

  // ── Factory from ListingModel ─────────────────────────────────────────────

  factory CartItem.fromListing(ListingModel listing) {
    final breed = listing.breed;
    final typeAr = listing.typeAr;
    final title = breed != null && breed.isNotEmpty
        ? '$breed • $typeAr'
        : typeAr;

    return CartItem(
      id: listing.id,
      title: title,
      type: listing.type,
      price: listing.price,
      imageUrl: listing.images.isNotEmpty ? listing.images.first : null,
    );
  }

  // ── JSON serialisation (for SharedPreferences) ────────────────────────────

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type,
        'price': price,
        if (imageUrl != null) 'imageUrl': imageUrl,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        id: json['id'] as String,
        title: json['title'] as String,
        type: json['type'] as String,
        price: (json['price'] as num).toDouble(),
        imageUrl: json['imageUrl'] as String?,
      );

  @override
  bool operator ==(Object other) =>
      other is CartItem && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

// ── SharedPreferences key ─────────────────────────────────────────────────────

const _kCartKey = 'farmflow_cart_v1';

// ── CartNotifier ──────────────────────────────────────────────────────────────

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super(const []) {
    _loadFromPrefs();
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  Future<void> _loadFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kCartKey);
      if (raw == null) return;
      final list = json.decode(raw) as List<dynamic>;
      state = list
          .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // Corrupt data — start fresh.
      state = const [];
    }
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final encoded = json.encode(state.map((i) => i.toJson()).toList());
      await prefs.setString(_kCartKey, encoded);
    } catch (_) {
      // Non-fatal — in-memory state is still correct.
    }
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /// Adds [item] to the cart. No-op if an item with the same [id] already
  /// exists (livestock listings are unique animals — no duplicates).
  void addItem(CartItem item) {
    if (hasItem(item.id)) return;
    state = [...state, item];
    _persist();
  }

  /// Removes the item with [id] from the cart.
  void removeItem(String id) {
    state = state.where((i) => i.id != id).toList();
    _persist();
  }

  /// Empties the cart completely.
  void clearCart() {
    state = const [];
    _persist();
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  bool hasItem(String id) => state.any((i) => i.id == id);
}

// ── Providers ─────────────────────────────────────────────────────────────────

final cartProvider =
    StateNotifierProvider<CartNotifier, List<CartItem>>(
  (ref) => CartNotifier(),
);

/// Sum of all item prices in the cart.
final cartTotalProvider = Provider<double>((ref) {
  return ref.watch(cartProvider).fold(0.0, (sum, item) => sum + item.price);
});

/// Number of items currently in the cart.
final cartCountProvider = Provider<int>((ref) {
  return ref.watch(cartProvider).length;
});
