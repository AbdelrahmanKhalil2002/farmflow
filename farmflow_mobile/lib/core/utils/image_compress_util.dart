import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:path_provider/path_provider.dart';

/// Compresses an [XFile] image to max 1280×720, quality 80.
/// Falls back to the original file on any error.
Future<XFile> compressImage(XFile source) async {
  try {
    final dir = await getTemporaryDirectory();
    final name = source.path.split('/').last;
    final dot  = name.lastIndexOf('.');
    final ext  = dot != -1 ? name.substring(dot).toLowerCase() : '.jpg';
    final target = '${dir.path}/${DateTime.now().millisecondsSinceEpoch}$ext';

    final result = await FlutterImageCompress.compressAndGetFile(
      source.path,
      target,
      quality:   80,
      minWidth:  1280,
      minHeight: 720,
    );
    if (result != null) return XFile(result.path);
  } catch (_) {
    // Compression failed — use original file
  }
  return source;
}
