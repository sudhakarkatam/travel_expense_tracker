import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Cloud,
  Users,
  Scan,
  TrendingUp,
  Zap,
  Check,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  popular?: boolean;
  features: string[];
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    features: [
      'Unlimited trips',
      'Unlimited expenses',
      'Local storage',
      'Basic analytics',
      'CSV export',
      'Photo attachments',
    ],
  },
  {
    id: 'monthly',
    name: 'Pro Monthly',
    price: '$4.99',
    interval: 'per month',
    features: [
      'Everything in Free',
      'Cloud sync & backup',
      'Multi-device access',
      'Group trip sharing',
      'Advanced analytics',
      'AI receipt scanning',
      'Currency conversion',
      'AI spending insights',
      'Priority support',
    ],
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '$39.99',
    interval: 'per year',
    popular: true,
    features: [
      'Everything in Pro Monthly',
      'Save $20 per year',
      'Unlimited AI scans',
      'Custom reports',
      'Data export to Drive',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime Pro',
    price: '$99.99',
    interval: 'one-time',
    features: [
      'Everything in Pro',
      'One-time payment',
      'Lifetime access',
      'All future updates',
      'VIP support',
    ],
  },
];

const PREMIUM_FEATURES = [
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Access your data from any device with automatic cloud backup',
    color: '#6366F1',
  },
  {
    icon: Users,
    title: 'Group Trips',
    description: 'Share trips with friends and split expenses automatically',
    color: '#8B5CF6',
  },
  {
    icon: Scan,
    title: 'AI Receipt Scanning',
    description: 'Scan receipts with AI to extract amounts and details instantly',
    color: '#10B981',
  },
  {
    icon: TrendingUp,
    title: 'Advanced Analytics',
    description: 'Get detailed insights and trends about your spending habits',
    color: '#F59E0B',
  },
  {
    icon: Zap,
    title: 'AI Insights',
    description: 'Smart recommendations to help you save money on your trips',
    color: '#EF4444',
  },
];

export default function PremiumScreen() {
  const router = useRouter();
  const { upgradeToPro, user } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      Alert.alert('Already Free', 'You are already using the free version');
      return;
    }

    Alert.alert(
      'Upgrade to Pro',
      `This is a demo app. In production, this would process payment for ${PRICING_PLANS.find(p => p.id === planId)?.name}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demo Upgrade',
          onPress: async () => {
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
            await upgradeToPro(expiresAt.toISOString());
            Alert.alert(
              'Success!',
              'You have been upgraded to Pro (Demo Mode)',
              [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (user?.isPro) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.proHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proHeaderGradient}
            >
              <Crown size={64} color="#FFFFFF" />
              <Text style={styles.proHeaderTitle}>You're a Pro Member!</Text>
              <Text style={styles.proHeaderSubtitle}>
                Enjoy all premium features
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Pro Features</Text>
            {PREMIUM_FEATURES.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <View key={index} style={styles.featureCard}>
                  <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                    <IconComponent size={24} color={feature.color} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                  <Check size={24} color="#10B981" />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <Crown size={48} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Upgrade to Pro</Text>
            <Text style={styles.headerSubtitle}>
              Unlock powerful features to manage your travel expenses better
            </Text>
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                  <IconComponent size={24} color={feature.color} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          {PRICING_PLANS.map((plan, index) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.popular && styles.planCardPopular,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.8}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.planPriceRow}>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                    <Text style={styles.planInterval}>/ {plan.interval}</Text>
                  </View>
                </View>
                {selectedPlan === plan.id && (
                  <View style={styles.selectedIndicator}>
                    <Check size={20} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, fIndex) => (
                  <View key={fIndex} style={styles.planFeatureRow}>
                    <Check size={16} color="#10B981" />
                    <Text style={styles.planFeatureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {selectedPlan === plan.id && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => handleUpgrade(plan.id)}
                >
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeButtonGradient}
                  >
                    <Text style={styles.upgradeButtonText}>
                      {plan.id === 'free' ? 'Current Plan' : 'Get Started'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>Questions?</Text>
          <Text style={styles.faqText}>
            All plans include a 14-day money-back guarantee. Cancel anytime, no questions asked.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
  },
  headerGradient: {
    padding: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#E0E7FF',
    textAlign: 'center',
    lineHeight: 22,
  },
  proHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16,
  },
  proHeaderGradient: {
    padding: 40,
    alignItems: 'center',
  },
  proHeaderTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 4,
  },
  proHeaderSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#6366F1',
  },
  planCardPopular: {
    borderColor: '#6366F1',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#6366F1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#6366F1',
  },
  planInterval: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeatures: {
    gap: 12,
  },
  planFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planFeatureText: {
    fontSize: 14,
    color: '#64748B',
    flex: 1,
  },
  upgradeButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  faqCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E40AF',
    marginBottom: 8,
  },
  faqText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
