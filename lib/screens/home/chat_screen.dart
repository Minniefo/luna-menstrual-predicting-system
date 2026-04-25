import 'package:flutter/material.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../theme/app_theme.dart';
import '../../services/api_service.dart';
import '../../widgets/shared_widgets.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [
    {
      'role': 'bot',
      'text': "Hi! I'm Luna, your AI health companion. How can I help you understand your health data today?",
      'timestamp': DateTime.now(),
    }
  ];
  bool _loading = false;

  final List<String> _suggestions = [
    "Average HR this week?",
    "Is my temperature normal?",
    "Analyze my sleep patterns",
    "Where are my charts?",
  ];

  void _sendMessage(String text) async {
    if (text.trim().isEmpty || _loading) return;

    final userMsg = text.trim();
    setState(() {
      _messages.add({
        'role': 'user',
        'text': userMsg,
        'timestamp': DateTime.now(),
      });
      _loading = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      final res = await ApiService.askLuna(userMsg);
      if (res['success'] == true) {
        setState(() {
          _messages.add({
            'role': 'bot',
            'text': res['data']['reply'],
            'timestamp': DateTime.now(),
          });
        });
      } else {
        _showError(res['message'] ?? 'Unable to connect to Luna AI.');
      }
    } catch (e) {
      _showError('Connection error. Please try again.');
    } finally {
      setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOutCubic,
        );
      }
    });
  }

  void _showError(String msg) {
    setState(() {
      _messages.add({
        'role': 'bot',
        'text': "⚠️ $msg",
        'timestamp': DateTime.now(),
        'isError': true,
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: const LunaAppBar(title: 'Luna AI Assistant'),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                return _ChatBubble(
                  text: msg['text'],
                  isUser: isUser,
                  isError: msg['isError'] ?? false,
                );
              },
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: BotTypingIndicator(),
            ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_messages.length == 1 && !_loading) ...[
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _suggestions.map((s) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ActionChip(
                        label: Text(s, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                        onPressed: () => _sendMessage(s),
                        backgroundColor: AppTheme.primary.withOpacity(0.08),
                        labelStyle: const TextStyle(color: AppTheme.primary),
                        side: BorderSide.none,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                    )).toList(),
                  ),
                ),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.background,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: AppTheme.primary.withOpacity(0.1)),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: TextField(
                        controller: _controller,
                        style: AppTheme.body,
                        decoration: const InputDecoration(
                          hintText: 'Talk to Luna...',
                          border: InputBorder.none,
                          hintStyle: TextStyle(color: Colors.grey, fontSize: 14),
                        ),
                        onSubmitted: _sendMessage,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () => _sendMessage(_controller.text),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: AppTheme.primary,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send_rounded, color: Colors.white, size: 22),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final String text;
  final bool isUser;
  final bool isError;

  const _ChatBubble({
    required this.text,
    required this.isUser,
    this.isError = false,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        decoration: BoxDecoration(
          color: isUser 
              ? AppTheme.primary 
              : (isError ? Colors.red[50] : AppTheme.surface),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(20),
            topRight: const Radius.circular(20),
            bottomLeft: Radius.circular(isUser ? 20 : 0),
            bottomRight: Radius.circular(isUser ? 0 : 20),
          ),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
          ],
        ),
        child: isUser 
          ? Text(
              text,
              style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.5),
            )
          : MarkdownBody(
              data: text,
              styleSheet: MarkdownStyleSheet(
                p: AppTheme.body.copyWith(fontSize: 14, height: 1.5, color: isError ? Colors.red[900] : AppTheme.textPrimary),
                strong: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary),
                listBullet: const TextStyle(color: AppTheme.primary),
              ),
            ),
      ),
    );
  }
}

class BotTypingIndicator extends StatelessWidget {
  const BotTypingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(left: 16, bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(
              width: 12, height: 12,
              child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
            ),
            const SizedBox(width: 8),
            Text('Luna is thinking...', style: AppTheme.caption.copyWith(color: AppTheme.primary)),
          ],
        ),
      ),
    );
  }
}
