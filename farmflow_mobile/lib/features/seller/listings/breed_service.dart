import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Default breeds per animal type. Keys match the type values used in listings.
const Map<String, List<String>> kDefaultBreeds = {
  'cattle':  ['فريزيان', 'هولشتاين', 'براهمان', 'سيمنتال', 'ليموزين', 'واجو', 'أنغوس', 'بلدي'],
  'buffalo': ['نيلي رابي', 'مرة', 'سواتي', 'جافارابادي', 'بلدي'],
  'sheep':   ['عواسي', 'فلاحي', 'رحماني', 'رومانوف', 'برقي', 'بلدي'],
  'goat':    ['بلدي', 'نوبي', 'شامي', 'بور', 'أبو سراويل'],
  'camel':   ['مجاهيم', 'وضح', 'صفراء', 'حمراء', 'بلدي'],
  'horse':   ['عربي', 'إنجليزي', 'حفلة', 'بيني', 'بلدي'],
  'poultry': ['بلدي', 'روستو', 'رومي', 'بط', 'إوز', 'حمام'],
  'rabbit':  ['نيوزيلندي', 'كاليفورني', 'ألبا', 'أنغورا', 'بلدي'],
};

const _kPrefsKey = 'custom_breeds_v1';

class BreedNotifier extends StateNotifier<Map<String, List<String>>> {
  BreedNotifier() : super({}) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kPrefsKey);
    if (raw != null) {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      state = decoded.map((k, v) => MapEntry(k, List<String>.from(v as List)));
    }
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kPrefsKey, jsonEncode(state));
  }

  List<String> breedsFor(String type) {
    final defaults = kDefaultBreeds[type] ?? [];
    final custom   = state[type] ?? [];
    // custom breeds appended after defaults, deduplicated
    final seen = <String>{};
    return [...defaults, ...custom]
        .where((b) => seen.add(b))
        .toList();
  }

  Future<void> addBreed(String type, String breed) async {
    final trimmed = breed.trim();
    if (trimmed.isEmpty) return;
    final existing = state[type] ?? [];
    if (breedsFor(type).contains(trimmed)) return;
    state = {
      ...state,
      type: [...existing, trimmed],
    };
    await _save();
  }

  Future<void> removeCustomBreed(String type, String breed) async {
    final existing = List<String>.from(state[type] ?? []);
    existing.remove(breed);
    state = {
      ...state,
      type: existing,
    };
    await _save();
  }

  bool isCustom(String type, String breed) {
    return (state[type] ?? []).contains(breed);
  }
}

final breedNotifierProvider =
    StateNotifierProvider<BreedNotifier, Map<String, List<String>>>(
        (_) => BreedNotifier());
