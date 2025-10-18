import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Lightbulb, TrendingDown, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { generateText } from '@rork/toolkit-sdk';
import { getCategoryInfo } from '@/constants/categories';

interface Insight {
  type: 'tip' | 'warning' | 'success';
  title: string;
  description: string;
}

export default function InsightsScreen() {
  const router = useRouter();
  const { trips, expenses, user } = useApp();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    if (!user?.isPro) {
      router.push('/premium');
      return;
    }

    setLoading(true);
    try {
      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const avgPerExpense = expenses.length > 0 ? totalSpent / expenses.length : 0;

      const byCategory: Record<string, number> = {};
      expenses.forEach(expense => {
        const category = getCategoryInfo(expense.category).label;
        byCategory[category] = (byCategory[category] || 0) + expense.amount;
      });

      const spendingData = Object.entries(byCategory)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      const prompt = `Analyze this travel spending data and provide 3-4 actionable insights and recommendations:

Total Expenses: ${expenses.length}
Total Spent: $${totalSpent.toFixed(2)}
Average per Expense: $${avgPerExpense.toFixed(2)}
Number of Trips: ${trips.length}

Spending by Category:
${spendingData.map(cat => `- ${cat.name}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`).join('\n')}

Please provide insights in this exact format (one insight per line):
TYPE|TITLE|DESCRIPTION

Where TYPE is either 'tip', 'warning', or 'success'.

Example:
tip|Reduce food expenses|You're spending 40% on food. Consider cooking more meals.
warning|High entertainment costs|Entertainment is 30% of budget, try free activities.

Provide 3-4 insights based on the data.`;

      const result = await generateText({ messages: [{ role: 'user', content: prompt }] });

      const parsedInsights: Insight[] = [];
      const lines = result.split('\n').filter(line => line.includes('|'));

      lines.forEach(line => {
        const [type, title, description] = line.split('|').map(s => s.trim());
        if (type && title && description && ['tip', 'warning', 'success'].includes(type)) {
          parsedInsights.push({
            type: type as 'tip' | 'warning' | 'success',
            title,
            description,
          });
        }
      });

      if (parsedInsights.length === 0) {
        parsedInsights.push({
          type: 'tip',
          title: 'Keep Tracking',
          description: 'Continue logging your expenses to get better insights over time.',
        });
      }

      setInsights(parsedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
      setInsights([
        {
          type: 'warning',
          title: 'Error',
          description: 'Failed to generate insights. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (expenses.length > 0) {
      generateInsights();
    }
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return AlertCircle;
      case 'success':
        return TrendingDown;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'warning':
        return '#F59E0B';
      case 'success':
        return '#10B981';
      default:
        return '#6366F1';
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Insights',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!user?.isPro && (
          <TouchableOpacity
            style={styles.proCard}
            onPress={() => router.push('/premium')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.proGradient}
            >
              <Text style={styles.proTitle}>🔒 Pro Feature</Text>
              <Text style={styles.proSubtitle}>
                Upgrade to Pro to unlock AI-powered spending insights
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {user?.isPro && (
          <>
            <View style={styles.header}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <Lightbulb size={48} color="#FFFFFF" />
                <Text style={styles.headerTitle}>Smart Insights</Text>
                <Text style={styles.headerSubtitle}>
                  AI-powered recommendations based on your spending
                </Text>
              </LinearGradient>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Analyzing your spending...</Text>
              </View>
            ) : expenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Lightbulb size={64} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Data Yet</Text>
                <Text style={styles.emptySubtitle}>
                  Start tracking expenses to get personalized insights
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Your Insights</Text>

                  {insights.map((insight, index) => {
                    const IconComponent = getInsightIcon(insight.type);
                    const color = getInsightColor(insight.type);

                    return (
                      <View key={index} style={styles.insightCard}>
                        <View style={[styles.insightIcon, { backgroundColor: `${color}20` }]}>
                          <IconComponent size={24} color={color} />
                        </View>
                        <View style={styles.insightContent}>
                          <Text style={styles.insightTitle}>{insight.title}</Text>
                          <Text style={styles.insightDescription}>
                            {insight.description}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={generateInsights}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.refreshButtonGradient}
                  >
                    <Text style={styles.refreshButtonText}>Generate New Insights</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
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
    padding: 16,
    paddingBottom: 32,
  },
  proCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  proGradient: {
    padding: 24,
    alignItems: 'center',
  },
  proTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  proSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  header: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  headerGradient: {
    padding: 32,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1E293B',
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1E293B',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
