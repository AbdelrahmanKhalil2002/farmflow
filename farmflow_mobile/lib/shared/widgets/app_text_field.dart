import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/theme/app_colors.dart';

class AppTextField extends StatefulWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.hint,
    this.controller,
    this.keyboardType,
    this.textInputAction,
    this.obscureText = false,
    this.validator,
    this.onChanged,
    this.onFieldSubmitted,
    this.enabled = true,
    this.readOnly = false,
    this.maxLines = 1,
    this.minLines,
    this.prefixIcon,
    this.suffixIcon,
    this.inputFormatters,
    this.autofillHints,
    this.focusNode,
    this.textDirection,
    this.initialValue,
  });

  final String label;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final bool obscureText;
  final String? Function(String?)? validator;
  final void Function(String)? onChanged;
  final void Function(String)? onFieldSubmitted;
  final bool enabled;
  final bool readOnly;
  final int maxLines;
  final int? minLines;
  final Widget? prefixIcon;
  final Widget? suffixIcon;
  final List<TextInputFormatter>? inputFormatters;
  final Iterable<String>? autofillHints;
  final FocusNode? focusNode;
  final TextDirection? textDirection;
  final String? initialValue;

  @override
  State<AppTextField> createState() => _AppTextFieldState();
}

class _AppTextFieldState extends State<AppTextField> {
  bool _obscure = true;

  @override
  void initState() {
    super.initState();
    _obscure = widget.obscureText;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
        ),
        const SizedBox(height: 7),
        if (widget.obscureText)
          Stack(
            alignment: Alignment.centerRight,
            children: [
              TextFormField(
                controller:       widget.controller,
                keyboardType:     widget.keyboardType,
                textInputAction:  widget.textInputAction,
                obscureText:      _obscure,
                validator:        widget.validator,
                onChanged:        widget.onChanged,
                onFieldSubmitted: widget.onFieldSubmitted,
                enabled:          widget.enabled,
                maxLines:         1,
                inputFormatters:  widget.inputFormatters,
                autofillHints:    widget.autofillHints,
                focusNode:        widget.focusNode,
                initialValue:     widget.initialValue,
                style: const TextStyle(fontSize: 14, color: AppColors.text),
                decoration: InputDecoration(
                  hintText:   widget.hint,
                  prefixIcon: widget.prefixIcon,
                  contentPadding: const EdgeInsets.fromLTRB(16, 14, 48, 14),
                  enabled: widget.enabled,
                ),
              ),
              Positioned(
                right: 4,
                child: IconButton(
                  icon: Icon(
                    _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    color: AppColors.muted,
                    size: 20,
                  ),
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ],
          )
        else
          TextFormField(
            controller:       widget.controller,
            keyboardType:     widget.keyboardType,
            textInputAction:  widget.textInputAction,
            obscureText:      false,
            validator:        widget.validator,
            onChanged:        widget.onChanged,
            onFieldSubmitted: widget.onFieldSubmitted,
            enabled:          widget.enabled,
            readOnly:         widget.readOnly,
            maxLines:         widget.maxLines,
            minLines:         widget.minLines,
            inputFormatters:  widget.inputFormatters,
            autofillHints:    widget.autofillHints,
            focusNode:        widget.focusNode,
            textDirection:    widget.textDirection,
            initialValue:     widget.initialValue,
            style: const TextStyle(fontSize: 14, color: AppColors.text),
            decoration: InputDecoration(
              hintText:   widget.hint,
              prefixIcon: widget.prefixIcon,
              suffixIcon: widget.suffixIcon,
              enabled:    widget.enabled,
            ),
          ),
      ],
    );
  }
}
