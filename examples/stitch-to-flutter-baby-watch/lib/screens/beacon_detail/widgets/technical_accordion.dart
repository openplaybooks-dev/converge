import 'package:flutter/material.dart';

class TechnicalAccordion extends StatelessWidget {
  const TechnicalAccordion({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFf5f4ee),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.symmetric(
                horizontal: 20, vertical: 12),
            leading: const Icon(Icons.settings_ethernet,
                color: Color(0xFF5e6059)),
            title: const Text(
              'Chi tiết kỹ thuật',
              style: TextStyle(
                fontFamily: 'Manrope',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF31332e),
              ),
            ),
            trailing:
                const Icon(Icons.expand_more, color: Color(0xFF5e6059)),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Mở chi tiết kỹ thuật')),
              );
            },
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Row(
              children: [
                _InfoChip(label: 'UUID', value: 'E2C4...8F91'),
                const SizedBox(width: 16),
                _InfoChip(label: 'Major', value: '10001'),
                const SizedBox(width: 16),
                _InfoChip(label: 'Minor', value: '20002'),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;

  const _InfoChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              fontFamily: 'Manrope',
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.1,
              color: Color(0xFF5e6059),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              value,
              style: const TextStyle(
                fontFamily: 'Manrope',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF31332e),
              ),
            ),
          ),
        ],
      ),
    );
  }
}