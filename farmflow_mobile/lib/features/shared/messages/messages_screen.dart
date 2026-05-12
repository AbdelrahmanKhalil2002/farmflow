import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_notifier.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/empty_state.dart';
import '../../../shared/widgets/shimmer_widget.dart';

// ─── Models ──────────────────────────────────────────────────────────────────

class _Participant {
  const _Participant({
    required this.id,
    required this.name,
    this.farmName,
  });

  final String id;
  final String name;
  final String? farmName;

  String get displayName => farmName?.isNotEmpty == true ? farmName! : name;

  factory _Participant.fromJson(Map<String, dynamic> j) => _Participant(
        id: j['_id'] as String? ?? j['id'] as String? ?? '',
        name: j['name'] as String? ?? '',
        farmName: j['farmName'] as String?,
      );
}

class _Conversation {
  const _Conversation({
    required this.id,
    required this.participants,
    required this.lastMessageBody,
    required this.lastMessageAt,
    required this.unread,
  });

  final String id;
  final List<_Participant> participants;
  final String lastMessageBody;
  final DateTime lastMessageAt;
  final int unread;

  factory _Conversation.fromJson(Map<String, dynamic> j) {
    final rawParts = j['participants'];
    final parts = rawParts is List
        ? rawParts
            .whereType<Map<String, dynamic>>()
            .map(_Participant.fromJson)
            .toList()
        : <_Participant>[];

    final last = j['lastMessage'];
    String body = '';
    DateTime at = DateTime.now();
    if (last is Map<String, dynamic>) {
      body = last['body'] as String? ?? '';
      final rawAt = last['at'];
      if (rawAt is String) at = DateTime.tryParse(rawAt) ?? DateTime.now();
    }

    return _Conversation(
      id: j['_id'] as String? ?? '',
      participants: parts,
      lastMessageBody: body,
      lastMessageAt: at,
      unread: j['unread'] as int? ?? 0,
    );
  }

  /// Returns the participant who is NOT the current user.
  _Participant? otherParticipant(String currentUserId) {
    try {
      return participants.firstWhere((p) => p.id != currentUserId);
    } catch (_) {
      return participants.isNotEmpty ? participants.first : null;
    }
  }
}

class _Message {
  const _Message({
    required this.id,
    required this.from,
    required this.body,
    required this.at,
    required this.type,
  });

  final String id;
  final String from;
  final String body;
  final DateTime at;
  final String type; // 'text' | 'offer'

