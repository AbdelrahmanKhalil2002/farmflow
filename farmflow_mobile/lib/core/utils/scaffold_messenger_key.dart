import 'package:flutter/material.dart';

/// Global key wired into MaterialApp.router's scaffoldMessengerKey.
/// Use this to show SnackBars from outside the widget tree (e.g. Dio interceptors).
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();
