# 🚀 Quick Start Guide - Travel Expense Tracker

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js**: v16 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn**: Latest version
- **Expo CLI**: `npm install -g expo-cli`
- **Expo Go App**: Install on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
- **Git**: For cloning the repository

Optional:
- **Android Studio**: For Android emulator
- **Xcode**: For iOS simulator (Mac only)

---

## 🔧 Installation

### 1. Navigate to Project Directory

```bash
cd C:\Users\Sudhakar\OneDrive\Desktop\travel_expense_tracker\travel_expense_tracker
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

This will install all required packages including:
- React Native
- Expo SDK
- React Navigation
- Chart libraries
- AsyncStorage
- And more...

### 3. Start the Development Server

```bash
npm start
# or
expo start
```

This will:
- Start the Metro bundler
- Open Expo DevTools in your browser
- Display a QR code for mobile testing

---

## 📱 Running on Your Device

### Option 1: Physical Device (Recommended)

**iOS:**
1. Install **Expo Go** from App Store
2. Open Expo Go app
3. Scan the QR code from terminal/browser
4. App will load automatically

**Android:**
1. Install **Expo Go** from Play Store
2. Open Expo Go app
3. Scan the QR code from terminal/browser
4. App will load automatically

### Option 2: iOS Simulator (Mac Only)

```bash
npm run ios
# or
expo start --ios
```

### Option 3: Android Emulator

```bash
npm run android
# or
expo start --android
```

### Option 4: Web Browser (Limited)

```bash
npm run web
# or
expo start --web
```

Note: Some features (camera, location) won't work on web.

---

## 🎯 First Time Setup

### 1. Launch the App
Once running, you'll see the Home screen.

### 2. Create Your First Trip
1. Tap the **purple "+"** button (bottom right)
2. Fill in trip details:
   - **Name**: e.g., "Paris Vacation"
   - **Destination**: e.g., "Paris, France"
   - **Start Date**: Select from calendar
   - **End Date**: Select from calendar
   - **Budget**: e.g., $3000
   - **Currency**: Select USD/EUR/etc.
   - **Cover Image** (optional): Tap to select
3. Tap **"Create Trip"**

### 3. Add Trip Members
1. Open your trip from Home screen
2. Scroll down, tap **"Manage Members"**
3. Tap **"Add Member"**
4. Enter name and details
5. Mark yourself (toggle "This is me")
6. Add more members as needed

### 4. Add Your First Expense
1. From trip detail screen, tap **"Add Expense"**
2. Fill in:
   - **Amount**: e.g., 150
   - **Description**: e.g., "Hotel Night 1"
   - **Category**: Select from list
   - **Date**: Select from calendar
   - **Who Paid**: Select member
   - **Split Between**: Select who shares cost
   - **Split Type**: Equal/Percentage/Custom
3. Add receipt photo (optional)
4. Tap **"Save"**

### 5. Explore Features

**Check Balances:**
- Navigate to **"Balance"** tab (bottom navigation)
- See who owes whom
- Tap **"Mark as Settled"** when paid

**Convert Currency:**
- Navigate to **"Currency"** tab
- Select currencies
- Enter amount
- See live conversion

**View Insights:**
- Navigate to **"Insights"** tab
- See AI-powered spending analysis
- Review predictions and recommendations

**Analytics:**
- Navigate to **"Analytics"** tab
- View charts and breakdowns
- Analyze spending patterns

---

## 🧪 Testing New Features

### Test Budget Progress (HomeScreen)

**Scenario 1: Normal Budget**
1. Create trip with $1000 budget
2. Add expenses totaling $500
3. ✅ Should show: 50% progress, green bar

**Scenario 2: Near Limit**
1. Add more expenses to reach $850
2. ✅ Should show: 85% progress, yellow bar, "Near Limit"

**Scenario 3: Over Budget**
1. Add expenses to reach $1200
2. ✅ Should show: 100% progress (capped), red bar, "Over Budget", "$200 over budget!"

**Scenario 4: Zero Budget**
1. Create trip with $0 budget
2. Add any expense
3. ✅ Should not crash, shows gracefully

### Test Split Calculations

**Scenario 1: Equal Split**
1. Add expense: $100
2. Split equally between 3 people
3. ✅ Should split: $33.34, $33.33, $33.33 (total exactly $100)

**Scenario 2: Percentage Split**
1. Add expense: $100
2. Split: 50%, 30%, 20%
3. ✅ Should split: $50.00, $30.00, $20.00

**Scenario 3: Custom Split**
1. Add expense: $100
2. Custom amounts: $40, $35, $25
3. ✅ Should accept and save

**Scenario 4: Rounding Edge Case**
1. Add expense: $0.01
2. Split equally between 2 people
3. ✅ Should split: $0.01, $0.00 (no error)

### Test Balance & Settlement

**Scenario 1: Simple Balance**
1. Create trip with Alice, Bob
2. Alice pays $100, split equally
3. Navigate to Balance screen
4. ✅ Should show: Bob owes Alice $50

**Scenario 2: Multiple Expenses**
1. Alice pays $100, split equally
2. Bob pays $60, split equally
3. ✅ Should show: Bob owes Alice $20 (simplified)

**Scenario 3: Settlement**
1. Tap **"Mark as Settled"** on balance
2. Select payment method: UPI
3. Add note: "Paid via PayPal"
4. Confirm
5. ✅ Should appear in settlement history
6. ✅ Balance should update or disappear

**Scenario 4: All Settled**
1. Settle all balances
2. ✅ Should show: "All Settled Up! 🎉"

### Test Currency Converter

**Scenario 1: Live Conversion**
1. Navigate to Currency Converter
2. Pull down to refresh rates
3. ✅ Should load latest rates with timestamp

**Scenario 2: Offline Mode**
1. Turn off internet
2. Open Currency Converter
3. ✅ Should show "Using cached rates" banner
4. ✅ Should still convert using last fetched rates

**Scenario 3: Currency Search**
1. Tap "From" currency selector
2. Search "indian"
3. ✅ Should filter to show INR

**Scenario 4: Swap Currencies**
1. Set: USD → EUR, amount 100
2. Tap swap button
3. ✅ Should reverse: EUR → USD with converted amount

### Test Insights

**Scenario 1: Empty State**
1. New app with no expenses
2. Navigate to Insights
3. ✅ Should show: "No Data Yet" with "Add First Expense" button

**Scenario 2: Budget Alert**
1. Create trip with $500 budget
2. Add expenses totaling $480
3. Navigate to Insights
4. ✅ Should show: "Budget Watch" insight (96% used)

**Scenario 3: Spending Forecast**
1. Add 10+ expenses over several days
2. Check Insights
3. ✅ Should show: Prediction card with estimated monthly total

**Scenario 4: Period Switching**
1. Tap "This Week"
2. ✅ Should filter insights to last 7 days
3. Tap "This Month"
4. ✅ Should filter to last 30 days

---

## 🐛 Troubleshooting

### Issue: Metro bundler won't start

**Solution:**
```bash
# Clear cache and restart
expo start -c
# or
npm start -- --reset-cache
```

### Issue: "Module not found" errors

**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue: App won't load on phone

**Solutions:**
1. Ensure phone and computer are on **same WiFi network**
2. Check firewall settings (allow Expo on port 19000)
3. Try manually entering URL in Expo Go app
4. Restart Expo server: `Ctrl+C`, then `npm start`

### Issue: "Unable to resolve module"

**Solution:**
```bash
# Reset Metro cache
expo start -c

