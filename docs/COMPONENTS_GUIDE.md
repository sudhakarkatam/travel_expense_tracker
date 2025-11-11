# 📦 Components Guide

A comprehensive guide to the utility components available in the Travel Expense Tracker app.

---

## Table of Contents

- [ErrorBoundary](#errorboundary)
- [LoadingSpinner](#loadingspinner)
- [EmptyState](#emptystate)
- [Currency Formatter](#currency-formatter)

---

## ErrorBoundary

A React error boundary component that catches JavaScript errors anywhere in the child component tree, logs those errors, and displays a fallback UI.

### Location
`src/components/ErrorBoundary.tsx`

### Usage

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Basic usage
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>

// With custom fallback
<ErrorBoundary 
  fallback={
    <View>
      <Text>Something went wrong with this section</Text>
    </View>
  }
>
  <YourComponent />
</ErrorBoundary>

// With error callback
<ErrorBoundary 
  onError={(error, errorInfo) => {
    console.error('Error caught:', error);
    // Log to error tracking service
  }}
>
  <YourComponent />
</ErrorBoundary>
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `ReactNode` | Yes | - | Components to protect |
| `fallback` | `ReactNode` | No | Default UI | Custom error UI |
| `onError` | `(error, errorInfo) => void` | No | - | Error callback |

### When to Use

- ✅ Wrapping chart components
- ✅ Protecting third-party libraries
- ✅ Around network-dependent components
- ✅ Complex calculation components
- ❌ Not for event handlers (use try-catch)
- ❌ Not for async code (use .catch())

### Example: Protecting Charts

```typescript
<ErrorBoundary
  fallback={
    <View style={styles.chartError}>
      <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
      <Text>Unable to load chart</Text>
    </View>
  }
>
  <PieChart data={data} width={300} height={200} />
</ErrorBoundary>
```

---

## LoadingSpinner

A reusable loading indicator component with customizable appearance and optional text.

### Location
`src/components/LoadingSpinner.tsx`

### Usage

```typescript
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Basic usage
<LoadingSpinner />

// With custom size and color
<LoadingSpinner size="small" color="#8b5cf6" />

// With text
<LoadingSpinner text="Loading your data..." />

// Full screen loading
<LoadingSpinner fullScreen text="Please wait..." />

// Conditional rendering
{isLoading && <LoadingSpinner text="Loading trips..." />}
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `size` | `'small' \| 'large'` | No | `'large'` | Spinner size |
| `color` | `string` | No | `'#8b5cf6'` | Spinner color |
| `text` | `string` | No | - | Loading message |
| `fullScreen` | `boolean` | No | `false` | Full screen mode |

### When to Use

- ✅ API calls in progress
- ✅ Heavy calculations
- ✅ Data fetching
- ✅ File uploads
- ✅ Initial screen load
- ❌ Not for button loading states (use button spinner)

### Example: API Call

```typescript
const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await api.getData();
      setData(result);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Fetching data..." fullScreen />;
  }

  return <View>{/* Your content */}</View>;
};
```

---

## EmptyState

Pre-built empty state components for common scenarios.

### Location
`src/components/EmptyState.tsx`

### Available Components

#### EmptyState (Base)
```typescript
import EmptyState from '@/components/EmptyState';

<EmptyState
  icon="document-outline"
  title="No Data"
  subtitle="Get started by adding your first item"
  actionText="Add Item"
  onActionPress={() => navigate('AddItem')}
  actionIcon="add"
/>
```

#### EmptyTripsState
```typescript
import { EmptyTripsState } from '@/components/EmptyState';

<EmptyTripsState 
  onAddTrip={() => navigation.navigate('AddTrip')} 
/>
```

#### EmptyExpensesState
```typescript
import { EmptyExpensesState } from '@/components/EmptyState';

<EmptyExpensesState 
  onAddExpense={() => navigation.navigate('AddExpense')} 
/>
```

#### EmptySearchState
```typescript
import { EmptySearchState } from '@/components/EmptyState';

<EmptySearchState query={searchQuery} />
```

#### EmptyHistoryState
```typescript
import { EmptyHistoryState } from '@/components/EmptyState';

<EmptyHistoryState />
```

#### EmptyAnalyticsState
```typescript
import { EmptyAnalyticsState } from '@/components/EmptyState';

<EmptyAnalyticsState />
```

#### EmptySettlementsState
```typescript
import { EmptySettlementsState } from '@/components/EmptyState';

<EmptySettlementsState />
```

### Props (Base EmptyState)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `icon` | `string` | No | `'document-outline'` | Ionicons name |
| `title` | `string` | Yes | - | Main heading |
| `subtitle` | `string` | No | - | Description text |
| `actionText` | `string` | No | - | Button text |
| `onActionPress` | `() => void` | No | - | Button callback |
| `actionIcon` | `string` | No | `'add'` | Button icon |

### When to Use

- ✅ Empty lists/arrays
- ✅ No search results
- ✅ First-time user experience
- ✅ Cleared filters
- ❌ Not for loading states
- ❌ Not for errors (use ErrorBoundary)

### Example: Conditional Rendering

```typescript
const TripsList = () => {
  const { trips } = useApp();

  if (trips.length === 0) {
    return (
      <EmptyTripsState 
        onAddTrip={() => navigation.navigate('AddTrip')}
      />
    );
  }

  return (
    <FlatList
      data={trips}
      renderItem={({ item }) => <TripCard trip={item} />}
    />
  );
};
```

---

## Currency Formatter

A comprehensive utility module for formatting currency values consistently across the app.

### Location
`src/utils/currencyFormatter.ts`

### Main Functions

#### formatCurrency
Format a number as currency with proper symbol and decimals.

```typescript
import { formatCurrency } from '@/utils/currencyFormatter';

formatCurrency(1234.56)
// "$1,234.56"

formatCurrency(1234.56, { 
  currency: 'EUR', 
  locale: 'de-DE' 
})
// "1.234,56 €"

formatCurrency(1500000, { compact: true })
// "$1.5M"

formatCurrency(1234.56, { 
  showSymbol: false,
  decimals: 0 
})
// "1,235"
```

**Options:**
- `currency` (string): Currency code (default: 'USD')
- `locale` (string): Locale code (default: 'en-US')
- `showSymbol` (boolean): Show currency symbol (default: true)
- `decimals` (number): Decimal places (default: 2)
- `compact` (boolean): Use compact notation for large numbers (default: false)

#### formatCompactCurrency
Format large amounts with K/M/B notation.

```typescript
formatCompactCurrency(1200)      // "$1.2K"
formatCompactCurrency(1500000)   // "$1.5M"
formatCompactCurrency(2000000000) // "$2.0B"
```

#### getCurrencySymbol
Get the symbol for a currency code.

```typescript
getCurrencySymbol('USD')  // "$"
getCurrencySymbol('EUR')  // "€"
getCurrencySymbol('GBP')  // "£"
getCurrencySymbol('JPY')  // "¥"
getCurrencySymbol('INR')  // "₹"
```

#### getCurrencyName
Get the full name of a currency.

```typescript
getCurrencyName('USD')  // "US Dollar"
getCurrencyName('EUR')  // "Euro"
getCurrencyName('GBP')  // "British Pound"
```

#### parseCurrency
Parse a currency string to a number.

```typescript
parseCurrency("$1,234.56")  // 1234.56
parseCurrency("€1.234,56")  // 1234.56
```

#### formatCurrencyWithSign
Format with explicit +/- sign.

```typescript
formatCurrencyWithSign(100)   // "+$100.00"
formatCurrencyWithSign(-50)   // "-$50.00"
formatCurrencyWithSign(0)     // "$0.00"
```

#### formatCurrencyDifference
Format the difference between two amounts.

```typescript
formatCurrencyDifference(150, 100)  // "+$50.00"
formatCurrencyDifference(80, 100)   // "-$20.00"
```

#### formatPercentageChange
Calculate and format percentage change.

```typescript
formatPercentageChange(120, 100)  // "+20.0%"
formatPercentageChange(80, 100)   // "-20.0%"
formatPercentageChange(100, 0)    // "+∞%"
```

#### Cents Conversion

```typescript
import { 
  amountToCents, 
  centsToAmount, 
  formatCents 
} from '@/utils/currencyFormatter';

amountToCents(12.34)     // 1234
centsToAmount(1234)      // 12.34
formatCents(1234)        // "$12.34"
```

### Supported Currencies

The formatter supports 40+ currencies including:

- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- INR (Indian Rupee)
- AUD (Australian Dollar)
- CAD (Canadian Dollar)
- CHF (Swiss Franc)
- And many more...

### Best Practices

#### ✅ DO:
```typescript
// Use formatCurrency for all currency displays
<Text>{formatCurrency(amount)}</Text>

// Use compact notation for large numbers in limited space
<Text>{formatCurrency(bigAmount, { compact: true })}</Text>

// Pass currency and locale for international support
<Text>{formatCurrency(amount, { 
  currency: userCurrency, 
  locale: userLocale 
})}</Text>
```

#### ❌ DON'T:
```typescript
// Don't format manually
<Text>${amount.toFixed(2)}</Text>

// Don't use string concatenation
<Text>{'$' + amount}</Text>

// Don't ignore locale
<Text>${amount.toLocaleString()}</Text>
```

### Migration Guide

**Before:**
```typescript
const displayAmount = `$${expense.amount.toFixed(2)}`;
const total = `Total: $${totalAmount}`;
```

**After:**
```typescript
import { formatCurrency } from '@/utils/currencyFormatter';

const displayAmount = formatCurrency(expense.amount);
const total = `Total: ${formatCurrency(totalAmount)}`;
```

---

## Complete Example

Here's a complete example using all components together:

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyTripsState } from '@/components/EmptyState';
import { formatCurrency } from '@/utils/currencyFormatter';
import { PieChart } from 'react-native-chart-kit';

const TripsAnalytics = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTrips();
      setTrips(data);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner text="Loading your trips..." fullScreen />;
  }

  // Empty state
  if (trips.length === 0) {
    return (
      <EmptyTripsState 
        onAddTrip={() => navigation.navigate('AddTrip')}
      />
    );
  }

  // Calculate total
  const totalSpent = trips.reduce((sum, trip) => sum + trip.spent, 0);

  // Success state with error boundary
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Trips</Text>
      
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Spent</Text>
        <Text style={styles.totalAmount}>
          {formatCurrency(totalSpent, { compact: true })}
        </Text>
      </View>

      <ErrorBoundary
        fallback={
          <View style={styles.chartError}>
            <Text>Unable to load chart</Text>
          </View>
        }
      >
        <PieChart
          data={chartData}
          width={300}
          height={220}
          chartConfig={chartConfig}
        />
      </ErrorBoundary>

      {/* Rest of your component */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: '#f5f3ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b5cf6',
  },
  chartError: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
});

export default TripsAnalytics;
```

---

## Performance Tips

1. **Memoize Expensive Calculations**
   ```typescript
   const formattedTotal = useMemo(
     () => formatCurrency(total, { compact: true }),
     [total]
   );
   ```

2. **Lazy Load Components**
   ```typescript
   const Chart = React.lazy(() => import('./Chart'));
   
   <Suspense fallback={<LoadingSpinner />}>
     <Chart data={data} />
   </Suspense>
   ```

3. **Batch Updates**
   ```typescript
   // Bad: Multiple re-renders
   setIsLoading(true);
   setError(null);
   setData([]);
   
   // Good: Single re-render
   setState({
     isLoading: true,
     error: null,
     data: [],
   });
   ```

---

## Testing

### Testing ErrorBoundary
```typescript
import { render } from '@testing-library/react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';

test('catches errors and shows fallback', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText('Something went wrong')).toBeTruthy();
});
```

### Testing Currency Formatter
```typescript
import { formatCurrency } from '@/utils/currencyFormatter';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('handles compact notation', () => {
    expect(formatCurrency(1500000, { compact: true })).toBe('$1.5M');
  });
});
```

---

## Troubleshooting

### ErrorBoundary not catching errors?
- Error boundaries only catch errors during rendering
- Use try-catch for event handlers
- Use .catch() for promises

### LoadingSpinner not showing?
- Check if container has proper height
- Ensure parent isn't display: none
- Verify loading state is actually true

### Currency formatting looks wrong?
- Check locale and currency code
- Verify amount is a number, not string
- Use proper options for your use case

---

## Support

For issues or questions:
1. Check this guide
2. Review component source code
3. Check GitHub issues
4. Create a new issue with reproduction steps

---

**Last Updated:** December 2024  
**Version:** 1.0.0