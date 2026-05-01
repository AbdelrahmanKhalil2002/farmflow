/// Notification — mirrors backend Notification schema.
class NotificationModel {
  const NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.link,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String message;
  final String? link;
  final bool read;
  final DateTime createdAt;

  factory NotificationModel.fromJson(Map<String, dynamic> json) => NotificationModel(
    id:        json['_id'] as String? ?? json['id'] as String? ?? '',
    type:      json['type'] as String? ?? 'general',
    title:     json['title'] as String? ?? '',
    message:   json['message'] as String? ?? '',
    link:      json['link'] as String?,
    read:      json['read'] as bool? ?? false,
    createdAt: DateTime.tryParse(json['createdAt'] as String? ?? '') ??
               DateTime.now(),
  );

  NotificationModel copyWith({bool? read}) => NotificationModel(
    id:        id,
    type:      type,
    title:     title,
    message:   message,
    link:      link,
    read:      read ?? this.read,
    createdAt: createdAt,
  );
}
