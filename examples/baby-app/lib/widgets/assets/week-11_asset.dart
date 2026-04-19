import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 11 baby size illustration showing a lime.
class Week11Asset extends StatelessWidget {
  const Week11Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-11.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
