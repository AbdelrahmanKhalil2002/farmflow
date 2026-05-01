/// User model — mirrors the backend User schema.
class UserModel {
  const UserModel({
    required this.id,
    required this.name,
    required this.role,
    this.email,
    this.governorate,
    this.isActive = true,
    // Seller
    this.farmName,
    this.farmPhone,
    this.personalPhone,
    this.experience,
    this.animalTypes = const [],
    this.bio,
    this.farmDescription,
    this.farmBanner,
    this.farmCertificates = const [],
    this.averageRating = 0.0,
    this.reviewCount = 0,
    // Buyer
    this.phone,
    this.savedFarms = const [],
  });

  final String id;
  final String name;
  final String role; // 'seller' | 'buyer' | 'admin'
  final String? email;
  final String? governorate;
  final bool isActive;

  // Seller fields
  final String? farmName;
  final String? farmPhone;
  final String? personalPhone;
  final String? experience;
  final List<String> animalTypes;
  final String? bio;
  final String? farmDescription;
  final String? farmBanner;
  final List<String> farmCertificates;
  final double averageRating;
  final int reviewCount;

  // Buyer fields
  final String? phone;
  final List<String> savedFarms;

  String get displayName => farmName ?? name;

  bool get isSeller => role == 'seller';
  bool get isBuyer  => role == 'buyer';
  bool get isAdmin  => role == 'admin';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    List<String> toStrings(dynamic v) {
      if (v is List) return v.cast<String>();
      return const [];
    }

    return UserModel(
      id:               json['_id'] as String? ?? json['id'] as String? ?? '',
      name:             json['name'] as String? ?? '',
      role:             json['role'] as String? ?? 'buyer',
      email:            json['email'] as String?,
      governorate:      json['governorate'] as String?,
      isActive:         json['isActive'] as bool? ?? true,
      farmName:         json['farmName'] as String?,
      farmPhone:        json['farmPhone'] as String?,
      personalPhone:    json['personalPhone'] as String?,
      experience:       json['experience'] as String?,
      animalTypes:      toStrings(json['animalTypes']),
      bio:              json['bio'] as String?,
      farmDescription:  json['farmDescription'] as String?,
      farmBanner:       json['farmBanner'] as String?,
      farmCertificates: toStrings(json['farmCertificates']),
      averageRating:    (json['averageRating'] as num?)?.toDouble() ?? 0.0,
      reviewCount:      json['reviewCount'] as int? ?? 0,
      phone:            json['phone'] as String?,
      savedFarms:       toStrings(json['savedFarms']),
    );
  }

  Map<String, dynamic> toJson() => {
    '_id':              id,
    'name':             name,
    'role':             role,
    if (email        != null) 'email':         email,
    if (governorate  != null) 'governorate':   governorate,
    'isActive':         isActive,
    if (farmName     != null) 'farmName':      farmName,
    if (farmPhone    != null) 'farmPhone':     farmPhone,
    if (personalPhone!= null) 'personalPhone': personalPhone,
    if (experience   != null) 'experience':    experience,
    'animalTypes':      animalTypes,
    if (bio          != null) 'bio':           bio,
    if (farmDescription != null) 'farmDescription': farmDescription,
    if (farmBanner   != null) 'farmBanner':    farmBanner,
    'farmCertificates': farmCertificates,
    'averageRating':    averageRating,
    'reviewCount':      reviewCount,
    if (phone        != null) 'phone':         phone,
    'savedFarms':       savedFarms,
  };

  UserModel copyWith({
    String? id,
    String? name,
    String? role,
    String? email,
    String? governorate,
    bool? isActive,
    String? farmName,
    String? farmPhone,
    String? personalPhone,
    String? experience,
    List<String>? animalTypes,
    String? bio,
    String? farmDescription,
    String? farmBanner,
    List<String>? farmCertificates,
    double? averageRating,
    int? reviewCount,
    String? phone,
    List<String>? savedFarms,
  }) => UserModel(
    id:               id               ?? this.id,
    name:             name             ?? this.name,
    role:             role             ?? this.role,
    email:            email            ?? this.email,
    governorate:      governorate      ?? this.governorate,
    isActive:         isActive         ?? this.isActive,
    farmName:         farmName         ?? this.farmName,
    farmPhone:        farmPhone        ?? this.farmPhone,
    personalPhone:    personalPhone    ?? this.personalPhone,
    experience:       experience       ?? this.experience,
    animalTypes:      animalTypes      ?? this.animalTypes,
    bio:              bio              ?? this.bio,
    farmDescription:  farmDescription  ?? this.farmDescription,
    farmBanner:       farmBanner       ?? this.farmBanner,
    farmCertificates: farmCertificates ?? this.farmCertificates,
    averageRating:    averageRating    ?? this.averageRating,
    reviewCount:      reviewCount      ?? this.reviewCount,
    phone:            phone            ?? this.phone,
    savedFarms:       savedFarms       ?? this.savedFarms,
  );
}
