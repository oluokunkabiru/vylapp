import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/network_exceptions.dart';
import '../../../../core/network/socket_service.dart';
import '../../../../core/constants/api_constants.dart';
import '../../../../core/di/injection.dart';
import '../../../../shared/widgets/vyl_widgets.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../../data/models/conversation_model.dart';

class ChatScreen extends StatefulWidget {
  final String conversationId;
  const ChatScreen({super.key, required this.conversationId});
  @override State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _api = getIt<ApiClient>();
  final _socket = getIt<SocketService>();
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  List<MessageModel> _messages = [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  StreamSubscription<Map<String, dynamic>>? _sub;

  @override
  void initState() {
    super.initState();
    _load();
    _socket.joinConversation(widget.conversationId);
    _sub = _socket.onNewMessage.listen(_onSocketMessage);
  }

  @override
  void dispose() {
    _sub?.cancel();
    _socket.leaveConversation(widget.conversationId);
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onSocketMessage(Map<String, dynamic> data) {
    if (data['conversationId'] != widget.conversationId) return;
    final raw = data['message'] as Map<String, dynamic>?;
    if (raw == null) return;
    final myId = _myUserId(context);
    // The socket payload is a lighter shape than the REST one (no nested
    // sender object, just senderId) — skip echoing our own message back
    // in since sendMessage() already appended it optimistically.
    if (raw['senderId'] == myId) return;
    setState(() {
      _messages = [..._messages, MessageModel(
        id: raw['id'] as String? ?? DateTime.now().toIso8601String(),
        content: raw['content'] as String? ?? '',
        createdAt: DateTime.tryParse(raw['createdAt'] as String? ?? '') ?? DateTime.now(),
      )];
    });
    _scrollToBottom();
  }

  String? _myUserId(BuildContext context) {
    final state = context.read<AuthBloc>().state;
    return state is AuthAuthenticated ? state.user.id : null;
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await _api.get(ApiConstants.conversationMessages(widget.conversationId));
      final list = (data['messages'] as List? ?? [])
        .map((m) => MessageModel.fromJson(m as Map<String, dynamic>))
        .toList();
      setState(() { _messages = list; _loading = false; });
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom(animate: false));
    } on NetworkException catch (e) {
      setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      setState(() { _loading = false; _error = 'Failed to load messages.'; });
    }
  }

  void _scrollToBottom({bool animate = true}) {
    if (!_scrollController.hasClients) return;
    final target = _scrollController.position.maxScrollExtent;
    if (animate) {
      _scrollController.animateTo(target, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
    } else {
      _scrollController.jumpTo(target);
    }
  }

  Future<void> _send() async {
    final content = _inputController.text.trim();
    if (content.isEmpty || _sending) return;
    setState(() => _sending = true);
    _inputController.clear();
    try {
      final data = await _api.post(
        ApiConstants.conversationMessages(widget.conversationId),
        body: {'content': content},
      );
      final sent = data['message'] as Map<String, dynamic>?;
      setState(() {
        _messages = [..._messages, MessageModel(
          id: sent?['id'] as String? ?? DateTime.now().toIso8601String(),
          content: sent?['content'] as String? ?? content,
          createdAt: DateTime.tryParse(sent?['createdAt'] as String? ?? '') ?? DateTime.now(),
        )];
      });
      _scrollToBottom();
    } catch (_) {
      _inputController.text = content;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Message failed to send.'), backgroundColor: AppColors.coral));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myId = _myUserId(context);
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.bg,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        title: Text('Chat', style: AppTextStyles.h2),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(0.5),
          child: Container(height: 0.5, color: AppColors.borderSubtle),
        ),
      ),
      body: Column(children: [
        Expanded(
          child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.violet, strokeWidth: 2))
            : _error != null
              ? Center(child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.wifi_off, color: AppColors.textSecondary, size: 48),
                    const SizedBox(height: 14),
                    Text(_error!, style: AppTextStyles.bodySm, textAlign: TextAlign.center),
                    const SizedBox(height: 20),
                    VylButton(label: 'Retry', onPressed: _load),
                  ]),
                ))
              : _messages.isEmpty
                ? Center(child: Text('Say hello 👋', style: AppTextStyles.bodySm))
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    itemCount: _messages.length,
                    itemBuilder: (ctx, i) {
                      final m = _messages[i];
                      final isMe = m.sender == null || m.sender!.id == myId;
                      return _MessageBubble(message: m, isMe: isMe);
                    },
                  ),
        ),
        _Composer(controller: _inputController, sending: _sending, onSend: _send),
      ]),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final MessageModel message;
  final bool isMe;
  const _MessageBubble({required this.message, required this.isMe});

  @override
  Widget build(BuildContext context) => Align(
    alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
      decoration: BoxDecoration(
        color: isMe ? AppColors.violet : AppColors.bg3,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(isMe ? 16 : 4),
          bottomRight: Radius.circular(isMe ? 4 : 16),
        ),
      ),
      child: Text(message.content, style: AppTextStyles.bodyMd.copyWith(color: isMe ? Colors.white : AppColors.textPrimary)),
    ),
  );
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  const _Composer({required this.controller, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) => Container(
    padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + MediaQuery.of(context).padding.bottom),
    decoration: const BoxDecoration(
      color: AppColors.bg,
      border: Border(top: BorderSide(color: AppColors.borderSubtle, width: 0.5)),
    ),
    child: Row(children: [
      Expanded(
        child: VylTextField(placeholder: 'Message…', controller: controller, maxLines: 4),
      ),
      const SizedBox(width: 8),
      GestureDetector(
        onTap: sending ? null : onSend,
        child: Container(
          width: 42, height: 42,
          decoration: const BoxDecoration(shape: BoxShape.circle, color: AppColors.violet),
          child: sending
            ? const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)))
            : const Icon(Icons.send, color: Colors.white, size: 18),
        ),
      ),
    ]),
  );
}
