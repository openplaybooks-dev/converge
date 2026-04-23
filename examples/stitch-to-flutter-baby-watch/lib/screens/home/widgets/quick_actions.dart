import 'package:flutter/material.dart';

class QuickActions extends StatelessWidget {
  const QuickActions({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tạm dừng thông báo',
            style: TextStyle(
              fontFamily: 'Plus Jakarta Sans',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.01,
              color: Color(0xFF1E1E1E),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tắt cảnh báo tạm thời khi bạn đang ở cùng bé.',
            style: TextStyle(
              fontFamily: 'Manrope',
              fontSize: 12,
              color: Color(0xFF5e6059),
              height: 1.6,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildMuteButton('5 phút')),
              const SizedBox(width: 12),
              Expanded(child: _buildMuteButton('10 phút')),
              const SizedBox(width: 12),
              Expanded(child: _buildMuteButton('15 phút')),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMuteButton(String label) {
    return GestureDetector(
      onTap: () => throw UnimplementedError(),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9999),
          border: Border.all(color: const Color(0xFFE7E3DC)),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D000000),
              blurRadius: 2,
              offset: Offset(0, 1),
            ),
          ],
        ),
        child: Center(
          child: Text(
            label,
            style: const TextStyle(
              fontFamily: 'Manrope',
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Color(0xFF1E1E1E),
            ),
          ),
        ),
      ),
    );
  }
}
