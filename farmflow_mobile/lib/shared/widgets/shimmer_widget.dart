import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import '../../core/theme/app_colors.dart';

class ShimmerBox extends StatelessWidget {
  const ShimmerBox({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  final double width;
  final double height;
  final double borderRadius;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor:  AppColors.grey200,
      highlightColor: AppColors.grey50,
      child: Container(
        width:  width,
        height: height,
        decoration: BoxDecoration(
          color: AppColors.grey200,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),
    );
  }
}

/// Full-width shimmer card placeholder.
class ShimmerCard extends StatelessWidget {
  const ShimmerCard({super.key, this.height = 100});
  final double height;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor:      AppColors.grey200,
      highlightColor: AppColors.grey50,
      child: Container(
        width: double.infinity,
        height: height,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

/// Fills its parent container with a shimmer effect.
/// Place inside a SizedBox / ClipRRect / Container that sets the dimensions.
class ShimmerFill extends StatelessWidget {
  const ShimmerFill({super.key});

  @override
  Widget build(BuildContext context) => Shimmer.fromColors(
    baseColor:      AppColors.grey200,
    highlightColor: AppColors.grey50,
    child: Container(color: AppColors.grey200),
  );
}

/// List of shimmer cards for loading states.
class ShimmerList extends StatelessWidget {
  const ShimmerList({super.key, this.count = 5, this.cardHeight = 100});
  final int count;
  final double cardHeight;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: count,
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemBuilder: (_, __) => ShimmerCard(height: cardHeight),
    );
  }
}
