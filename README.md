# Travel Expense Tracker

A React Native application for tracking travel expenses with features like receipt scanning, currency conversion, and expense analytics.

## Project Structure

```
travel_expense_tracker/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies and scripts
├── babel.config.js                  # Babel configuration
├── tsconfig.json                    # TypeScript configuration
├── src/
│   ├── components/                  # Reusable UI components
│   ├── screens/                     # Screen components
│   │   ├── app/                     # Main app screens
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── AnalyticsScreen.tsx
│   │   │   ├── SettingsScreen.tsx
│   │   │   ├── AddExpenseScreen.tsx
│   │   │   ├── AddTripScreen.tsx
│   │   │   ├── TripDetailScreen.tsx
│   │   │   ├── BalanceScreen.tsx
│   │   │   ├── CurrencyConverterScreen.tsx
│   │   │   ├── InsightsScreen.tsx
│   │   │   ├── JoinTripScreen.tsx
│   │   │   ├── PremiumScreen.tsx
│   │   │   └── ScanReceiptScreen.tsx
│   │   └── auth/                    # Authentication screens
│   │       ├── LoginScreen.tsx
│   │       └── SignupScreen.tsx
│   ├── navigation/                  # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── services/                    # API and external services
│   │   ├── auth.ts
│   │   ├── cloudSync.ts
│   │   ├── currency.ts
│   │   ├── currencyConversion.ts
│   │   └── receiptScanning.ts
│   ├── utils/                       # Utility functions
│   │   ├── balance.ts
│   │   ├── export.ts
│   │   └── storage.ts
│   ├── types/                       # TypeScript type definitions
│   │   └── index.ts
│   ├── constants/                   # App constants
│   │   ├── categories.ts
│   │   ├── colors.ts
│   │   └── currencies.ts
│   ├── contexts/                    # React contexts
│   │   └── AppContext.tsx
│   ├── hooks/                       # Custom React hooks
│   └── assets/                      # Images and other assets
│       └── images/
└── README.md
```

## Prerequisites

Before running this project, make sure you have the following installed:

1. **Node.js** (v18 or higher)
2. **npm** or **yarn** or **bun**
3. **Expo CLI** - Install globally:
   ```bash
   npm install -g @expo/cli
   ```
4. **Expo Go app** on your mobile device (for testing on physical device)

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd travel_expense_tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

## Running the Application

### Development Mode

1. **Start the Expo development server:**
   ```bash
   npm start
   # or
   yarn start
   # or
   bun start
   ```

2. **Run on specific platforms:**
   ```bash
   # Run on Android
   npm run android
   
   # Run on iOS (macOS only)
   npm run ios
   
   # Run on web
   npm run web
   ```

### Using Expo Go (Recommended for Development)

1. Install **Expo Go** app on your mobile device:
   - [Android - Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Start the development server:
   ```bash
   npm start
   ```

3. Scan the QR code with:
   - **Android**: Expo Go app
   - **iOS**: Camera app (opens in Expo Go)

### Building for Production

#### Android

```bash
# Build APK
npm run build:android

# Or use EAS Build (recommended)
npx eas build --platform android
```

#### iOS

```bash
# Build for iOS (macOS only)
npm run build:ios

# Or use EAS Build (recommended)
npx eas build --platform ios
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator (macOS only)
- `npm run web` - Run in web browser
- `npm run build:android` - Build Android APK
- `npm run build:ios` - Build iOS app
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Development Workflow

1. **Make changes** to your code in the `src/` directory
2. **Save the file** - the app will automatically reload
3. **Test on multiple devices** using Expo Go
4. **Debug** using React Native Debugger or Chrome DevTools

## Key Features

- 📱 Cross-platform (iOS, Android, Web)
- 📊 Expense tracking and analytics
- 📷 Receipt scanning with OCR
- 💱 Currency conversion
- 🏠 Trip management
- 👥 Multi-user expense sharing
- 🔐 User authentication
- ☁️ Cloud synchronization

## Technologies Used

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **TypeScript** - Type safety
- **React Navigation** - Navigation
- **Expo Vector Icons** - Icons
- **React Query** - Data fetching
- **Zustand** - State management
- **NativeWind** - Styling

## Troubleshooting

### Common Issues

1. **Metro bundler issues:**
   ```bash
   npx expo start --clear
   ```

2. **Dependencies issues:**
   ```bash
   rm -rf node_modules
   npm install
   ```

3. **iOS simulator issues:**
   ```bash
   npx expo run:ios --device
   ```

4. **Android emulator issues:**
   ```bash
   npx expo run:android --device
   ```

### Getting Help

- Check [Expo Documentation](https://docs.expo.dev/)
- Visit [React Native Documentation](https://reactnative.dev/)
- Join [Expo Discord](https://chat.expo.dev/)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.