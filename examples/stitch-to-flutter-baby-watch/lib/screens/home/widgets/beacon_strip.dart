import 'package:flutter/material.dart';

class BeaconStrip extends StatelessWidget {
  const BeaconStrip({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFE7E3DC).withValues(alpha: 0.5),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            blurRadius: 2,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: Color(0xFFCDE3DC),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.sensors,
              color: Color(0xFF4f635e),
              size: 24,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bé Na',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF1E1E1E),
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Đang ở gần • 98% Pin',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF5e6059),
                      ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => throw UnimplementedError(),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Chi tiết beacon',
                  style: TextStyle(
                    fontFamily: 'Manrope',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF4f635e),
                  ),
                ),
                SizedBox(width: 4),
                Icon(
                  Icons.chevron_right,
                  size: 18,
                  color: Color(0xFF4f635e),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
