import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Week 10 baby size illustration showing a prune.
class Week10Asset extends StatelessWidget {
  const Week10Asset({
    super.key,
    this.width,
    this.height,
  });

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      'assets/illustrations/baby-sizes/week-10.svg',
      width: width ?? 200.0,
      height: height ?? 200.0,
    );
  }
}
