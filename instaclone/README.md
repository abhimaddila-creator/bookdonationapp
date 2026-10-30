# InstaClone

A full-stack Instagram-style social media application built entirely with **Firebase** (no separate backend server needed).

## Tech Stack

- **Frontend:** React, Vite, JavaScript, CSS, React Router
- **Database:** Firebase Firestore (real-time)
- **Authentication:** Firebase Auth (email/password)
- **Images:** image URLs (paste a link to a hosted image — no uploads, stays on the free Spark plan)
- **Real-time:** Firestore live listeners (messaging)

## Features

- Email/password sign up + login, protected routes
- Home feed with like, comment, share, save, and delete
- Create posts with an image URL + preview
- Saved posts page (everything you bookmarked)
- Profile page with posts grid, followers/following counts
- Edit profile (name, username, bio, photo URL) and change password
- Follow / unfollow system with live counts
- Search users by name or username
- Explore grid
- Notifications (follows, likes, comments) with unread badge
- Direct messages in real time
- Responsive layout with desktop and mobile navigation + dark mode

## 1. Requirements

- Node.js 18 or newer (v20+ recommended) — https://nodejs.org
- npm (comes with Node.js)
- A free Google account

## 2. Firebase Setup (one-time, ~10 minutes)

1. Go to https://console.firebase.google.com and sign in with Google
2. Click **"Create a project"** → name it `instaclone` → click Create
3. On the project home page, click the web icon **`</>`**
4. Register a web app, name it `instaclone-web`
5. Copy the **firebaseConfig** values shown on screen

6. **Enable the services** (left sidebar → **Build**):
   - **Authentication → Sign-in method → Email/Password → Enable → Save**
   - **Firestore Database → Create database → Start in production mode →** pick a region
   - Skip Storage — this app uses image **URLs**, so it stays on the free Spark plan

7. **Set Firestore Rules.** Open **Firestore → Rules** and paste:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   (Any signed-in user may read/write. In a real deployment you would lock this down per document.)

8. Open `client/.env` and paste your values:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=instaclone.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=instaclone
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

   (No Storage/Bucket value needed — Storage is not used.)

> The `VITE_` prefix tells Vite to expose the variable to the browser. These
> values identify your project; they are NOT secrets. Security comes from
> Authentication + Rules.

## 3. Installing Dependencies

```bash
cd instaclone/client
npm install
```

## 4. Starting the App (one command — no backend!)

```bash
cd instaclone/client
npm run dev
```

Open the printed URL (usually http://localhost:5173).

## 5. How to Create an Account

1. Open the app → click **Sign up**
2. Enter full name, username, email, password (+ confirm)
3. Click **Sign Up** → you are logged in and land on your feed

## 6. Deployment (Firebase Hosting)

The app is already set up to deploy with one command. From `instaclone/client`:

```bash
npm run build            # makes the optimized dist/ folder
firebase deploy          # uploads it to https://instaclone-28033.web.app
```

- `firebase.json` tells hosting to use `dist/` and route all URLs to `index.html` (so deep links like `/login` work).
- `.firebaserc` records the default project, so you don't need `--project`.

You can give the URL to anyone — the site works on desktop and mobile browsers.

**Deploying Firestore rules from the CLI** (no console needed):

```bash
cd instaclone
firebase deploy --only firestore:rules   # publishes firestore.rules
```

This works because the project root has a `firebase.json` pointing at `firestore.rules`.

## 7. If You See an Error

- **"Page blank / setup screen with steps"** → Firebase values aren't in `client/.env`
- **"Email/password sign-in is not enabled"** → enable Auth → Email/Password in the Console
- **"Permission denied"** → Firestore rules not set / not saved (step 7 above)

## 8. How to Test

- Browse: feed → create a post → like/comment/share/save → profile → edit
- From a second browser (or incognito) register another account:
  - follow your first account, send a message, see the notification appear live
- Open two windows side by side to watch chat update in real time

---

## Development Stages

All done:

- [x] Stage 1 — Firebase project + React app connected
- [x] Stage 2 — Register, Login, protected routes
- [x] Stage 3 — User profile, edit profile
- [x] Stage 4 — Posts, image upload, feed
- [x] Stage 5 — Likes, comments, saves
- [x] Stage 6 — Follow system
- [x] Stage 7 — Search, Explore
- [x] Stage 8 — Notifications
- [x] Stage 9 — Direct messaging (real time)
- [x] Stage 10 — Responsive design, dark mode

## Project Structure

```
instaclone/
└── client/                 Single React app (Firebase powered)
    ├── .env.example        Template for Firebase values
    ├── .env                Your Firebase values (never commit)
    └── src/
        ├── components/     Post, comments, navbar, icons, etc.
        ├── pages/          Login, Register, Home, Profile, Chat...
        ├── context/        AuthContext (who is logged in)
        ├── services/       Firebase helpers (users, posts, messages...)
        ├── styles/         CSS files
        ├── App.jsx         Routes + protected pages
        └── main.jsx        Entry point
```