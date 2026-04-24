import 'package:flutter/material.dart';

class HeroSection extends StatelessWidget {
  const HeroSection({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: const Color(0xFFD1EEDD),
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A000000),
                blurRadius: 8,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: const Icon(
            Icons.child_care,
            color: Color(0xFF4f635e),
            size: 40,
          ),
        ),
        const SizedBox(width: 24),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bé Na',
              style: TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 36,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.02,
                color: Color(0xFF31332e),
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Beacon theo dõi của bé',
              style: TextStyle(
                fontFamily: 'Manrope',
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF5e6059),
              ),
            ),
          ],
        ),
      ],
    );
  }
}