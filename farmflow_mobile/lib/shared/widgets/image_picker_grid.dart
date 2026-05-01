import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_colors.dart';

/// Horizontal grid of image thumbnails + "add" tile.
/// Drop-in for any form that needs multi-image selection.
class ImagePickerGrid extends StatelessWidget {
  const ImagePickerGrid({
    super.key,
    required this.images,
    required this.onChanged,
    this.maxImages = 5,
  });

  final List<XFile> images;
  final ValueChanged<List<XFile>> onChanged;
  final int maxImages;

  Future<void> _pickFromSource(
      BuildContext context, ImageSource source) async {
    final picker = ImagePicker();
    try {
      if (source == ImageSource.gallery) {
        final picked = await picker.pickMultiImage(imageQuality: 80);
        if (picked.isNotEmpty) {
          final combined = [...images, ...picked];
          onChanged(combined.take(maxImages).toList());
        }
      } else {
        final picked =
            await picker.pickImage(source: source, imageQuality: 80);
        if (picked != null) {
          onChanged([...images, picked].take(maxImages).toList());
        }
      }
    } catch (_) {
      // permission denied or unavailable — silently ignore
    }
  }

  void _showSourceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10),
              width: 36, height: 3,
              decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2)),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined,
                  color: AppColors.green),
              title: const Text('اختر من المعرض',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                      color: AppColors.text)),
              onTap: () {
                Navigator.pop(context);
                _pickFromSource(context, ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined,
                  color: AppColors.green),
              title: const Text('التقط صورة',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 14,
                      color: AppColors.text)),
              onTap: () {
                Navigator.pop(context);
                _pickFromSource(context, ImageSource.camera);
              },
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        // Existing thumbnails
        ...images.asMap().entries.map((e) {
          final idx  = e.key;
          final file = e.value;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.file(
                  File(file.path),
                  width: 80, height: 80,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: -4, left: -4,
                child: GestureDetector(
                  onTap: () {
                    final list = [...images]..removeAt(idx);
                    onChanged(list);
                  },
                  child: Container(
                    width: 20, height: 20,
                    decoration: const BoxDecoration(
                        color: AppColors.red, shape: BoxShape.circle),
                    child: const Icon(Icons.close,
                        size: 13, color: AppColors.white),
                  ),
                ),
              ),
            ],
          );
        }),

        // Add tile (visible while under limit)
        if (images.length < maxImages)
          GestureDetector(
            onTap: () => _showSourceSheet(context),
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: AppColors.greenBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                    color: AppColors.green.withValues(alpha: 0.4),
                    width: 1.5),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_photo_alternate_outlined,
                      color: AppColors.green, size: 26),
                  const SizedBox(height: 2),
                  Text('${images.length}/$maxImages',
                      style: const TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 10,
                          color: AppColors.green,
                          fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
