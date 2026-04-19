import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Base class for all asset widgets in the app.
/// 
/// Provides consistent sizing, theming, and accessibility support.
abstract class AssetWidget extends StatelessWidget {
  const AssetWidget({
    super.key,
    this.width,
    this.height,
    this.color,
    this.semanticLabel,
  });

  final double? width;
  final double? height;
  final Color? color;
  final String? semanticLabel;

  String get assetPath;
  
  double get defaultWidth;
  double get defaultHeight;
  
  /// Whether this asset should use color filtering (icons) or not (illustrations)
  bool get applyColorFilter => false;

  @override
  Widget build(BuildContext context) {
    final w = width ?? defaultWidth;
    final h = height ?? defaultHeight;
    
    return SvgPicture.asset(
      assetPath,
      width: w,
      height: h,
      semanticsLabel: semanticLabel,
      colorFilter: applyColorFilter && color != null
          ? ColorFilter.mode(color!, BlendMode.srcIn)
          : null,
    );
  }
}

/// Icon asset widget with color support.
abstract class IconAsset extends AssetWidget {
  const IconAsset({
    super.key,
    super.width,
    super.height,
    super.color,
    super.semanticLabel,
  });

  @override
  double get defaultWidth => 24.0;
  
  @override
  double get defaultHeight => 24.0;
  
  @override
  bool get applyColorFilter => true;
}

/// Illustration asset widget without color filtering.
abstract class IllustrationAsset extends AssetWidget {
  const IllustrationAsset({
    super.key,
    super.width,
    super.height,
    super.semanticLabel,
  });

  @override
  double get defaultWidth => 200.0;
  
  @override
  double get defaultHeight => 200.0;
  
  @override
  bool get applyColorFilter => false;
}