  factory _Message.fromJson(Map<String, dynamic> j) {
    final rawFrom = j['from'];
    final fromId = rawFrom is Map<String, dynamic>
        ? (rawFrom['_id'] as String? ?? rawFrom['id'] as String? ?? '')
        : rawFrom as String? ?? '';

    final rawAt = j['at'];
    final at =
        rawAt is String ? DateTime.tryParse(rawAt) ?? DateTime.now() : DateTime.now();

    return _Message(
      id: j['_id'] as String? ?? j['id'] as String? ?? '',
      from: fromId,
      body: j['body'] as String? ?? '',
      at: at,
      type: j['type'] as String? ?? 'text',
    );
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

final conversationsProvider =
    FutureProvider.autoDispose<List<_Conversation>>((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get(ApiEndpoints.conversations);
  final data = res.data;
  if (data is List) {
    return data
        .whereType<Map<String, dynamic>>()
        .map(_Conversation.fromJson)
        .toList();
  }
  return [];
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

String _formatTime(DateTime dt) {
  final now = DateTime.now();
  final diff = now.difference(dt);
  if (diff.inDays == 0) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
  if (diff.inDays < 7) {
    const days = ['الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
    return days[dt.weekday - 1];
  }
  return '${dt.day}/${dt.month}/${dt.year}';
}

String _initials(String name) {
  final parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return '${parts[0][0]}${parts[1][0]}';
  }
  return name.isNotEmpty ? name[0] : '؟';
}

Color _avatarColor(String name) {
  const palette = [
    Color(0xFF3A7D44),
    Color(0xFF2563EB),
    Color(0xFFD97706),
    Color(0xFFE11D48),
    Color(0xFF7C3AED),
    Color(0xFF0891B2),
  ];
  final idx = name.codeUnits.fold(0, (a, b) => a + b) % palette.length;
  return palette[idx];
}

// ─── MessagesScreen (entry point) ─────────────────────────────────────────────

class MessagesScreen extends ConsumerStatefulWidget {
  /// Optional userId — if provided, deep-links to (or creates) a conversation
  /// with that user immediately.
  const MessagesScreen({super.key, this.userId});

  final String? userId;

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  @override
  void initState() {
    super.initState();
    if (widget.userId != null) {
      // After first frame, attempt to open/create the conversation
      WidgetsBinding.instance.addPostFrameCallback((_) => _openOrCreate());
    }
  }

  Future<void> _openOrCreate() async {
    final userId = widget.userId;
    if (userId == null || !mounted) return;
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get(ApiEndpoints.getOrCreateConversation(userId));
      final data = res.data;
      if (data is Map<String, dynamic> && mounted) {
        final conv = _Conversation.fromJson(data);
        final currentUser = ref.read(authNotifierProvider).valueOrNull;
        final other = conv.otherParticipant(currentUser?.id ?? '');
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => _MessageThread(
              conversationId: conv.id,
              otherName: other?.displayName ?? 'محادثة',
              currentUserId: currentUser?.id ?? '',
            ),
          ),
        );
      }
    } catch (_) {
      // Silently fail — user can tap from list
    }
  }

  @override
  Widget build(BuildContext context) {
    return const _ConversationList();
  }
}

// ─── _ConversationList ─────────────────────────────────────────────────────────

class _ConversationList extends ConsumerWidget {
  const _ConversationList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(conversationsProvider);
    final currentUser = ref.watch(authNotifierProvider).valueOrNull;

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.green,
        elevation: 0,
        title: const Text(
          'المحادثات',
          style: TextStyle(
            fontFamily: 'Cairo',
            fontWeight: FontWeight.w800,
            fontSize: 18,
            color: AppColors.white,
          ),
        ),
        iconTheme: const IconThemeData(color: AppColors.white),
      ),
      body: state.when(
        loading: () => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: List.generate(
              6,
              (_) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    ShimmerBox(width: 52, height: 52, borderRadius: 26),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ShimmerBox(
                              width: double.infinity, height: 14, borderRadius: 6),
                          const SizedBox(height: 6),
                          ShimmerBox(width: 180, height: 12, borderRadius: 6),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        error: (e, _) => EmptyState(
          icon: Icons.wifi_off_rounded,
          title: 'تعذّر تحميل المحادثات',
          subtitle: 'تحقق من اتصالك بالإنترنت',
          actionLabel: 'إعادة المحاولة',
          action: () => ref.invalidate(conversationsProvider),
        ),
        data: (conversations) {
          if (conversations.isEmpty) {
            return const EmptyState(
              icon: Icons.chat_bubble_outline_rounded,
              title: 'لا توجد محادثات بعد',
              subtitle: 'يمكنك التواصل مع البائعين من صفحة المزرعة',
            );
          }

          return RefreshIndicator(
            color: AppColors.green,
            onRefresh: () async => ref.invalidate(conversationsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: conversations.length,
              separatorBuilder: (_, __) => const Divider(
                height: 1,
                indent: 80,
                endIndent: 16,
                color: Color(0xFFE8D5C0),
              ),
              itemBuilder: (_, i) {
                final conv = conversations[i];
                final other =
                    conv.otherParticipant(currentUser?.id ?? '') ??
                        _Participant(id: '', name: 'مستخدم');
                return _ConversationTile(
                  conversation: conv,
                  other: other,
                  currentUserId: currentUser?.id ?? '',
                );
              },
            ),
          );
        },
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({
    required this.conversation,
    required this.other,
    required this.currentUserId,
  });

  final _Conversation conversation;
  final _Participant other;
  final String currentUserId;

  @override
  Widget build(BuildContext context) {
    final avatarColor = _avatarColor(other.displayName);
    final initials = _initials(other.displayName);
    final timeStr = _formatTime(conversation.lastMessageAt);
    final hasUnread = conversation.unread > 0;

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => _MessageThread(
              conversationId: conversation.id,
              otherName: other.displayName,
              currentUserId: currentUserId,
            ),
          ),
        );
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            // Avatar
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: avatarColor,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(
                initials,
                style: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: AppColors.white,
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Name + preview
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          other.displayName,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 14,
                            fontWeight: hasUnread
                                ? FontWeight.w800
                                : FontWeight.w600,
                            color: AppColors.text,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        timeStr,
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          color: hasUnread
                              ? AppColors.green
                              : AppColors.midMuted,
                          fontWeight: hasUnread
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          conversation.lastMessageBody,
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            color: hasUnread
                                ? AppColors.text
                                : AppColors.muted,
                            fontWeight: hasUnread
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hasUnread) ...[
                        const SizedBox(width: 6),
                        Container(
                          constraints:
                              const BoxConstraints(minWidth: 20, maxWidth: 32),
                          height: 20,
                          padding:
                              const EdgeInsets.symmetric(horizontal: 5),
                          decoration: const BoxDecoration(
                            color: AppColors.green,
                            borderRadius:
                                BorderRadius.all(Radius.circular(10)),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            conversation.unread > 99
                                ? '99+'
                                : '${conversation.unread}',
                            style: const TextStyle(
                              fontFamily: 'Cairo',
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: AppColors.white,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── _MessageThread ────────────────────────────────────────────────────────────

class _MessageThread extends ConsumerStatefulWidget {
  const _MessageThread({
    required this.conversationId,
    required this.otherName,
    required this.currentUserId,
  });

  final String conversationId;
  final String otherName;
  final String currentUserId;

  @override
  ConsumerState<_MessageThread> createState() => _MessageThreadState();
}

class _MessageThreadState extends ConsumerState<_MessageThread> {
  final List<_Message> _messages = [];
  final TextEditingController _inputController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  bool _loading = true;
  bool _sending = false;
  String? _error;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) _pollMessages();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio
          .get(ApiEndpoints.conversationMessages(widget.conversationId));
      final data = res.data;
      if (data is List && mounted) {
        setState(() {
          _messages
            ..clear()
            ..addAll(
              data
                  .whereType<Map<String, dynamic>>()
                  .map(_Message.fromJson),
            );
          _loading = false;
        });
        _scrollToBottom(animate: false);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
          _error = 'تعذّر تحميل الرسائل';
        });
      }
    }
  }

  Future<void> _pollMessages() async {
    try {
      final dio = ref.read(dioProvider);
      final res = await dio
          .get(ApiEndpoints.conversationMessages(widget.conversationId));
      final data = res.data;
      if (data is List && mounted) {
        final incoming = data
            .whereType<Map<String, dynamic>>()
            .map(_Message.fromJson)
            .toList();

        if (incoming.length != _messages.length) {
          setState(() {
            _messages
              ..clear()
              ..addAll(incoming);
          });
          _scrollToBottom(animate: true);
        }
      }
    } catch (_) {
      // Silently ignore poll failures
    }
  }

  Future<void> _sendMessage() async {
    final body = _inputController.text.trim();
    if (body.isEmpty || _sending) return;

    _inputController.clear();

    // Optimistic append
    final optimistic = _Message(
      id: 'pending_${DateTime.now().millisecondsSinceEpoch}',
      from: widget.currentUserId,
      body: body,
      at: DateTime.now(),
      type: 'text',
    );
    setState(() {
      _messages.add(optimistic);
      _sending = true;
    });
    _scrollToBottom(animate: true);

    try {
      final dio = ref.read(dioProvider);
      final res = await dio.post(
        ApiEndpoints.sendMessageUrl,
        data: {
          'conversationId': widget.conversationId,
          'body': body,
        },
      );
      final data = res.data;
      if (data is Map<String, dynamic> && mounted) {
        final sent = _Message.fromJson(data);
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == optimistic.id);
          if (idx != -1) _messages[idx] = sent;
          _sending = false;
        });
      } else if (mounted) {
        setState(() => _sending = false);
      }
    } catch (_) {
      if (mounted) {
        // Remove optimistic on failure and restore text
        setState(() {
          _messages.removeWhere((m) => m.id == optimistic.id);
          _sending = false;
        });
        _inputController.text = body;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'تعذّر إرسال الرسالة. حاول مجدداً.',
              style: TextStyle(fontFamily: 'Cairo'),
            ),
            backgroundColor: Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _scrollToBottom({bool animate = true}) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      if (animate) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      } else {
        _scrollController.jumpTo(
            _scrollController.position.maxScrollExtent);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: AppColors.bg,
        appBar: AppBar(
          backgroundColor: AppColors.green,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: AppColors.white, size: 20),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: _avatarColor(widget.otherName),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials(widget.otherName),
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.white,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.otherName,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                    color: AppColors.white,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        body: Column(
          children: [
            // Messages area
            Expanded(
              child: _buildMessageArea(),
            ),
            // Input bar
            _buildInputBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageArea() {
    if (_loading) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: List.generate(
            5,
            (i) => Align(
              alignment:
                  i.isEven ? Alignment.centerRight : Alignment.centerLeft,
              child: Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ShimmerBox(
                  width: 180 + (i * 10.0),
                  height: 42,
                  borderRadius: 16,
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (_error != null) {
      return EmptyState(
        icon: Icons.wifi_off_rounded,
        title: _error!,
        actionLabel: 'إعادة المحاولة',
        action: _loadMessages,
      );
    }

    if (_messages.isEmpty) {
      return const EmptyState(
        icon: Icons.chat_bubble_outline_rounded,
        title: 'لا توجد رسائل بعد',
        subtitle: 'ابدأ المحادثة الآن',
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _messages.length,
      itemBuilder: (_, i) {
        final msg = _messages[i];
        final isMe = msg.from == widget.currentUserId;

        // Show date separator if day changes
        final showDate = i == 0 ||
            !_sameDay(_messages[i - 1].at, msg.at);

        return Column(
          children: [
            if (showDate) _DateSeparator(dt: msg.at),
            _MessageBubble(message: msg, isMe: isMe),
          ],
        );
      },
    );
  }

  Widget _buildInputBar() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(
          top: BorderSide(color: Color(0xFFE8D5C0)),
        ),
      ),
      padding: EdgeInsets.only(
        right: 12,
        left: 8,
        top: 8,
        bottom: 8 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            // Text field
            Expanded(
              child: Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  color: AppColors.bg,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE8D5C0)),
                ),
                child: TextField(
                  controller: _inputController,
                  maxLines: null,
                  textDirection: TextDirection.rtl,
                  style: const TextStyle(
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    color: AppColors.text,
                  ),
                  decoration: const InputDecoration(
                    hintText: 'اكتب رسالة...',
                    hintStyle: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      color: AppColors.midMuted,
                    ),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    border: InputBorder.none,
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Send button
            GestureDetector(
              onTap: _sending ? null : _sendMessage,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _sending ? AppColors.midMuted : AppColors.green,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: _sending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Icon(
                        Icons.send_rounded,
                        color: AppColors.white,
                        size: 20,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

// ─── _MessageBubble ────────────────────────────────────────────────────────────

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.isMe});

  final _Message message;
  final bool isMe;

  @override
  Widget build(BuildContext context) {
    final h = message.at.hour.toString().padLeft(2, '0');
    final m = message.at.minute.toString().padLeft(2, '0');
    final timeStr = '$h:$m';

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            Container(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.72,
              ),
              padding:
                  const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isMe ? AppColors.green : AppColors.white,
                borderRadius: BorderRadius.only(
                  topRight: const Radius.circular(18),
                  topLeft: const Radius.circular(18),
                  bottomRight:
                      isMe ? Radius.zero : const Radius.circular(18),
                  bottomLeft:
                      isMe ? const Radius.circular(18) : Radius.zero,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Text(
                message.body,
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 14,
                  height: 1.4,
                  color: isMe ? AppColors.white : AppColors.text,
                ),
              ),
            ),
            const SizedBox(height: 3),
            Text(
              timeStr,
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 10,
                color: AppColors.midMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── _DateSeparator ────────────────────────────────────────────────────────────

class _DateSeparator extends StatelessWidget {
  const _DateSeparator({required this.dt});

  final DateTime dt;

  String _label() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final msgDay = DateTime(dt.year, dt.month, dt.day);
    final diff = today.difference(msgDay).inDays;
    if (diff == 0) return 'اليوم';
    if (diff == 1) return 'أمس';
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          const Expanded(
            child: Divider(color: Color(0xFFE8D5C0)),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 10),
            padding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFE8D5C0),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              _label(),
              style: const TextStyle(
                fontFamily: 'Cairo',
                fontSize: 11,
                color: AppColors.muted,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const Expanded(
            child: Divider(color: Color(0xFFE8D5C0)),
          ),
        ],
      ),
    );
  }
}
