import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, Surface, Divider, Chip } from "react-native-paper";
import { useApp } from "@/contexts/AppContext";
import { formatCurrency } from "@/utils/currencyFormatter";
import { formatDateTime } from "@/utils/dateFormatter";
import { MotiView } from "moti";

const { width } = Dimensions.get("window");

interface ExpenseDetailScreenProps {
  navigation: any;
  route: any;
}

export default function ExpenseDetailScreen({ navigation, route }: ExpenseDetailScreenProps) {
  const theme = useTheme();
  const { expenseId, tripId } = route.params;
  const { getTrip, getTripExpenses, deleteExpense, user } = useApp();

  const trip = useMemo(() => getTrip(tripId), [tripId, getTrip]);
  const expenses = useMemo(() => getTripExpenses(tripId), [tripId, getTripExpenses]);
  const expense = useMemo(() => expenses.find(e => e.id === expenseId), [expenses, expenseId]);

  if (!expense || !trip) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Text style={{ color: theme.colors.onSurface }}>Expense not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.colors.primary }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paidByParticipant = trip.participants.find(p => p.id === expense.paidBy);
  const paidByName = paidByParticipant?.name || "Unknown";
  const currentUserParticipant = trip.participants.find(p => p.isCurrentUser);
  const currentUserIdInTrip = currentUserParticipant?.id || user?.id;
  const isCurrentUserPayer = expense.paidBy === currentUserIdInTrip;

  const handleDelete = () => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteExpense(expense.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const [selectedReceipt, setSelectedReceipt] = React.useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Expense Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate("EditExpense", { expenseId, tripId })}>
          <Text style={[styles.editButton, { color: theme.colors.primary }]}>Edit</Text>
        </TouchableOpacity>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 } as any}
        >
          {/* Main Amount Card */}
          <Surface style={[styles.amountCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <Ionicons
                name={getCategoryIcon(expense.category)}
                size={32}
                color={theme.colors.onPrimaryContainer}
              />
            </View>
            <Text style={[styles.description, { color: theme.colors.onSurface }]}>{expense.description}</Text>
            <Text style={[styles.amount, { color: theme.colors.primary }]}>
              {formatCurrency(expense.amount, { currency: expense.currency })}
            </Text>
            <View style={styles.metaRow}>
              <Chip icon="calendar" style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.onSurfaceVariant }}>
                {formatDateTime(expense.createdAt || expense.date)}
              </Chip>
              <Chip icon="tag" style={{ backgroundColor: theme.colors.surfaceVariant, marginLeft: 8 }} textStyle={{ color: theme.colors.onSurfaceVariant }}>
                {expense.category}
              </Chip>
            </View>
          </Surface>

          {/* Notes Section */}
          {expense.notes && (
            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Notes</Text>
              <Text style={[styles.notesText, { color: theme.colors.onSurface }]}>{expense.notes}</Text>
            </Surface>
          )}

          {/* Paid By Section */}
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Paid By</Text>
            <View style={styles.payerRow}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                <Text style={{ color: theme.colors.onPrimary, fontWeight: 'bold' }}>
                  {paidByName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.payerName, { color: theme.colors.onSurface }]}>
                {isCurrentUserPayer ? "You" : paidByName}
              </Text>
              <Text style={[styles.payerAmount, { color: theme.colors.onSurface }]}>
                {formatCurrency(expense.amount, { currency: expense.currency })}
              </Text>
            </View>
          </Surface>

          {/* Split Details */}
          <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Shared With</Text>
            {expense.splitBetween.map((split, index) => {
              const participant = trip.participants.find(p => p.id === split.userId);
              const isMe = split.userId === user?.id;
              return (
                <View key={split.userId}>
                  <View style={styles.splitRow}>
                    <View style={[styles.avatar, { backgroundColor: theme.colors.secondary }]}>
                      <Text style={{ color: theme.colors.onSecondary, fontWeight: 'bold' }}>
                        {participant?.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <Text style={[styles.splitName, { color: theme.colors.onSurface }]}>
                      {isMe ? "You" : participant?.name || "Unknown"}
                    </Text>
                    <Text style={[styles.splitAmount, { color: theme.colors.onSurface }]}>
                      {formatCurrency(split.amount, { currency: expense.currency })}
                    </Text>
                  </View>
                  {index < expense.splitBetween.length - 1 && <Divider />}
                </View>
              );
            })}
          </Surface>

          {/* Receipts */}
          {expense.receiptImages && expense.receiptImages.length > 0 && (
            <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurfaceVariant }]}>Receipts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.receiptsScroll}>
                {expense.receiptImages.map((uri, index) => (
                  <TouchableOpacity key={index} onPress={() => setSelectedReceipt(uri)}>
                    <Image source={{ uri }} style={styles.receiptImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Surface>
          )}

          {/* Delete Button */}
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: theme.colors.error }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.deleteButtonText, { color: theme.colors.error }]}>Delete Expense</Text>
          </TouchableOpacity>

        </MotiView>
      </ScrollView>

      {/* Full Screen Receipt Modal */}
      <Modal
        visible={!!selectedReceipt}
        transparent={true}
        onRequestClose={() => setSelectedReceipt(null)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedReceipt(null)}
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          {selectedReceipt && (
            <Image
              source={{ uri: selectedReceipt }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getCategoryIcon(category: string): any {
  const map: Record<string, string> = {
    food: "restaurant",
    transport: "bus",
    accommodation: "bed",
    shopping: "cart",
    entertainment: "film",
    others: "ellipsis-horizontal",
  };
  return map[category.toLowerCase()] || "receipt";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  amountCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payerName: {
    fontSize: 16,
    flex: 1,
  },
  payerAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  splitName: {
    fontSize: 16,
    flex: 1,
  },
  splitAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  receiptsScroll: {
    flexDirection: 'row',
  },
  receiptImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#eee',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: width,
    height: width * 1.5,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
});
