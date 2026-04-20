import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 12 baby size illustration showing a plum.
class Week12Asset extends StatelessWidget {
  const Week12Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-12.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
