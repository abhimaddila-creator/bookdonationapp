# BookShare

BookShare is a Flutter-based book donation app where users can donate books, browse donated books, request books, manage requests, save favorites, and receive notifications.

## Features

- User authentication with Firebase Email/Password
- Book donation form with category and condition selection
- Book browsing with search, category and condition filters, and title/author sorting
- Book request flow for donors and requesters
- My Requests and Manage Requests screens with searchable status filters and
  confirmation before request decisions
- Firestore-synced favorites that stay saved across sessions and devices
- Book ratings and reviews from requesters whose requests have been approved
- Direct chat between donors and requesters for each book request
- In-app and Firebase Cloud Messaging push notifications for request approval/rejection
- In-app and push alerts for new chat messages
- Profile name update and logout
- Splash screen and polished login/signup UI

## Tech Stack

- Flutter
- Dart
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Cloud Messaging
- Image Picker

## Project Structure

- `lib/main.dart` — app entry point
- `lib/screens/` — all app screens
- `lib/services/` — Firebase and app services
- `lib/models/` — app data models
- `lib/firebase_options.dart` — Firebase platform config

## Prerequisites

Before running the app, make sure you have:

- Flutter SDK installed
- Android Studio / VS Code with Flutter support
- Firebase project created in the Firebase Console
- Android and iOS apps configured in Firebase

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Add Android and iOS apps to the Firebase project
3. Download the Firebase config files:
   - `google-services.json` for Android
   - `GoogleService-Info.plist` for iOS
4. Place the config files in the correct native project folders
5. Run the following command if you need to regenerate Firebase config:

```bash
flutterfire configure
```

6. Enable Firebase Authentication, Firestore, and Firebase Storage in the Firebase Console
7. From the `flutter_application_1` directory, deploy the included security rules:

```bash
firebase deploy --only firestore:rules,storage
```

The `firebase.json` file maps these deploy targets to `firestore.rules` and
`storage.rules`. The app requires users to sign in before reading book listings;
make sure Email/Password sign-in is enabled in Firebase Authentication.

Push notifications are enabled for Android and iOS. The app asks signed-in
users for notification permission and securely associates each device token
with that user's Firestore profile. Request decision notifications are sent by
the Cloud Function, not by the client. Deploy the function and rules with:

```bash
firebase deploy --only functions:notifyRequestDecision,firestore:rules
```

Deploying Cloud Functions requires a Firebase project on the Blaze plan. For
iOS, enable Push Notifications for the app and configure an APNs authentication
key in Firebase Console > Project Settings > Cloud Messaging. Web push is not
configured; browser users continue to receive in-app notifications. The
notification function is configured for the Node.js 22 runtime.

8. Use the following collections in Firestore:
   - `users`
   - `users/{userId}/favorites`
   - `users/{userId}/favorites` (private, synchronized saved-book snapshots)
   - `books`
   - `book_requests`
   - `book_reviews` (reviews are stored under each book and can only be created by an approved requester)
   - `notifications` (created by the request-decision Cloud Function)

## Test Firestore Rules

Install the rules-test dependencies and run the Firestore Emulator tests from
the `flutter_application_1` directory:

```bash
npm --prefix rules_tests install
npm --prefix functions install
firebase emulators:exec --only firestore --project demo-bookshare "npm --prefix rules_tests test"
firebase emulators:exec --only firestore,functions --project demo-bookshare "npm --prefix rules_tests run test:push"
```

The emulators use a demo project ID and do not access production Firestore.
The rules suite covers book request creation, donor decisions, requester
cancellation, chat-room linking, notification ownership, and review eligibility
and ownership. The separate push test verifies that a request decision creates
the in-app notification through the Cloud Function and that new chat messages
notify only the other conversation participant.

## Test the App with Firebase Emulators

The app can connect to local Authentication, Firestore, and Storage emulators
without changing its default Firebase production configuration. In one
terminal, start the emulators from `flutter_application_1`:

```bash
firebase emulators:start --only auth,firestore,storage --project demo-bookshare
```

In another terminal, run the app with emulator connections enabled:

```bash
flutter run -d chrome --dart-define=USE_FIREBASE_EMULATORS=true
```

For an Android emulator, use its host bridge address:

```bash
flutter run --dart-define=USE_FIREBASE_EMULATORS=true --dart-define=FIREBASE_EMULATOR_HOST=10.0.2.2
```

For a physical device, set `FIREBASE_EMULATOR_HOST` to the computer's
LAN address and make sure the device can reach the emulator ports.

To exercise the two-account flow, register two test accounts in the app. Sign
in as the donor and donate a book, then sign out and sign in as the requester
to request that book and send a chat message. Sign in as the donor again to
approve or reject the request and reply in chat. Finally, sign back in as the
requester and check the request status and notification. Emulator data is
local test data; never use real credentials for this test. The emulator UI is
available at `http://127.0.0.1:4000`.

## Firebase Security Rules

This project includes Firebase security rules for Firestore and Firebase Storage:

- `firestore.rules` restricts access based on authenticated user identity and collection ownership
- `storage.rules` allows authenticated users to upload to their own `book_covers` folder only

## Run the App

From the `flutter_application_1` directory (the folder containing `pubspec.yaml`):

```bash
flutter pub get
flutter run
```

## Build for Android

### Debug APK

```bash
flutter build apk --debug
```

### Release APK

```bash
flutter build apk --release
```

### Android App Bundle

```bash
flutter build appbundle
```

## Notes

- Book cover images are uploaded to Firebase Storage and stored as downloadable URLs in Firestore.
- Firestore and Storage rules should be reviewed and tightened before public production deployment.

## Suggested Future Improvements

- Book rating/review system
- Admin dashboard for moderation
- Push notifications for mobile
