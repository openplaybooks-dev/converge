import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 3 baby size illustration showing a poppy seed.
class Week03Asset extends StatelessWidget {
  const Week03Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-03.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
