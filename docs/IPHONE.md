# SealedEV on iPhone

There are two ways to get SealedEV on your iPhone. **Option A is the recommended one.**

| | A. Home Screen app (PWA) | B. Native app (Capacitor + Xcode) |
| --- | --- | --- |
| Needs | iPhone with Safari, the app deployed at an `https://` address | A **Mac** with Xcode, an Apple ID (+ $99/yr Apple Developer Program for TestFlight) |
| Time | 1 minute | 30–60 minutes the first time |
| Updates | Automatic: every deploy is live the next time you open it | Automatic too (the shell loads your site); rebuild only to change icon/name |
| Looks like | Full-screen app with its own icon, no Safari bars | Same, plus it's a real `.app` you can share via TestFlight |

Both need the site deployed first (see [`DEPLOY_AWS.md`](DEPLOY_AWS.md)). An iPhone can't install an app from a server that only runs on your computer.

---

## A. Install as a Home Screen app (no Mac needed)

1. On your iPhone, open **Safari** and go to your SealedEV address, e.g. `https://main.xxxxx.amplifyapp.com` or your custom domain.
   - It must be Safari, or another iOS browser that offers "Add to Home Screen" on iOS 16.4+.
2. Tap the **Share** button (square with an up-arrow).
   - On iOS 26 it sits behind the **⋯** button next to the address bar.
   - The site also shows a reminder card with these steps until you dismiss it.
3. Scroll down and tap **Add to Home Screen**.
4. Make sure **Open as Web App** is on (iOS 26 shows this toggle; it's on by default). Keep the name **SealedEV**, then tap **Add**.
5. Open **SealedEV** from your Home Screen. It launches full-screen with the bottom tab bar, and no Safari address bar.
6. Sign in once. The app keeps its own login, separate from Safari.

**Good to know**
- **Updates:** nothing to do. You always get the latest deployed version.
- **No connection:** you'll see a "You're offline" screen with a Try again button.
- **Refreshing:** there's no pull-to-refresh in Home Screen apps. Switch tabs or reopen the app to reload; prices only change once a day anyway.
- **Removing it:** long-press the icon → **Remove App**.

## B. Build the native app (Mac + Xcode)

The repo includes a Capacitor iOS project in `ios/`. It's a native shell that loads your deployed site. It already has the SealedEV icon and splash screen.

### One-time setup on the Mac
1. Install **Xcode** from the Mac App Store and open it once to install its components.
2. Install **Node.js 22** (from nodejs.org, or `brew install node@22`).
3. Get the code and install dependencies:
   ```bash
   git clone https://github.com/ajestridge40/SealedEV.git
   cd SealedEV
   npm install
   ```

### Point the app at your site and open it in Xcode
```bash
CAP_SERVER_URL=https://your-sealedev-domain npm run ios:sync
npm run ios:open
```
You can also set `CAP_APP_ID=com.yourname.sealedev`. The bundle ID must be unique to your Apple account.

### Install on your iPhone (free Apple ID)
1. Connect the iPhone with a cable and tap **Trust** on the phone.
   - On iOS 16+, also enable **Settings → Privacy & Security → Developer Mode**. The phone restarts.
2. In Xcode, open the **App** target → **Signing & Capabilities**:
   - Tick **Automatically manage signing**.
   - Under **Team**, choose your Apple ID (Xcode → Settings → Accounts → **+** to add it).
   - If Xcode says the bundle identifier is taken, change it, e.g. `com.yourname.sealedev`.
3. At the top of the window, choose your iPhone as the run destination and press **▶ Run**.
4. The first time, the phone blocks the app. Go to **Settings → General → VPN & Device Management**, tap your Apple ID and **Trust** it. Then open SealedEV.

With a free Apple ID the app stops opening after **7 days**; press Run in Xcode again to renew it.

### Keep it permanently / share it (paid developer account)
1. Join the **Apple Developer Program** ($99/year).
2. In Xcode: **Product → Archive → Distribute App → TestFlight & App Store**.
3. In **App Store Connect**, add yourself (and anyone else) as a TestFlight tester.
4. Install the **TestFlight** app on the iPhone and accept the invite. TestFlight builds last 90 days, and you upload a new archive to renew.

> **About the App Store:** Apple usually rejects apps that only wrap a website (guideline 4.2). Personal use and TestFlight are fine. For a public App Store listing you'd want native features first, such as push notifications for price alerts and offline watchlists.