# If persists, reinstall
rm -rf node_modules
npm install
expo start
```

### Issue: Currency rates not loading

**Check:**
1. Internet connection active
2. API quota not exceeded (1500/month free)
3. Check console for error messages
4. Falls back to cached rates automatically

### Issue: Charts not displaying

**Solution:**
1. Ensure you have expenses in the selected period
2. Check console for errors
3. Try rotating device
4. Refresh the screen (pull down)

### Issue: Images not loading

**Check:**
1. Camera/photo permissions granted
2. Storage space available
3. Image picker working (try different source)
4. Check console for errors

---

## 📊 Feature Testing Checklist

### ✅ Core Features
- [ ] Create trip
- [ ] Edit trip
- [ ] Delete trip
- [ ] Add expense
- [ ] Edit expense
- [ ] Delete expense
- [ ] Add trip member
- [ ] Remove trip member
- [ ] Upload cover image
- [ ] Attach receipt photo

### ✅ Budget & Calculations
- [ ] Budget progress displays correctly
- [ ] Color coding works (green/yellow/red)
- [ ] Over-budget warning appears
- [ ] Equal split is cent-accurate
- [ ] Percentage split totals 100%
- [ ] Custom split validates correctly
- [ ] Currency formatting consistent

### ✅ Balance & Settlement
- [ ] Balances calculate correctly
- [ ] Debt simplification works
- [ ] Settlement modal opens
- [ ] Payment methods selectable
- [ ] Settlement records in history
- [ ] "All Settled" appears when done

### ✅ Currency Converter
- [ ] Rates load on first launch
- [ ] Pull-to-refresh updates rates
- [ ] Offline mode uses cache
- [ ] Currency search works
- [ ] Swap button works
- [ ] Live conversion calculates
- [ ] Quick conversions accurate

### ✅ Insights & Analytics
- [ ] Period selector works
- [ ] Stats display correctly
- [ ] Insights generate properly
- [ ] Forecast shows prediction
- [ ] Charts render without errors
- [ ] Day-of-week chart accurate
- [ ] Category breakdown correct
- [ ] Recommendations display

### ✅ Navigation
- [ ] Bottom tabs work
- [ ] Screen transitions smooth
- [ ] Back button functions
- [ ] Deep linking (if needed)
- [ ] Modals open/close properly

### ✅ Data Persistence
- [ ] Data saves automatically
- [ ] Data persists after app restart
- [ ] AsyncStorage working
- [ ] Export/import functions (if implemented)

---

## 🔍 Performance Testing

### Load Time Tests
```
Expected Performance:
- Cold start: < 3 seconds
- Warm start: < 1 second
- Screen navigation: < 300ms
- Add expense: < 200ms
- Calculate balances: < 100ms
```

### Memory Tests
```
Expected Memory Usage:
- Idle: ~50-80 MB
- Active: ~80-120 MB
- Peak: < 150 MB
- After 30 mins: No significant increase (no leaks)
```

### Network Tests
```
Currency API:
- First load: ~500-1000ms (acceptable)
- Cached load: < 50ms (should be instant)
- Offline: Falls back gracefully
```

---

## 📱 Device Testing

### Minimum Recommended:
- **iOS**: iOS 13.0+
- **Android**: Android 6.0+ (API 23+)

### Test on Various Screen Sizes:
- [ ] Small phones (iPhone SE, 5.5")
- [ ] Medium phones (iPhone 12, 6.1")
- [ ] Large phones (iPhone 14 Pro Max, 6.7")
- [ ] Tablets (iPad, 10")
- [ ] Different aspect ratios

### Test Orientations:
- [ ] Portrait mode (primary)
- [ ] Landscape mode (should work)
- [ ] Rotation handling

---

## 🎨 UI/UX Testing

### Visual Testing:
- [ ] All icons display correctly
- [ ] Images load properly
- [ ] Colors consistent across screens
- [ ] Text readable at all sizes
- [ ] Spacing looks good
- [ ] Buttons tap-able (44x44 minimum)

### Interaction Testing:
- [ ] Buttons respond to touch
- [ ] Forms validate input
- [ ] Error messages clear
- [ ] Success feedback present
- [ ] Loading states shown
- [ ] Scroll works smoothly

### Accessibility Testing:
- [ ] Text scales with system settings
- [ ] Color contrast sufficient
- [ ] Touch targets large enough
- [ ] Error states clear
- [ ] Success states obvious

---

## 📝 Development Tips

### Debugging:
```bash
# Open React Native Debugger
# Press Ctrl+M (Android) or Cmd+D (iOS)
# Or shake device
# Select "Debug"
```

### View Logs:
```bash
# Terminal shows logs automatically
# Or use:
npx react-native log-android
npx react-native log-ios
```

### Hot Reload:
- **Enabled by default** - Changes appear automatically
- If not working, press `R` to reload
- Or shake device and select "Reload"

### Clear Cache:
```bash
expo start -c
# or
npm start -- --clear
```

---

## 🚀 Build for Production

### Android APK:
```bash
expo build:android
# or
eas build --platform android
```

### iOS IPA:
```bash
expo build:ios
# or
eas build --platform ios
```

### Web Version:
```bash
expo build:web
```

---

## 📚 Additional Resources

### Documentation:
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)

### Project Docs:
- `IMPLEMENTATION_STATUS.md` - Current progress
- `FEATURES_COMPLETED.md` - What's been built
- `FEATURES_ROADMAP.md` - Future plans

### Support:
- Check GitHub Issues
- Review error logs
- Test on physical device
- Consult documentation

---

## ✅ Ready to Go!

You're all set! The app should now be running. Here's what to try first:

1. **Create a sample trip** (e.g., "Test Trip to London")
2. **Add 2-3 members** (yourself and friends)
3. **Add some expenses** with different split types
4. **Check the Balance screen** to see calculations
5. **Try the Currency Converter** with different currencies
6. **View Insights** to see AI analysis
7. **Explore Analytics** for charts and breakdowns

**Pro Tips:**
- Use real trip data for accurate testing
- Test with different numbers of participants
- Try various expense amounts
- Check edge cases (zero budget, over budget, etc.)
- Test offline mode by disconnecting internet

**Have fun building the best travel expense tracker! 🎉**

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check this guide** - Most common issues covered
2. **Review error messages** - They usually point to the problem
3. **Restart the server** - Clears many issues
4. **Clear cache** - Fixes module resolution problems
5. **Reinstall dependencies** - Last resort

**Common Commands:**
```bash
# Restart clean
expo start -c

# Reinstall everything
rm -rf node_modules && npm install

# Check for issues
npm run lint

# View logs
npx react-native log-android
```

Good luck! 🚀