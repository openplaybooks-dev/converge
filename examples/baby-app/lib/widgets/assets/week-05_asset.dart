import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 5 baby size illustration showing a apple seed.
class Week05Asset extends StatelessWidget {
  const Week05Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-05.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
