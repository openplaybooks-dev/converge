import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 14 baby size illustration showing a lemon.
class Week14Asset extends StatelessWidget {
  const Week14Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-14.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
