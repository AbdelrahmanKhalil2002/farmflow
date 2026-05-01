/// Converts a relative upload path from the backend to a full URL.
///
/// The API base URL is `http://<host>/api`.
/// Upload files are served at `http://<host>/<path>` (no /api prefix).
String imageUrl(String? path) {
  if (path == null || path.isEmpty) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const base = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5001/api',
  );
  // Strip /api suffix to get the origin (e.g. http://10.0.2.2:5001)
  final origin = base.endsWith('/api')
      ? base.substring(0, base.length - 4)
      : base;
  final clean = path.startsWith('/') ? path : '/$path';
  return '$origin$clean';
}
