import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'FarmFlow'**
  String get appName;

  /// No description provided for @tagline.
  ///
  /// In en, this message translates to:
  /// **'Livestock Marketplace'**
  String get tagline;

  /// No description provided for @login.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get login;

  /// No description provided for @register.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get register;

  /// No description provided for @logout.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get logout;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @phone.
  ///
  /// In en, this message translates to:
  /// **'Phone Number'**
  String get phone;

  /// No description provided for @name.
  ///
  /// In en, this message translates to:
  /// **'Full Name'**
  String get name;

  /// No description provided for @farmName.
  ///
  /// In en, this message translates to:
  /// **'Farm Name'**
  String get farmName;

  /// No description provided for @nationalId.
  ///
  /// In en, this message translates to:
  /// **'National ID'**
  String get nationalId;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @delete.
  ///
  /// In en, this message translates to:
  /// **'Delete'**
  String get delete;

  /// No description provided for @confirm.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirm;

  /// No description provided for @edit.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get edit;

  /// No description provided for @add.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get add;

  /// No description provided for @search.
  ///
  /// In en, this message translates to:
  /// **'Search'**
  String get search;

  /// No description provided for @filter.
  ///
  /// In en, this message translates to:
  /// **'Filter'**
  String get filter;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @loading.
  ///
  /// In en, this message translates to:
  /// **'Loading…'**
  String get loading;

  /// No description provided for @errorOccurred.
  ///
  /// In en, this message translates to:
  /// **'An error occurred. Please try again.'**
  String get errorOccurred;

  /// No description provided for @noInternet.
  ///
  /// In en, this message translates to:
  /// **'Connection failed. Check your network.'**
  String get noInternet;

  /// No description provided for @unexpectedError.
  ///
  /// In en, this message translates to:
  /// **'An unexpected error occurred'**
  String get unexpectedError;

  /// No description provided for @fieldRequired.
  ///
  /// In en, this message translates to:
  /// **'This field is required'**
  String get fieldRequired;

  /// No description provided for @allFields.
  ///
  /// In en, this message translates to:
  /// **'Please fill in all required fields'**
  String get allFields;

  /// No description provided for @yes.
  ///
  /// In en, this message translates to:
  /// **'Yes'**
  String get yes;

  /// No description provided for @no.
  ///
  /// In en, this message translates to:
  /// **'No'**
  String get no;

  /// No description provided for @ok.
  ///
  /// In en, this message translates to:
  /// **'OK'**
  String get ok;

  /// No description provided for @viewAll.
  ///
  /// In en, this message translates to:
  /// **'View All'**
  String get viewAll;

  /// No description provided for @apply.
  ///
  /// In en, this message translates to:
  /// **'Apply'**
  String get apply;

  /// No description provided for @saveChanges.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get saveChanges;

  /// No description provided for @close.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get close;

  /// No description provided for @farms.
  ///
  /// In en, this message translates to:
  /// **'Farms'**
  String get farms;

  /// No description provided for @myOrders.
  ///
  /// In en, this message translates to:
  /// **'My Orders'**
  String get myOrders;

  /// No description provided for @favorites.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get favorites;

  /// No description provided for @myAccount.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get myAccount;

  /// No description provided for @dashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get dashboard;

  /// No description provided for @herd.
  ///
  /// In en, this message translates to:
  /// **'Herd'**
  String get herd;

  /// No description provided for @listings.
  ///
  /// In en, this message translates to:
  /// **'My Listings'**
  String get listings;

  /// No description provided for @statements.
  ///
  /// In en, this message translates to:
  /// **'Statements'**
  String get statements;

  /// No description provided for @addAnimal.
  ///
  /// In en, this message translates to:
  /// **'Add Animal'**
  String get addAnimal;

  /// No description provided for @addListing.
  ///
  /// In en, this message translates to:
  /// **'Add Listing'**
  String get addListing;

  /// No description provided for @seller.
  ///
  /// In en, this message translates to:
  /// **'Seller'**
  String get seller;

  /// No description provided for @buyer.
  ///
  /// In en, this message translates to:
  /// **'Buyer'**
  String get buyer;

  /// No description provided for @admin.
  ///
  /// In en, this message translates to:
  /// **'Admin'**
  String get admin;

  /// No description provided for @loginTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginTitle;

  /// No description provided for @loginWelcome.
  ///
  /// In en, this message translates to:
  /// **'Welcome to FarmFlow'**
  String get loginWelcome;

  /// No description provided for @loginIdHint.
  ///
  /// In en, this message translates to:
  /// **'Enter your phone or email'**
  String get loginIdHint;

  /// No description provided for @loginIdLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone or Email'**
  String get loginIdLabel;

  /// No description provided for @loginPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get loginPasswordLabel;

  /// No description provided for @loginButton.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginButton;

  /// No description provided for @loginNoAccount.
  ///
  /// In en, this message translates to:
  /// **'Don\'t have an account?'**
  String get loginNoAccount;

  /// No description provided for @loginRegisterLink.
  ///
  /// In en, this message translates to:
  /// **'Register Now'**
  String get loginRegisterLink;

  /// No description provided for @loginPasswordRequired.
  ///
  /// In en, this message translates to:
  /// **'Please enter your password'**
  String get loginPasswordRequired;

  /// No description provided for @registerTitle.
  ///
  /// In en, this message translates to:
  /// **'Create New Account'**
  String get registerTitle;

  /// No description provided for @registerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Choose your account type to get started'**
  String get registerSubtitle;

  /// No description provided for @registerNow.
  ///
  /// In en, this message translates to:
  /// **'Register'**
  String get registerNow;

  /// No description provided for @sellerRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Farmer / Seller'**
  String get sellerRoleTitle;

  /// No description provided for @sellerRoleSubtitle.
  ///
  /// In en, this message translates to:
  /// **'List your livestock and products, manage your herd'**
  String get sellerRoleSubtitle;

  /// No description provided for @buyerRoleTitle.
  ///
  /// In en, this message translates to:
  /// **'Buyer'**
  String get buyerRoleTitle;

  /// No description provided for @buyerRoleSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Browse farms and buy livestock and fresh products'**
  String get buyerRoleSubtitle;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account?'**
  String get alreadyHaveAccount;

  /// No description provided for @loginLink.
  ///
  /// In en, this message translates to:
  /// **'Sign In'**
  String get loginLink;

  /// No description provided for @buyerRegisterTitle.
  ///
  /// In en, this message translates to:
  /// **'Buyer Registration'**
  String get buyerRegisterTitle;

  /// No description provided for @sellerRegisterTitle.
  ///
  /// In en, this message translates to:
  /// **'Farmer Registration'**
  String get sellerRegisterTitle;

  /// No description provided for @fullName.
  ///
  /// In en, this message translates to:
  /// **'Full Name'**
  String get fullName;

  /// No description provided for @fullNameHint.
  ///
  /// In en, this message translates to:
  /// **'Your full name'**
  String get fullNameHint;

  /// No description provided for @nameRequired.
  ///
  /// In en, this message translates to:
  /// **'Name is required'**
  String get nameRequired;

  /// No description provided for @emailLabel.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailLabel;

  /// No description provided for @emailRequired.
  ///
  /// In en, this message translates to:
  /// **'Email is required'**
  String get emailRequired;

  /// No description provided for @emailInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid email address'**
  String get emailInvalid;

  /// No description provided for @phoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Phone Number'**
  String get phoneLabel;

  /// No description provided for @phoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid phone number'**
  String get phoneInvalid;

  /// No description provided for @nationalIdLabel.
  ///
  /// In en, this message translates to:
  /// **'National ID'**
  String get nationalIdLabel;

  /// No description provided for @nationalIdHint.
  ///
  /// In en, this message translates to:
  /// **'14 digits'**
  String get nationalIdHint;

  /// No description provided for @nationalIdInvalid.
  ///
  /// In en, this message translates to:
  /// **'ID must be 14 digits'**
  String get nationalIdInvalid;

  /// No description provided for @nationalIdError.
  ///
  /// In en, this message translates to:
  /// **'Invalid national ID'**
  String get nationalIdError;

  /// No description provided for @nationalIdVerified.
  ///
  /// In en, this message translates to:
  /// **'ID Verified'**
  String get nationalIdVerified;

  /// No description provided for @birthDate.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth'**
  String get birthDate;

  /// No description provided for @age.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get age;

  /// No description provided for @governorate.
  ///
  /// In en, this message translates to:
  /// **'Governorate'**
  String get governorate;

  /// No description provided for @gender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get gender;

  /// No description provided for @passwordLabel.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordLabel;

  /// No description provided for @passwordHint.
  ///
  /// In en, this message translates to:
  /// **'At least 8 characters'**
  String get passwordHint;

  /// No description provided for @passwordTooShort.
  ///
  /// In en, this message translates to:
  /// **'Password is too short'**
  String get passwordTooShort;

  /// No description provided for @confirmPasswordLabel.
  ///
  /// In en, this message translates to:
  /// **'Confirm Password'**
  String get confirmPasswordLabel;

  /// No description provided for @confirmPasswordHint.
  ///
  /// In en, this message translates to:
  /// **'Re-enter your password'**
  String get confirmPasswordHint;

  /// No description provided for @passwordMismatch.
  ///
  /// In en, this message translates to:
  /// **'Passwords do not match'**
  String get passwordMismatch;

  /// No description provided for @createAccountButton.
  ///
  /// In en, this message translates to:
  /// **'Create Account'**
  String get createAccountButton;

  /// No description provided for @personalData.
  ///
  /// In en, this message translates to:
  /// **'Personal Information'**
  String get personalData;

  /// No description provided for @farmData.
  ///
  /// In en, this message translates to:
  /// **'Farm Information'**
  String get farmData;

  /// No description provided for @passwordSection.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get passwordSection;

  /// No description provided for @farmPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Farm Phone'**
  String get farmPhoneLabel;

  /// No description provided for @farmPhoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid farm phone number'**
  String get farmPhoneInvalid;

  /// No description provided for @personalPhoneLabel.
  ///
  /// In en, this message translates to:
  /// **'Personal Phone'**
  String get personalPhoneLabel;

  /// No description provided for @personalPhoneInvalid.
  ///
  /// In en, this message translates to:
  /// **'Invalid personal phone number'**
  String get personalPhoneInvalid;

  /// No description provided for @emailOptional.
  ///
  /// In en, this message translates to:
  /// **'Email (optional)'**
  String get emailOptional;

  /// No description provided for @farmNameRequired.
  ///
  /// In en, this message translates to:
  /// **'Farm name is required'**
  String get farmNameRequired;

  /// No description provided for @farmNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Al-Kheir Farm'**
  String get farmNameHint;

  /// No description provided for @noFarms.
  ///
  /// In en, this message translates to:
  /// **'No farms found'**
  String get noFarms;

  /// No description provided for @noFarmsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Try adjusting the search or filter'**
  String get noFarmsSubtitle;

  /// No description provided for @loadingFarmsFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load farms'**
  String get loadingFarmsFailed;

  /// No description provided for @loadingFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadingFailed;

  /// No description provided for @loadMore.
  ///
  /// In en, this message translates to:
  /// **'Load More'**
  String get loadMore;

  /// No description provided for @searchHint.
  ///
  /// In en, this message translates to:
  /// **'Search for a farm or governorate...'**
  String get searchHint;

  /// No description provided for @filterFarms.
  ///
  /// In en, this message translates to:
  /// **'Filter Farms'**
  String get filterFarms;

  /// No description provided for @allFilter.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get allFilter;

  /// No description provided for @livestockType.
  ///
  /// In en, this message translates to:
  /// **'Livestock Type'**
  String get livestockType;

  /// No description provided for @clearFilter.
  ///
  /// In en, this message translates to:
  /// **'Clear Filter'**
  String get clearFilter;

  /// No description provided for @newBadge.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newBadge;

  /// No description provided for @deliveryAvailable.
  ///
  /// In en, this message translates to:
  /// **'Delivery Available'**
  String get deliveryAvailable;

  /// No description provided for @tabFarms.
  ///
  /// In en, this message translates to:
  /// **'Farms'**
  String get tabFarms;

  /// No description provided for @tabEid.
  ///
  /// In en, this message translates to:
  /// **'Eid Offers'**
  String get tabEid;

  /// No description provided for @tabSupplies.
  ///
  /// In en, this message translates to:
  /// **'Supplies'**
  String get tabSupplies;

  /// No description provided for @noEidOffers.
  ///
  /// In en, this message translates to:
  /// **'No Eid offers currently'**
  String get noEidOffers;

  /// No description provided for @noEidOffersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Follow farms for the latest offers'**
  String get noEidOffersSubtitle;

  /// No description provided for @noSupplies.
  ///
  /// In en, this message translates to:
  /// **'No supplies available'**
  String get noSupplies;

  /// No description provided for @noSuppliesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Check back later for feed and equipment offers'**
  String get noSuppliesSubtitle;

  /// No description provided for @loadingSuppliesFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load supplies'**
  String get loadingSuppliesFailed;

  /// No description provided for @farmDetailLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get farmDetailLoadFailed;

  /// No description provided for @tabLivestock.
  ///
  /// In en, this message translates to:
  /// **'Livestock'**
  String get tabLivestock;

  /// No description provided for @tabDairy.
  ///
  /// In en, this message translates to:
  /// **'Dairy'**
  String get tabDairy;

  /// No description provided for @tabSuppliesLabel.
  ///
  /// In en, this message translates to:
  /// **'Supplies'**
  String get tabSuppliesLabel;

  /// No description provided for @tabReviews.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get tabReviews;

  /// No description provided for @noLivestockForSale.
  ///
  /// In en, this message translates to:
  /// **'No livestock for sale currently'**
  String get noLivestockForSale;

  /// No description provided for @noDairyProducts.
  ///
  /// In en, this message translates to:
  /// **'No dairy products available'**
  String get noDairyProducts;

  /// No description provided for @noSuppliesAvailable.
  ///
  /// In en, this message translates to:
  /// **'No supplies available'**
  String get noSuppliesAvailable;

  /// No description provided for @noReviewsYet.
  ///
  /// In en, this message translates to:
  /// **'No reviews yet'**
  String get noReviewsYet;

  /// No description provided for @noReviewsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Be the first to review this farm'**
  String get noReviewsSubtitle;

  /// No description provided for @writeReview.
  ///
  /// In en, this message translates to:
  /// **'Write a Review'**
  String get writeReview;

  /// No description provided for @rateThisFarm.
  ///
  /// In en, this message translates to:
  /// **'Rate This Farm'**
  String get rateThisFarm;

  /// No description provided for @reviewComment.
  ///
  /// In en, this message translates to:
  /// **'Your comment (optional)...'**
  String get reviewComment;

  /// No description provided for @submitReview.
  ///
  /// In en, this message translates to:
  /// **'Submit Review'**
  String get submitReview;

  /// No description provided for @reviewFailed.
  ///
  /// In en, this message translates to:
  /// **'Could not submit review. Please complete a previous order with this farm.'**
  String get reviewFailed;

  /// No description provided for @reviewCount.
  ///
  /// In en, this message translates to:
  /// **'{count} reviews'**
  String reviewCount(int count);

  /// No description provided for @personalPhone.
  ///
  /// In en, this message translates to:
  /// **'Personal phone: {phone}'**
  String personalPhone(String phone);

  /// No description provided for @loadReviewsFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load reviews'**
  String get loadReviewsFailed;

  /// No description provided for @unknown.
  ///
  /// In en, this message translates to:
  /// **'Unknown'**
  String get unknown;

  /// No description provided for @viewFarm.
  ///
  /// In en, this message translates to:
  /// **'View Farm'**
  String get viewFarm;

  /// No description provided for @listingSpecs.
  ///
  /// In en, this message translates to:
  /// **'Specifications'**
  String get listingSpecs;

  /// No description provided for @weightKg.
  ///
  /// In en, this message translates to:
  /// **'{weight} kg'**
  String weightKg(String weight);

  /// No description provided for @priceEgp.
  ///
  /// In en, this message translates to:
  /// **'{price} EGP'**
  String priceEgp(String price);

  /// No description provided for @pricePerKg.
  ///
  /// In en, this message translates to:
  /// **'({price} EGP / kg)'**
  String pricePerKg(String price);

  /// No description provided for @deliveryCost.
  ///
  /// In en, this message translates to:
  /// **'Delivery cost: {cost} EGP'**
  String deliveryCost(String cost);

  /// No description provided for @slaughterAvailable.
  ///
  /// In en, this message translates to:
  /// **'Slaughter service available'**
  String get slaughterAvailable;

  /// No description provided for @slaughterCost.
  ///
  /// In en, this message translates to:
  /// **'Slaughter cost: {cost} EGP'**
  String slaughterCost(String cost);

  /// No description provided for @eidAvailable.
  ///
  /// In en, this message translates to:
  /// **'Available for Eid'**
  String get eidAvailable;

  /// No description provided for @orderNow.
  ///
  /// In en, this message translates to:
  /// **'Order Now'**
  String get orderNow;

  /// No description provided for @confirmOrder.
  ///
  /// In en, this message translates to:
  /// **'Confirm Order'**
  String get confirmOrder;

  /// No description provided for @paymentMethod.
  ///
  /// In en, this message translates to:
  /// **'Payment Method'**
  String get paymentMethod;

  /// No description provided for @cashOnDelivery.
  ///
  /// In en, this message translates to:
  /// **'Cash on Delivery'**
  String get cashOnDelivery;

  /// No description provided for @additionalNotes.
  ///
  /// In en, this message translates to:
  /// **'Additional notes (optional)'**
  String get additionalNotes;

  /// No description provided for @confirmOrderButton.
  ///
  /// In en, this message translates to:
  /// **'Confirm Order'**
  String get confirmOrderButton;

  /// No description provided for @orderSentSuccess.
  ///
  /// In en, this message translates to:
  /// **'Your order has been sent successfully!'**
  String get orderSentSuccess;

  /// No description provided for @descriptionTitle.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get descriptionTitle;

  /// No description provided for @weight.
  ///
  /// In en, this message translates to:
  /// **'Weight'**
  String get weight;

  /// No description provided for @ageLabel.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get ageLabel;

  /// No description provided for @location.
  ///
  /// In en, this message translates to:
  /// **'Location'**
  String get location;

  /// No description provided for @deliveryFarmOnly.
  ///
  /// In en, this message translates to:
  /// **'Farm pickup only'**
  String get deliveryFarmOnly;

  /// No description provided for @deliveryByFarm.
  ///
  /// In en, this message translates to:
  /// **'Farm delivery'**
  String get deliveryByFarm;

  /// No description provided for @deliveryByAdmin.
  ///
  /// In en, this message translates to:
  /// **'Delivery via FarmFlow'**
  String get deliveryByAdmin;

  /// No description provided for @favoritesTitle.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get favoritesTitle;

  /// No description provided for @noFavorites.
  ///
  /// In en, this message translates to:
  /// **'No favorite farms'**
  String get noFavorites;

  /// No description provided for @noFavoritesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap the heart on any farm to add it here'**
  String get noFavoritesSubtitle;

  /// No description provided for @loadFavoritesFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadFavoritesFailed;

  /// No description provided for @notificationsTitle.
  ///
  /// In en, this message translates to:
  /// **'Notifications'**
  String get notificationsTitle;

  /// No description provided for @markAllRead.
  ///
  /// In en, this message translates to:
  /// **'Mark all read'**
  String get markAllRead;

  /// No description provided for @noNotifications.
  ///
  /// In en, this message translates to:
  /// **'No notifications'**
  String get noNotifications;

  /// No description provided for @noNotificationsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Order and farm notifications will appear here'**
  String get noNotificationsSubtitle;

  /// No description provided for @loadNotificationsFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load notifications'**
  String get loadNotificationsFailed;

  /// No description provided for @ordersTitle.
  ///
  /// In en, this message translates to:
  /// **'My Orders'**
  String get ordersTitle;

  /// No description provided for @noOrders.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get noOrders;

  /// No description provided for @noOrdersSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Browse farms and place your first order'**
  String get noOrdersSubtitle;

  /// No description provided for @loadOrdersFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load orders'**
  String get loadOrdersFailed;

  /// No description provided for @orderDetails.
  ///
  /// In en, this message translates to:
  /// **'Order Details'**
  String get orderDetails;

  /// No description provided for @orderNumber.
  ///
  /// In en, this message translates to:
  /// **'Order Number'**
  String get orderNumber;

  /// No description provided for @orderStatus.
  ///
  /// In en, this message translates to:
  /// **'Status'**
  String get orderStatus;

  /// No description provided for @farmLabel.
  ///
  /// In en, this message translates to:
  /// **'Farm'**
  String get farmLabel;

  /// No description provided for @paymentMethodLabel.
  ///
  /// In en, this message translates to:
  /// **'Payment Method'**
  String get paymentMethodLabel;

  /// No description provided for @total.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get total;

  /// No description provided for @deliveryCostLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get deliveryCostLabel;

  /// No description provided for @shippingStatus.
  ///
  /// In en, this message translates to:
  /// **'Shipping Status'**
  String get shippingStatus;

  /// No description provided for @notesLabel.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notesLabel;

  /// No description provided for @dateLabel.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get dateLabel;

  /// No description provided for @unknownFarm.
  ///
  /// In en, this message translates to:
  /// **'Unknown farm'**
  String get unknownFarm;

  /// No description provided for @orderPrefix.
  ///
  /// In en, this message translates to:
  /// **'Order #'**
  String get orderPrefix;

  /// No description provided for @profileTitle.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get profileTitle;

  /// No description provided for @myData.
  ///
  /// In en, this message translates to:
  /// **'My Data'**
  String get myData;

  /// No description provided for @emailField.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get emailField;

  /// No description provided for @phoneField.
  ///
  /// In en, this message translates to:
  /// **'Phone'**
  String get phoneField;

  /// No description provided for @governorateField.
  ///
  /// In en, this message translates to:
  /// **'Governorate'**
  String get governorateField;

  /// No description provided for @editProfile.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get editProfile;

  /// No description provided for @changePassword.
  ///
  /// In en, this message translates to:
  /// **'Change Password'**
  String get changePassword;

  /// No description provided for @logoutButton.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get logoutButton;

  /// No description provided for @logoutConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get logoutConfirmTitle;

  /// No description provided for @logoutConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to sign out?'**
  String get logoutConfirmMessage;

  /// No description provided for @logoutConfirmButton.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get logoutConfirmButton;

  /// No description provided for @editProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Profile'**
  String get editProfileTitle;

  /// No description provided for @namePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'Your full name'**
  String get namePlaceholder;

  /// No description provided for @phonePlaceholder.
  ///
  /// In en, this message translates to:
  /// **'01XXXXXXXXX'**
  String get phonePlaceholder;

  /// No description provided for @updateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update. Please try again.'**
  String get updateFailed;

  /// No description provided for @changePasswordTitle.
  ///
  /// In en, this message translates to:
  /// **'Change Password'**
  String get changePasswordTitle;

  /// No description provided for @currentPassword.
  ///
  /// In en, this message translates to:
  /// **'Current Password'**
  String get currentPassword;

  /// No description provided for @newPassword.
  ///
  /// In en, this message translates to:
  /// **'New Password'**
  String get newPassword;

  /// No description provided for @confirmNewPassword.
  ///
  /// In en, this message translates to:
  /// **'Confirm New Password'**
  String get confirmNewPassword;

  /// No description provided for @fillAllFields.
  ///
  /// In en, this message translates to:
  /// **'Please fill in all fields'**
  String get fillAllFields;

  /// No description provided for @newPasswordMismatch.
  ///
  /// In en, this message translates to:
  /// **'New passwords do not match'**
  String get newPasswordMismatch;

  /// No description provided for @passwordMinLength.
  ///
  /// In en, this message translates to:
  /// **'Password must be at least 6 characters'**
  String get passwordMinLength;

  /// No description provided for @currentPasswordWrong.
  ///
  /// In en, this message translates to:
  /// **'Current password is incorrect'**
  String get currentPasswordWrong;

  /// No description provided for @passwordChangedSuccess.
  ///
  /// In en, this message translates to:
  /// **'Password changed successfully'**
  String get passwordChangedSuccess;

  /// No description provided for @nameRequired2.
  ///
  /// In en, this message translates to:
  /// **'Name is required'**
  String get nameRequired2;

  /// No description provided for @sellerDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get sellerDashboardTitle;

  /// No description provided for @dashboardGreeting.
  ///
  /// In en, this message translates to:
  /// **'Hello, {name}'**
  String dashboardGreeting(String name);

  /// No description provided for @quickAddTitle.
  ///
  /// In en, this message translates to:
  /// **'Add New'**
  String get quickAddTitle;

  /// No description provided for @quickAddExpense.
  ///
  /// In en, this message translates to:
  /// **'Expense'**
  String get quickAddExpense;

  /// No description provided for @quickAddIncome.
  ///
  /// In en, this message translates to:
  /// **'Income'**
  String get quickAddIncome;

  /// No description provided for @quickAddAnimal.
  ///
  /// In en, this message translates to:
  /// **'Animal'**
  String get quickAddAnimal;

  /// No description provided for @quickAddListing.
  ///
  /// In en, this message translates to:
  /// **'Listing'**
  String get quickAddListing;

  /// No description provided for @quickAddDairy.
  ///
  /// In en, this message translates to:
  /// **'Dairy Product'**
  String get quickAddDairy;

  /// No description provided for @quickAddSupply.
  ///
  /// In en, this message translates to:
  /// **'Supply'**
  String get quickAddSupply;

  /// No description provided for @addButton.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addButton;

  /// No description provided for @kpiRevenue.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get kpiRevenue;

  /// No description provided for @kpiExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get kpiExpenses;

  /// No description provided for @kpiNetProfit.
  ///
  /// In en, this message translates to:
  /// **'Net Profit'**
  String get kpiNetProfit;

  /// No description provided for @quickAccessDairy.
  ///
  /// In en, this message translates to:
  /// **'Dairy'**
  String get quickAccessDairy;

  /// No description provided for @quickAccessSupplies.
  ///
  /// In en, this message translates to:
  /// **'Supplies'**
  String get quickAccessSupplies;

  /// No description provided for @quickAccessVet.
  ///
  /// In en, this message translates to:
  /// **'Veterinary'**
  String get quickAccessVet;

  /// No description provided for @medicalFollowUps.
  ///
  /// In en, this message translates to:
  /// **'Medical Follow-ups ({count})'**
  String medicalFollowUps(int count);

  /// No description provided for @recentOrders.
  ///
  /// In en, this message translates to:
  /// **'Recent Orders'**
  String get recentOrders;

  /// No description provided for @noOrdersYet.
  ///
  /// In en, this message translates to:
  /// **'No orders yet'**
  String get noOrdersYet;

  /// No description provided for @dairyTitle.
  ///
  /// In en, this message translates to:
  /// **'My Dairy Products'**
  String get dairyTitle;

  /// No description provided for @addDairyProduct.
  ///
  /// In en, this message translates to:
  /// **'Add Product'**
  String get addDairyProduct;

  /// No description provided for @noDairyProducts2.
  ///
  /// In en, this message translates to:
  /// **'No dairy products'**
  String get noDairyProducts2;

  /// No description provided for @addFirstDairy.
  ///
  /// In en, this message translates to:
  /// **'Add your first product'**
  String get addFirstDairy;

  /// No description provided for @loadDairyFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadDairyFailed;

  /// No description provided for @addDairyTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Dairy Product'**
  String get addDairyTitle;

  /// No description provided for @editDairyTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Product'**
  String get editDairyTitle;

  /// No description provided for @dairyType.
  ///
  /// In en, this message translates to:
  /// **'Type'**
  String get dairyType;

  /// No description provided for @dairyProductName.
  ///
  /// In en, this message translates to:
  /// **'Product Name'**
  String get dairyProductName;

  /// No description provided for @dairyProductNameHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Fresh cow milk'**
  String get dairyProductNameHint;

  /// No description provided for @dairyQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get dairyQuantity;

  /// No description provided for @dairyUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get dairyUnit;

  /// No description provided for @dairyPricePerUnit.
  ///
  /// In en, this message translates to:
  /// **'Price per unit (EGP)'**
  String get dairyPricePerUnit;

  /// No description provided for @dairyDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery available'**
  String get dairyDelivery;

  /// No description provided for @addDairyButton.
  ///
  /// In en, this message translates to:
  /// **'Add Product'**
  String get addDairyButton;

  /// No description provided for @saveDairyButton.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get saveDairyButton;

  /// No description provided for @dairyAddFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add product. Please try again.'**
  String get dairyAddFailed;

  /// No description provided for @dairyUpdateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update. Please try again.'**
  String get dairyUpdateFailed;

  /// No description provided for @deleteDairyTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Product'**
  String get deleteDairyTitle;

  /// No description provided for @deleteDairyMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete \"{name}\"?'**
  String deleteDairyMessage(String name);

  /// No description provided for @expiresOn.
  ///
  /// In en, this message translates to:
  /// **'Expires {date}'**
  String expiresOn(String date);

  /// No description provided for @statementsTitle.
  ///
  /// In en, this message translates to:
  /// **'Accounts'**
  String get statementsTitle;

  /// No description provided for @tabSummary.
  ///
  /// In en, this message translates to:
  /// **'Summary'**
  String get tabSummary;

  /// No description provided for @tabExpenses.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get tabExpenses;

  /// No description provided for @tabIncome.
  ///
  /// In en, this message translates to:
  /// **'Income'**
  String get tabIncome;

  /// No description provided for @tabBudget.
  ///
  /// In en, this message translates to:
  /// **'Budget'**
  String get tabBudget;

  /// No description provided for @exportCsv.
  ///
  /// In en, this message translates to:
  /// **'Export CSV'**
  String get exportCsv;

  /// No description provided for @exportPdf.
  ///
  /// In en, this message translates to:
  /// **'Export PDF'**
  String get exportPdf;

  /// No description provided for @last6Months.
  ///
  /// In en, this message translates to:
  /// **'Last 6 Months'**
  String get last6Months;

  /// No description provided for @incomeLabel.
  ///
  /// In en, this message translates to:
  /// **'Revenue'**
  String get incomeLabel;

  /// No description provided for @expensesLabel.
  ///
  /// In en, this message translates to:
  /// **'Expenses'**
  String get expensesLabel;

  /// No description provided for @netProfitLabel.
  ///
  /// In en, this message translates to:
  /// **'Net Profit'**
  String get netProfitLabel;

  /// No description provided for @expensesBreakdown.
  ///
  /// In en, this message translates to:
  /// **'Expenses Breakdown'**
  String get expensesBreakdown;

  /// No description provided for @recentExpenses.
  ///
  /// In en, this message translates to:
  /// **'Recent Expenses'**
  String get recentExpenses;

  /// No description provided for @recentIncome.
  ///
  /// In en, this message translates to:
  /// **'Recent Income'**
  String get recentIncome;

  /// No description provided for @totalIncome.
  ///
  /// In en, this message translates to:
  /// **'Total Revenue'**
  String get totalIncome;

  /// No description provided for @noExpenses.
  ///
  /// In en, this message translates to:
  /// **'No recorded expenses'**
  String get noExpenses;

  /// No description provided for @noExpensesSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap + to record the first expense'**
  String get noExpensesSubtitle;

  /// No description provided for @noIncome.
  ///
  /// In en, this message translates to:
  /// **'No recorded income'**
  String get noIncome;

  /// No description provided for @noIncomeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Tap + to record the first income'**
  String get noIncomeSubtitle;

  /// No description provided for @loadExpensesFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load expenses'**
  String get loadExpensesFailed;

  /// No description provided for @loadIncomeFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load income'**
  String get loadIncomeFailed;

  /// No description provided for @addExpenseTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Expense'**
  String get addExpenseTitle;

  /// No description provided for @addIncomeTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Income'**
  String get addIncomeTitle;

  /// No description provided for @addFinanceTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Financial Entry'**
  String get addFinanceTitle;

  /// No description provided for @amountLabel.
  ///
  /// In en, this message translates to:
  /// **'Amount (EGP)'**
  String get amountLabel;

  /// No description provided for @categoryLabel.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get categoryLabel;

  /// No description provided for @dateLabel2.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get dateLabel2;

  /// No description provided for @noteOptional.
  ///
  /// In en, this message translates to:
  /// **'Note (optional)'**
  String get noteOptional;

  /// No description provided for @noteHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Wheat feed for cattle'**
  String get noteHint;

  /// No description provided for @submitExpense.
  ///
  /// In en, this message translates to:
  /// **'Record Expense'**
  String get submitExpense;

  /// No description provided for @submitIncome.
  ///
  /// In en, this message translates to:
  /// **'Record Income'**
  String get submitIncome;

  /// No description provided for @amountInvalid.
  ///
  /// In en, this message translates to:
  /// **'Please enter a valid amount'**
  String get amountInvalid;

  /// No description provided for @addExpenseFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add expense. Please try again.'**
  String get addExpenseFailed;

  /// No description provided for @addIncomeFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add income. Please try again.'**
  String get addIncomeFailed;

  /// No description provided for @budgetLabel.
  ///
  /// In en, this message translates to:
  /// **'Budget'**
  String get budgetLabel;

  /// No description provided for @actualSpending.
  ///
  /// In en, this message translates to:
  /// **'Actual Spending'**
  String get actualSpending;

  /// No description provided for @totalBudget.
  ///
  /// In en, this message translates to:
  /// **'Total Budget'**
  String get totalBudget;

  /// No description provided for @notSet.
  ///
  /// In en, this message translates to:
  /// **'Not Set'**
  String get notSet;

  /// No description provided for @noSpending.
  ///
  /// In en, this message translates to:
  /// **'No spending'**
  String get noSpending;

  /// No description provided for @budgetExceeded.
  ///
  /// In en, this message translates to:
  /// **'Exceeded'**
  String get budgetExceeded;

  /// No description provided for @budgetExceededBy.
  ///
  /// In en, this message translates to:
  /// **'Budget exceeded by {amount} EGP'**
  String budgetExceededBy(String amount);

  /// No description provided for @remaining.
  ///
  /// In en, this message translates to:
  /// **'Remaining: {amount} EGP'**
  String remaining(String amount);

  /// No description provided for @noTarget.
  ///
  /// In en, this message translates to:
  /// **'No target'**
  String get noTarget;

  /// No description provided for @budgetFor.
  ///
  /// In en, this message translates to:
  /// **'Budget — {monthName}'**
  String budgetFor(String monthName);

  /// No description provided for @editBudgetTitle.
  ///
  /// In en, this message translates to:
  /// **'Budget: {category}'**
  String editBudgetTitle(String category);

  /// No description provided for @herdTitle.
  ///
  /// In en, this message translates to:
  /// **'Herd Management'**
  String get herdTitle;

  /// No description provided for @addAnimalTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Animal'**
  String get addAnimalTitle;

  /// No description provided for @editAnimalTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Animal'**
  String get editAnimalTitle;

  /// No description provided for @animalType.
  ///
  /// In en, this message translates to:
  /// **'Animal Type'**
  String get animalType;

  /// No description provided for @animalGender.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get animalGender;

  /// No description provided for @male.
  ///
  /// In en, this message translates to:
  /// **'Male'**
  String get male;

  /// No description provided for @female.
  ///
  /// In en, this message translates to:
  /// **'Female'**
  String get female;

  /// No description provided for @tagId.
  ///
  /// In en, this message translates to:
  /// **'Tag Number'**
  String get tagId;

  /// No description provided for @tagIdRequired.
  ///
  /// In en, this message translates to:
  /// **'Tag number is required'**
  String get tagIdRequired;

  /// No description provided for @tagIdHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. A-001'**
  String get tagIdHint;

  /// No description provided for @breed.
  ///
  /// In en, this message translates to:
  /// **'Breed'**
  String get breed;

  /// No description provided for @breedHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Friesian, Local...'**
  String get breedHint;

  /// No description provided for @birthDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth'**
  String get birthDateLabel;

  /// No description provided for @birthDateRequired.
  ///
  /// In en, this message translates to:
  /// **'Date of birth is required'**
  String get birthDateRequired;

  /// No description provided for @chooseBirthDate.
  ///
  /// In en, this message translates to:
  /// **'Choose date of birth'**
  String get chooseBirthDate;

  /// No description provided for @currentWeight.
  ///
  /// In en, this message translates to:
  /// **'Current Weight (kg)'**
  String get currentWeight;

  /// No description provided for @colorLabel.
  ///
  /// In en, this message translates to:
  /// **'Color'**
  String get colorLabel;

  /// No description provided for @colorHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Black and white'**
  String get colorHint;

  /// No description provided for @notesLabel2.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notesLabel2;

  /// No description provided for @notesHint.
  ///
  /// In en, this message translates to:
  /// **'Any additional information...'**
  String get notesHint;

  /// No description provided for @pregnancyStatus.
  ///
  /// In en, this message translates to:
  /// **'Pregnancy Status'**
  String get pregnancyStatus;

  /// No description provided for @noPregnancy.
  ///
  /// In en, this message translates to:
  /// **'Not pregnant'**
  String get noPregnancy;

  /// No description provided for @pregnant.
  ///
  /// In en, this message translates to:
  /// **'Pregnant'**
  String get pregnant;

  /// No description provided for @recentlyGaveBirth.
  ///
  /// In en, this message translates to:
  /// **'Recently gave birth'**
  String get recentlyGaveBirth;

  /// No description provided for @expectedBirthDate.
  ///
  /// In en, this message translates to:
  /// **'Expected birth date (optional)'**
  String get expectedBirthDate;

  /// No description provided for @chooseBirthDate2.
  ///
  /// In en, this message translates to:
  /// **'Choose date'**
  String get chooseBirthDate2;

  /// No description provided for @animalPhotos.
  ///
  /// In en, this message translates to:
  /// **'Animal Photos'**
  String get animalPhotos;

  /// No description provided for @addToHerd.
  ///
  /// In en, this message translates to:
  /// **'Add to Herd'**
  String get addToHerd;

  /// No description provided for @addAnimalFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add animal. Check the tag number or try again.'**
  String get addAnimalFailed;

  /// No description provided for @editAnimalFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update animal. Please try again.'**
  String get editAnimalFailed;

  /// No description provided for @deleteAnimalTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Animal'**
  String get deleteAnimalTitle;

  /// No description provided for @deleteAnimalMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this animal?'**
  String get deleteAnimalMessage;

  /// No description provided for @noAnimals.
  ///
  /// In en, this message translates to:
  /// **'No animals'**
  String get noAnimals;

  /// No description provided for @noAnimalsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Register your first animal in the herd'**
  String get noAnimalsSubtitle;

  /// No description provided for @loadHerdFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadHerdFailed;

  /// No description provided for @herdTotal.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get herdTotal;

  /// No description provided for @herdMale.
  ///
  /// In en, this message translates to:
  /// **'Males'**
  String get herdMale;

  /// No description provided for @herdFemale.
  ///
  /// In en, this message translates to:
  /// **'Females'**
  String get herdFemale;

  /// No description provided for @herdPregnant.
  ///
  /// In en, this message translates to:
  /// **'Pregnant'**
  String get herdPregnant;

  /// No description provided for @animalDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Animal Details'**
  String get animalDetailTitle;

  /// No description provided for @vetRecords.
  ///
  /// In en, this message translates to:
  /// **'Vet Records'**
  String get vetRecords;

  /// No description provided for @weightHistory.
  ///
  /// In en, this message translates to:
  /// **'Weight History'**
  String get weightHistory;

  /// No description provided for @animalInfo.
  ///
  /// In en, this message translates to:
  /// **'Information'**
  String get animalInfo;

  /// No description provided for @tagLabel.
  ///
  /// In en, this message translates to:
  /// **'Tag'**
  String get tagLabel;

  /// No description provided for @genderLabel.
  ///
  /// In en, this message translates to:
  /// **'Gender'**
  String get genderLabel;

  /// No description provided for @birthDateDisplay.
  ///
  /// In en, this message translates to:
  /// **'Birth Date'**
  String get birthDateDisplay;

  /// No description provided for @colorField.
  ///
  /// In en, this message translates to:
  /// **'Color'**
  String get colorField;

  /// No description provided for @pregnancyStatusLabel.
  ///
  /// In en, this message translates to:
  /// **'Pregnancy Status'**
  String get pregnancyStatusLabel;

  /// No description provided for @expectedBirthDateLabel.
  ///
  /// In en, this message translates to:
  /// **'Expected Birth'**
  String get expectedBirthDateLabel;

  /// No description provided for @addVetRecord.
  ///
  /// In en, this message translates to:
  /// **'Add Record'**
  String get addVetRecord;

  /// No description provided for @noVetRecords.
  ///
  /// In en, this message translates to:
  /// **'No vet records'**
  String get noVetRecords;

  /// No description provided for @noWeightHistory.
  ///
  /// In en, this message translates to:
  /// **'No weight records'**
  String get noWeightHistory;

  /// No description provided for @vetTitle.
  ///
  /// In en, this message translates to:
  /// **'Veterinary Records'**
  String get vetTitle;

  /// No description provided for @deleteVetRecord.
  ///
  /// In en, this message translates to:
  /// **'Delete Record'**
  String get deleteVetRecord;

  /// No description provided for @deleteVetConfirm.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this record?'**
  String get deleteVetConfirm;

  /// No description provided for @listingsTitle.
  ///
  /// In en, this message translates to:
  /// **'My Listings'**
  String get listingsTitle;

  /// No description provided for @addListingTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Listing'**
  String get addListingTitle;

  /// No description provided for @editListingTitle.
  ///
  /// In en, this message translates to:
  /// **'Edit Listing'**
  String get editListingTitle;

  /// No description provided for @listingType.
  ///
  /// In en, this message translates to:
  /// **'Livestock Type'**
  String get listingType;

  /// No description provided for @deliveryType.
  ///
  /// In en, this message translates to:
  /// **'Delivery Type'**
  String get deliveryType;

  /// No description provided for @listingBreed.
  ///
  /// In en, this message translates to:
  /// **'Breed'**
  String get listingBreed;

  /// No description provided for @listingWeight.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get listingWeight;

  /// No description provided for @listingAge.
  ///
  /// In en, this message translates to:
  /// **'Age'**
  String get listingAge;

  /// No description provided for @listingPrice.
  ///
  /// In en, this message translates to:
  /// **'Price (EGP)'**
  String get listingPrice;

  /// No description provided for @listingDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get listingDescription;

  /// No description provided for @eidAvailableToggle.
  ///
  /// In en, this message translates to:
  /// **'Available for Eid'**
  String get eidAvailableToggle;

  /// No description provided for @slaughterServiceToggle.
  ///
  /// In en, this message translates to:
  /// **'Slaughter service available'**
  String get slaughterServiceToggle;

  /// No description provided for @submitListing.
  ///
  /// In en, this message translates to:
  /// **'Add Listing'**
  String get submitListing;

  /// No description provided for @updateListing.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get updateListing;

  /// No description provided for @addListingFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add listing. Please try again.'**
  String get addListingFailed;

  /// No description provided for @updateListingFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update. Please try again.'**
  String get updateListingFailed;

  /// No description provided for @deleteListingTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Listing'**
  String get deleteListingTitle;

  /// No description provided for @deleteListingMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this listing?'**
  String get deleteListingMessage;

  /// No description provided for @listingStatusAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get listingStatusAll;

  /// No description provided for @listingStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending Review'**
  String get listingStatusPending;

  /// No description provided for @listingStatusActive.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get listingStatusActive;

  /// No description provided for @listingStatusSold.
  ///
  /// In en, this message translates to:
  /// **'Sold'**
  String get listingStatusSold;

  /// No description provided for @listingStatusRejected.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get listingStatusRejected;

  /// No description provided for @noListings.
  ///
  /// In en, this message translates to:
  /// **'No listings'**
  String get noListings;

  /// No description provided for @noListingsSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Add your first listing to start selling'**
  String get noListingsSubtitle;

  /// No description provided for @loadListingsFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadListingsFailed;

  /// No description provided for @noDelivery.
  ///
  /// In en, this message translates to:
  /// **'No delivery'**
  String get noDelivery;

  /// No description provided for @farmDelivery.
  ///
  /// In en, this message translates to:
  /// **'Farm delivery'**
  String get farmDelivery;

  /// No description provided for @adminDelivery.
  ///
  /// In en, this message translates to:
  /// **'FarmFlow delivery'**
  String get adminDelivery;

  /// No description provided for @sellerProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'My Profile'**
  String get sellerProfileTitle;

  /// No description provided for @farmProfileTitle.
  ///
  /// In en, this message translates to:
  /// **'Farm Profile'**
  String get farmProfileTitle;

  /// No description provided for @personalInfoSection.
  ///
  /// In en, this message translates to:
  /// **'Personal Information'**
  String get personalInfoSection;

  /// No description provided for @farmInfoSection.
  ///
  /// In en, this message translates to:
  /// **'Farm Information'**
  String get farmInfoSection;

  /// No description provided for @certificatesSection.
  ///
  /// In en, this message translates to:
  /// **'Certificates'**
  String get certificatesSection;

  /// No description provided for @editFarmBanner.
  ///
  /// In en, this message translates to:
  /// **'Edit Farm Banner'**
  String get editFarmBanner;

  /// No description provided for @experience.
  ///
  /// In en, this message translates to:
  /// **'Experience'**
  String get experience;

  /// No description provided for @bio.
  ///
  /// In en, this message translates to:
  /// **'About the Farm'**
  String get bio;

  /// No description provided for @bioHint.
  ///
  /// In en, this message translates to:
  /// **'Describe your farm...'**
  String get bioHint;

  /// No description provided for @profileUpdateSuccess.
  ///
  /// In en, this message translates to:
  /// **'Profile updated successfully'**
  String get profileUpdateSuccess;

  /// No description provided for @profileUpdateFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update profile'**
  String get profileUpdateFailed;

  /// No description provided for @deleteAccount.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get deleteAccount;

  /// No description provided for @deleteAccountConfirmTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Account'**
  String get deleteAccountConfirmTitle;

  /// No description provided for @deleteAccountConfirmMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete your account? This action cannot be undone.'**
  String get deleteAccountConfirmMessage;

  /// No description provided for @suppliesTitle.
  ///
  /// In en, this message translates to:
  /// **'My Supplies'**
  String get suppliesTitle;

  /// No description provided for @addSupply.
  ///
  /// In en, this message translates to:
  /// **'Add Supply'**
  String get addSupply;

  /// No description provided for @noSupplyItems.
  ///
  /// In en, this message translates to:
  /// **'No supplies'**
  String get noSupplyItems;

  /// No description provided for @addFirstSupply.
  ///
  /// In en, this message translates to:
  /// **'Add your first supply'**
  String get addFirstSupply;

  /// No description provided for @loadSuppliesFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get loadSuppliesFailed;

  /// No description provided for @supplyName.
  ///
  /// In en, this message translates to:
  /// **'Supply Name'**
  String get supplyName;

  /// No description provided for @supplyCategory.
  ///
  /// In en, this message translates to:
  /// **'Category'**
  String get supplyCategory;

  /// No description provided for @supplyQuantity.
  ///
  /// In en, this message translates to:
  /// **'Quantity'**
  String get supplyQuantity;

  /// No description provided for @supplyUnit.
  ///
  /// In en, this message translates to:
  /// **'Unit'**
  String get supplyUnit;

  /// No description provided for @supplyPrice.
  ///
  /// In en, this message translates to:
  /// **'Price per unit (EGP)'**
  String get supplyPrice;

  /// No description provided for @supplyMinOrder.
  ///
  /// In en, this message translates to:
  /// **'Minimum order quantity'**
  String get supplyMinOrder;

  /// No description provided for @supplyDelivery.
  ///
  /// In en, this message translates to:
  /// **'Delivery available'**
  String get supplyDelivery;

  /// No description provided for @supplyDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get supplyDescription;

  /// No description provided for @supplyLocation.
  ///
  /// In en, this message translates to:
  /// **'Location (optional)'**
  String get supplyLocation;

  /// No description provided for @addSupplyButton.
  ///
  /// In en, this message translates to:
  /// **'Add Supply'**
  String get addSupplyButton;

  /// No description provided for @saveSupplyButton.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get saveSupplyButton;

  /// No description provided for @deleteSupplyTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Supply'**
  String get deleteSupplyTitle;

  /// No description provided for @deleteSupplyMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this supply?'**
  String get deleteSupplyMessage;

  /// No description provided for @supplyDetailTitle.
  ///
  /// In en, this message translates to:
  /// **'Product Details'**
  String get supplyDetailTitle;

  /// No description provided for @availableQuantity.
  ///
  /// In en, this message translates to:
  /// **'Available Quantity'**
  String get availableQuantity;

  /// No description provided for @minOrderQuantity.
  ///
  /// In en, this message translates to:
  /// **'Minimum Order'**
  String get minOrderQuantity;

  /// No description provided for @supplyDescription2.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get supplyDescription2;

  /// No description provided for @supplySellerSection.
  ///
  /// In en, this message translates to:
  /// **'Seller'**
  String get supplySellerSection;

  /// No description provided for @adminDashboardTitle.
  ///
  /// In en, this message translates to:
  /// **'Admin Dashboard'**
  String get adminDashboardTitle;

  /// No description provided for @adminListingsTitle.
  ///
  /// In en, this message translates to:
  /// **'Listings'**
  String get adminListingsTitle;

  /// No description provided for @adminOrdersTitle.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get adminOrdersTitle;

  /// No description provided for @adminDairyTitle.
  ///
  /// In en, this message translates to:
  /// **'Dairy'**
  String get adminDairyTitle;

  /// No description provided for @adminUsersTitle.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get adminUsersTitle;

  /// No description provided for @adminReviewsTitle.
  ///
  /// In en, this message translates to:
  /// **'Reviews'**
  String get adminReviewsTitle;

  /// No description provided for @adminEidTitle.
  ///
  /// In en, this message translates to:
  /// **'Eid Offers'**
  String get adminEidTitle;

  /// No description provided for @approveButton.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get approveButton;

  /// No description provided for @rejectButton.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get rejectButton;

  /// No description provided for @approvedStatus.
  ///
  /// In en, this message translates to:
  /// **'Approved'**
  String get approvedStatus;

  /// No description provided for @rejectedStatus.
  ///
  /// In en, this message translates to:
  /// **'Rejected'**
  String get rejectedStatus;

  /// No description provided for @pendingStatus.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get pendingStatus;

  /// No description provided for @confirmApprove.
  ///
  /// In en, this message translates to:
  /// **'Approve'**
  String get confirmApprove;

  /// No description provided for @confirmReject.
  ///
  /// In en, this message translates to:
  /// **'Reject'**
  String get confirmReject;

  /// No description provided for @banUser.
  ///
  /// In en, this message translates to:
  /// **'Ban User'**
  String get banUser;

  /// No description provided for @unbanUser.
  ///
  /// In en, this message translates to:
  /// **'Unban'**
  String get unbanUser;

  /// No description provided for @bannedBadge.
  ///
  /// In en, this message translates to:
  /// **'Banned'**
  String get bannedBadge;

  /// No description provided for @sellerBadge.
  ///
  /// In en, this message translates to:
  /// **'Seller'**
  String get sellerBadge;

  /// No description provided for @buyerBadge.
  ///
  /// In en, this message translates to:
  /// **'Buyer'**
  String get buyerBadge;

  /// No description provided for @activeBadge.
  ///
  /// In en, this message translates to:
  /// **'Active'**
  String get activeBadge;

  /// No description provided for @navHome.
  ///
  /// In en, this message translates to:
  /// **'Farms'**
  String get navHome;

  /// No description provided for @navOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get navOrders;

  /// No description provided for @navFavorites.
  ///
  /// In en, this message translates to:
  /// **'Favorites'**
  String get navFavorites;

  /// No description provided for @navProfile.
  ///
  /// In en, this message translates to:
  /// **'Profile'**
  String get navProfile;

  /// No description provided for @navDashboard.
  ///
  /// In en, this message translates to:
  /// **'Dashboard'**
  String get navDashboard;

  /// No description provided for @navHerd.
  ///
  /// In en, this message translates to:
  /// **'Herd'**
  String get navHerd;

  /// No description provided for @navListings.
  ///
  /// In en, this message translates to:
  /// **'Listings'**
  String get navListings;

  /// No description provided for @navStatements.
  ///
  /// In en, this message translates to:
  /// **'Accounts'**
  String get navStatements;

  /// No description provided for @navAdminHome.
  ///
  /// In en, this message translates to:
  /// **'Home'**
  String get navAdminHome;

  /// No description provided for @navAdminListings.
  ///
  /// In en, this message translates to:
  /// **'Listings'**
  String get navAdminListings;

  /// No description provided for @navAdminOrders.
  ///
  /// In en, this message translates to:
  /// **'Orders'**
  String get navAdminOrders;

  /// No description provided for @navAdminDairy.
  ///
  /// In en, this message translates to:
  /// **'Dairy'**
  String get navAdminDairy;

  /// No description provided for @navAdminUsers.
  ///
  /// In en, this message translates to:
  /// **'Users'**
  String get navAdminUsers;

  /// No description provided for @orderStatusPending.
  ///
  /// In en, this message translates to:
  /// **'Pending'**
  String get orderStatusPending;

  /// No description provided for @orderStatusConfirmed.
  ///
  /// In en, this message translates to:
  /// **'Confirmed'**
  String get orderStatusConfirmed;

  /// No description provided for @orderStatusCompleted.
  ///
  /// In en, this message translates to:
  /// **'Completed'**
  String get orderStatusCompleted;

  /// No description provided for @orderStatusCancelled.
  ///
  /// In en, this message translates to:
  /// **'Cancelled'**
  String get orderStatusCancelled;

  /// No description provided for @confirmOrder2.
  ///
  /// In en, this message translates to:
  /// **'Confirm'**
  String get confirmOrder2;

  /// No description provided for @completeOrder.
  ///
  /// In en, this message translates to:
  /// **'Complete'**
  String get completeOrder;

  /// No description provided for @cancelOrder.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancelOrder;

  /// No description provided for @deliverySection.
  ///
  /// In en, this message translates to:
  /// **'Delivery'**
  String get deliverySection;

  /// No description provided for @deliveryNotShipped.
  ///
  /// In en, this message translates to:
  /// **'Not Shipped'**
  String get deliveryNotShipped;

  /// No description provided for @deliveryInTransit.
  ///
  /// In en, this message translates to:
  /// **'In Transit'**
  String get deliveryInTransit;

  /// No description provided for @deliveryDelivered.
  ///
  /// In en, this message translates to:
  /// **'Delivered'**
  String get deliveryDelivered;

  /// No description provided for @deliveryCostHint.
  ///
  /// In en, this message translates to:
  /// **'Delivery cost (EGP)'**
  String get deliveryCostHint;

  /// No description provided for @saveDelivery.
  ///
  /// In en, this message translates to:
  /// **'Save Delivery Info'**
  String get saveDelivery;

  /// No description provided for @updateStatusFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update status'**
  String get updateStatusFailed;

  /// No description provided for @updateDeliveryFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to update delivery'**
  String get updateDeliveryFailed;

  /// No description provided for @paymentDeposit.
  ///
  /// In en, this message translates to:
  /// **'Deposit'**
  String get paymentDeposit;

  /// No description provided for @paymentCash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get paymentCash;

  /// No description provided for @buyerLabel.
  ///
  /// In en, this message translates to:
  /// **'Buyer'**
  String get buyerLabel;

  /// No description provided for @noOrders2.
  ///
  /// In en, this message translates to:
  /// **'No orders'**
  String get noOrders2;

  /// No description provided for @noOrdersInCategory.
  ///
  /// In en, this message translates to:
  /// **'No orders in this category'**
  String get noOrdersInCategory;

  /// No description provided for @noDairyItems.
  ///
  /// In en, this message translates to:
  /// **'No products'**
  String get noDairyItems;

  /// No description provided for @noDairyPending.
  ///
  /// In en, this message translates to:
  /// **'No products pending review'**
  String get noDairyPending;

  /// No description provided for @noResults.
  ///
  /// In en, this message translates to:
  /// **'No results'**
  String get noResults;

  /// No description provided for @approveDairyFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to approve'**
  String get approveDairyFailed;

  /// No description provided for @deleteDairyFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to delete'**
  String get deleteDairyFailed;

  /// No description provided for @deleteProductTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Product'**
  String get deleteProductTitle;

  /// No description provided for @deleteProductMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this product?'**
  String get deleteProductMessage;

  /// No description provided for @noReviews2.
  ///
  /// In en, this message translates to:
  /// **'No reviews'**
  String get noReviews2;

  /// No description provided for @noReviewsYet2.
  ///
  /// In en, this message translates to:
  /// **'No reviews have been added yet'**
  String get noReviewsYet2;

  /// No description provided for @deleteReviewTitle.
  ///
  /// In en, this message translates to:
  /// **'Delete Review'**
  String get deleteReviewTitle;

  /// No description provided for @deleteReviewMessage.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this review?'**
  String get deleteReviewMessage;

  /// No description provided for @deleteReviewFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to delete'**
  String get deleteReviewFailed;

  /// No description provided for @forFarm.
  ///
  /// In en, this message translates to:
  /// **'Farm: {name}'**
  String forFarm(String name);

  /// No description provided for @eidSettings.
  ///
  /// In en, this message translates to:
  /// **'Eid Settings'**
  String get eidSettings;

  /// No description provided for @eidModeTitle.
  ///
  /// In en, this message translates to:
  /// **'Enable Eid Mode'**
  String get eidModeTitle;

  /// No description provided for @eidModeSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Adds \"Eid Livestock\" category in the interface'**
  String get eidModeSubtitle;

  /// No description provided for @eidModeBanner.
  ///
  /// In en, this message translates to:
  /// **'Eid Mode'**
  String get eidModeBanner;

  /// No description provided for @eidModeBannerSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Enables Eid livestock classification and shows sacrifice filter for buyers'**
  String get eidModeBannerSubtitle;

  /// No description provided for @eidDate.
  ///
  /// In en, this message translates to:
  /// **'Eid Date'**
  String get eidDate;

  /// No description provided for @eidDateNotSet.
  ///
  /// In en, this message translates to:
  /// **'Not set'**
  String get eidDateNotSet;

  /// No description provided for @saveSettings.
  ///
  /// In en, this message translates to:
  /// **'Save Settings'**
  String get saveSettings;

  /// No description provided for @savedSuccess.
  ///
  /// In en, this message translates to:
  /// **'Saved successfully'**
  String get savedSuccess;

  /// No description provided for @saveFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to save'**
  String get saveFailed;

  /// No description provided for @userSearchHint.
  ///
  /// In en, this message translates to:
  /// **'Search for a user...'**
  String get userSearchHint;

  /// No description provided for @noUsersFound.
  ///
  /// In en, this message translates to:
  /// **'No results'**
  String get noUsersFound;

  /// No description provided for @noUsersFoundSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Try changing the filter or search'**
  String get noUsersFoundSubtitle;

  /// No description provided for @addAnimalButton.
  ///
  /// In en, this message translates to:
  /// **'Add to Herd'**
  String get addAnimalButton;

  /// No description provided for @addAnimalFailedMsg.
  ///
  /// In en, this message translates to:
  /// **'Failed to add animal. Check the tag number or try again.'**
  String get addAnimalFailedMsg;

  /// No description provided for @editAnimalButton.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get editAnimalButton;

  /// No description provided for @editAnimalFailedMsg.
  ///
  /// In en, this message translates to:
  /// **'Failed to save changes. Please try again.'**
  String get editAnimalFailedMsg;

  /// No description provided for @loadAnimalFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load animal data'**
  String get loadAnimalFailed;

  /// No description provided for @tagIdLabel2.
  ///
  /// In en, this message translates to:
  /// **'Tag Number *'**
  String get tagIdLabel2;

  /// No description provided for @tagIdHint2.
  ///
  /// In en, this message translates to:
  /// **'e.g. A-001'**
  String get tagIdHint2;

  /// No description provided for @breedLabel.
  ///
  /// In en, this message translates to:
  /// **'Breed'**
  String get breedLabel;

  /// No description provided for @breedHint2.
  ///
  /// In en, this message translates to:
  /// **'e.g. Friesian'**
  String get breedHint2;

  /// No description provided for @birthDateLabel2.
  ///
  /// In en, this message translates to:
  /// **'Date of Birth *'**
  String get birthDateLabel2;

  /// No description provided for @chooseBirthDate3.
  ///
  /// In en, this message translates to:
  /// **'Choose date of birth'**
  String get chooseBirthDate3;

  /// No description provided for @currentWeightLabel.
  ///
  /// In en, this message translates to:
  /// **'Current Weight (kg)'**
  String get currentWeightLabel;

  /// No description provided for @colorLabel2.
  ///
  /// In en, this message translates to:
  /// **'Color'**
  String get colorLabel2;

  /// No description provided for @colorHint2.
  ///
  /// In en, this message translates to:
  /// **'e.g. Black and white'**
  String get colorHint2;

  /// No description provided for @notesLabel3.
  ///
  /// In en, this message translates to:
  /// **'Notes'**
  String get notesLabel3;

  /// No description provided for @notesHint2.
  ///
  /// In en, this message translates to:
  /// **'Any additional information...'**
  String get notesHint2;

  /// No description provided for @pregnancyNone.
  ///
  /// In en, this message translates to:
  /// **'Not pregnant'**
  String get pregnancyNone;

  /// No description provided for @pregnancyPregnant.
  ///
  /// In en, this message translates to:
  /// **'Pregnant'**
  String get pregnancyPregnant;

  /// No description provided for @pregnancyRecentBirth.
  ///
  /// In en, this message translates to:
  /// **'Recently gave birth'**
  String get pregnancyRecentBirth;

  /// No description provided for @animalPhotosLabel.
  ///
  /// In en, this message translates to:
  /// **'Animal Photos'**
  String get animalPhotosLabel;

  /// No description provided for @addPhotosLabel.
  ///
  /// In en, this message translates to:
  /// **'Add Photos'**
  String get addPhotosLabel;

  /// No description provided for @weightGoalTitle.
  ///
  /// In en, this message translates to:
  /// **'Weight Goal'**
  String get weightGoalTitle;

  /// No description provided for @editWeightGoal.
  ///
  /// In en, this message translates to:
  /// **'Edit'**
  String get editWeightGoal;

  /// No description provided for @weightGoalNotSet.
  ///
  /// In en, this message translates to:
  /// **'No goal set yet'**
  String get weightGoalNotSet;

  /// No description provided for @weightGoalLabel.
  ///
  /// In en, this message translates to:
  /// **'Target weight (kg)'**
  String get weightGoalLabel;

  /// No description provided for @saveGoal.
  ///
  /// In en, this message translates to:
  /// **'Save Goal'**
  String get saveGoal;

  /// No description provided for @recordWeightTitle.
  ///
  /// In en, this message translates to:
  /// **'Record New Weight'**
  String get recordWeightTitle;

  /// No description provided for @weightKgLabel.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg)'**
  String get weightKgLabel;

  /// No description provided for @weightInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid weight'**
  String get weightInvalid;

  /// No description provided for @weightSuffix.
  ///
  /// In en, this message translates to:
  /// **'kg'**
  String get weightSuffix;

  /// No description provided for @recordWeight.
  ///
  /// In en, this message translates to:
  /// **'Record'**
  String get recordWeight;

  /// No description provided for @recordWeightFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to record'**
  String get recordWeightFailed;

  /// No description provided for @addVacTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Vaccination'**
  String get addVacTitle;

  /// No description provided for @vaccineName.
  ///
  /// In en, this message translates to:
  /// **'Vaccine Name *'**
  String get vaccineName;

  /// No description provided for @vaccineHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. FMD, PPR...'**
  String get vaccineHint;

  /// No description provided for @vetName.
  ///
  /// In en, this message translates to:
  /// **'Veterinarian'**
  String get vetName;

  /// No description provided for @vetHint.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get vetHint;

  /// No description provided for @vaccineRequired.
  ///
  /// In en, this message translates to:
  /// **'Vaccine name is required'**
  String get vaccineRequired;

  /// No description provided for @addVaccineFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add'**
  String get addVaccineFailed;

  /// No description provided for @addMedTitle.
  ///
  /// In en, this message translates to:
  /// **'Add Medical Record'**
  String get addMedTitle;

  /// No description provided for @diagnosisLabel.
  ///
  /// In en, this message translates to:
  /// **'Diagnosis'**
  String get diagnosisLabel;

  /// No description provided for @diagnosisHint.
  ///
  /// In en, this message translates to:
  /// **'Disease or condition'**
  String get diagnosisHint;

  /// No description provided for @treatmentLabel.
  ///
  /// In en, this message translates to:
  /// **'Treatment'**
  String get treatmentLabel;

  /// No description provided for @treatmentHint.
  ///
  /// In en, this message translates to:
  /// **'Treatment method'**
  String get treatmentHint;

  /// No description provided for @medicationLabel.
  ///
  /// In en, this message translates to:
  /// **'Medication'**
  String get medicationLabel;

  /// No description provided for @medicationHint.
  ///
  /// In en, this message translates to:
  /// **'Medication name'**
  String get medicationHint;

  /// No description provided for @costLabel.
  ///
  /// In en, this message translates to:
  /// **'Cost (EGP)'**
  String get costLabel;

  /// No description provided for @costHint.
  ///
  /// In en, this message translates to:
  /// **'0'**
  String get costHint;

  /// No description provided for @addMedFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to add'**
  String get addMedFailed;

  /// No description provided for @addMedButton.
  ///
  /// In en, this message translates to:
  /// **'Add Record'**
  String get addMedButton;

  /// No description provided for @pregnancyStatusTitle.
  ///
  /// In en, this message translates to:
  /// **'Pregnancy Status'**
  String get pregnancyStatusTitle;

  /// No description provided for @expectedBirthDateLabel2.
  ///
  /// In en, this message translates to:
  /// **'Expected Birth Date (optional)'**
  String get expectedBirthDateLabel2;

  /// No description provided for @chooseBirthDate4.
  ///
  /// In en, this message translates to:
  /// **'Choose date'**
  String get chooseBirthDate4;

  /// No description provided for @saveFailed2.
  ///
  /// In en, this message translates to:
  /// **'Failed to save'**
  String get saveFailed2;

  /// No description provided for @editPregnancy.
  ///
  /// In en, this message translates to:
  /// **'Edit Pregnancy'**
  String get editPregnancy;

  /// No description provided for @noVaccinations.
  ///
  /// In en, this message translates to:
  /// **'No vaccinations recorded'**
  String get noVaccinations;

  /// No description provided for @noMedicalRecords.
  ///
  /// In en, this message translates to:
  /// **'No medical records'**
  String get noMedicalRecords;

  /// No description provided for @loadMedicalFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load medical records'**
  String get loadMedicalFailed;

  /// No description provided for @addVacButton.
  ///
  /// In en, this message translates to:
  /// **'Add'**
  String get addVacButton;

  /// No description provided for @addVaccinationLabel.
  ///
  /// In en, this message translates to:
  /// **'Add Vaccination'**
  String get addVaccinationLabel;

  /// No description provided for @addMedicalLabel.
  ///
  /// In en, this message translates to:
  /// **'Add Medical Record'**
  String get addMedicalLabel;

  /// No description provided for @weightProgress.
  ///
  /// In en, this message translates to:
  /// **'Weight progress toward goal'**
  String get weightProgress;

  /// No description provided for @selectAnimalFirst.
  ///
  /// In en, this message translates to:
  /// **'Select an animal first'**
  String get selectAnimalFirst;

  /// No description provided for @selectAnimal.
  ///
  /// In en, this message translates to:
  /// **'Select animal'**
  String get selectAnimal;

  /// No description provided for @chooseAnimal.
  ///
  /// In en, this message translates to:
  /// **'Choose animal'**
  String get chooseAnimal;

  /// No description provided for @noAnimalsInHerd.
  ///
  /// In en, this message translates to:
  /// **'No animals'**
  String get noAnimalsInHerd;

  /// No description provided for @pickAnimalLabel.
  ///
  /// In en, this message translates to:
  /// **'Animal *'**
  String get pickAnimalLabel;

  /// No description provided for @loadAnimalsFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load animals'**
  String get loadAnimalsFailed;

  /// No description provided for @nextDose.
  ///
  /// In en, this message translates to:
  /// **'Next dose: {date}'**
  String nextDose(String date);

  /// No description provided for @overdueDate.
  ///
  /// In en, this message translates to:
  /// **'Overdue: {date}'**
  String overdueDate(String date);

  /// No description provided for @followUpDate.
  ///
  /// In en, this message translates to:
  /// **'Follow-up: {date}'**
  String followUpDate(String date);

  /// No description provided for @vetRecordsTitle.
  ///
  /// In en, this message translates to:
  /// **'Veterinary Records'**
  String get vetRecordsTitle;

  /// No description provided for @newMedRecord.
  ///
  /// In en, this message translates to:
  /// **'New Medical Record'**
  String get newMedRecord;

  /// No description provided for @medicalTab.
  ///
  /// In en, this message translates to:
  /// **'Medical Records'**
  String get medicalTab;

  /// No description provided for @vaccinationsTab.
  ///
  /// In en, this message translates to:
  /// **'Vaccinations'**
  String get vaccinationsTab;

  /// No description provided for @loadVetFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load records'**
  String get loadVetFailed;

  /// No description provided for @loadVacFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load vaccinations'**
  String get loadVacFailed;

  /// No description provided for @noMedRecords.
  ///
  /// In en, this message translates to:
  /// **'No medical records'**
  String get noMedRecords;

  /// No description provided for @addMedRecordHint.
  ///
  /// In en, this message translates to:
  /// **'Tap + to add a record for any animal'**
  String get addMedRecordHint;

  /// No description provided for @noVacRecords.
  ///
  /// In en, this message translates to:
  /// **'No vaccinations recorded'**
  String get noVacRecords;

  /// No description provided for @vacRecordHint.
  ///
  /// In en, this message translates to:
  /// **'Record vaccinations from the animal detail page'**
  String get vacRecordHint;

  /// No description provided for @medCheckup.
  ///
  /// In en, this message translates to:
  /// **'Medical checkup'**
  String get medCheckup;

  /// No description provided for @treatmentPrefix.
  ///
  /// In en, this message translates to:
  /// **'Treatment: {value}'**
  String treatmentPrefix(String value);

  /// No description provided for @medicationPrefix.
  ///
  /// In en, this message translates to:
  /// **'Medication: {value}'**
  String medicationPrefix(String value);

  /// No description provided for @doctorPrefix.
  ///
  /// In en, this message translates to:
  /// **'Dr. {name}'**
  String doctorPrefix(String name);

  /// No description provided for @addListingTitle2.
  ///
  /// In en, this message translates to:
  /// **'Add Listing'**
  String get addListingTitle2;

  /// No description provided for @editListingTitle2.
  ///
  /// In en, this message translates to:
  /// **'Edit Listing'**
  String get editListingTitle2;

  /// No description provided for @listingTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Livestock Type'**
  String get listingTypeLabel;

  /// No description provided for @deliveryTypeLabel.
  ///
  /// In en, this message translates to:
  /// **'Delivery Method'**
  String get deliveryTypeLabel;

  /// No description provided for @deliveryNone.
  ///
  /// In en, this message translates to:
  /// **'No delivery'**
  String get deliveryNone;

  /// No description provided for @deliveryFarm.
  ///
  /// In en, this message translates to:
  /// **'Farm delivery'**
  String get deliveryFarm;

  /// No description provided for @deliveryAdmin.
  ///
  /// In en, this message translates to:
  /// **'Platform delivery'**
  String get deliveryAdmin;

  /// No description provided for @breedFieldLabel.
  ///
  /// In en, this message translates to:
  /// **'Breed'**
  String get breedFieldLabel;

  /// No description provided for @breedFieldHint.
  ///
  /// In en, this message translates to:
  /// **'e.g. Friesian'**
  String get breedFieldHint;

  /// No description provided for @ageMonthsLabel.
  ///
  /// In en, this message translates to:
  /// **'Age (months)'**
  String get ageMonthsLabel;

  /// No description provided for @weightRequiredLabel.
  ///
  /// In en, this message translates to:
  /// **'Weight (kg) *'**
  String get weightRequiredLabel;

  /// No description provided for @priceRequiredLabel.
  ///
  /// In en, this message translates to:
  /// **'Price (EGP) *'**
  String get priceRequiredLabel;

  /// No description provided for @weightPriceRequired.
  ///
  /// In en, this message translates to:
  /// **'Weight and price are required'**
  String get weightPriceRequired;

  /// No description provided for @weightPriceInvalid.
  ///
  /// In en, this message translates to:
  /// **'Enter valid numbers for weight and price'**
  String get weightPriceInvalid;

  /// No description provided for @eidSectionLabel.
  ///
  /// In en, this message translates to:
  /// **'Available for Eid'**
  String get eidSectionLabel;

  /// No description provided for @slaughterSectionLabel.
  ///
  /// In en, this message translates to:
  /// **'Slaughter service'**
  String get slaughterSectionLabel;

  /// No description provided for @descriptionLabel2.
  ///
  /// In en, this message translates to:
  /// **'Description'**
  String get descriptionLabel2;

  /// No description provided for @descriptionHint2.
  ///
  /// In en, this message translates to:
  /// **'Any additional details...'**
  String get descriptionHint2;

  /// No description provided for @listingPhotosLabel.
  ///
  /// In en, this message translates to:
  /// **'Listing Photos'**
  String get listingPhotosLabel;

  /// No description provided for @addPhotosLabel2.
  ///
  /// In en, this message translates to:
  /// **'Add Photos'**
  String get addPhotosLabel2;

  /// No description provided for @submitListingButton.
  ///
  /// In en, this message translates to:
  /// **'Publish Listing'**
  String get submitListingButton;

  /// No description provided for @saveListingButton.
  ///
  /// In en, this message translates to:
  /// **'Save Changes'**
  String get saveListingButton;

  /// No description provided for @addListingFailed2.
  ///
  /// In en, this message translates to:
  /// **'Failed to publish listing. Please try again.'**
  String get addListingFailed2;

  /// No description provided for @updateListingFailed2.
  ///
  /// In en, this message translates to:
  /// **'Failed to update listing. Please try again.'**
  String get updateListingFailed2;

  /// No description provided for @tabGrowth.
  ///
  /// In en, this message translates to:
  /// **'Growth'**
  String get tabGrowth;

  /// No description provided for @tabVaccinations.
  ///
  /// In en, this message translates to:
  /// **'Vaccinations'**
  String get tabVaccinations;

  /// No description provided for @tabMedical.
  ///
  /// In en, this message translates to:
  /// **'Medical'**
  String get tabMedical;

  /// No description provided for @deleteAnimalConfirmMsg.
  ///
  /// In en, this message translates to:
  /// **'Are you sure you want to delete this animal from the herd?\nThis action cannot be undone.'**
  String get deleteAnimalConfirmMsg;

  /// No description provided for @animalLoadFailed.
  ///
  /// In en, this message translates to:
  /// **'Failed to load'**
  String get animalLoadFailed;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
