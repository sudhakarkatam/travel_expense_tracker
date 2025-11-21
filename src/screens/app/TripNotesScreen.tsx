import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Alert,
    Dimensions,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, FAB, Chip, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/contexts/AppContext';
import { Note } from '@/types';
import { MotiView, AnimatePresence } from 'moti';
import * as Haptics from 'expo-haptics';
import { formatDateTime } from '@/utils/dateFormatter';
import { LinearGradient } from 'expo-linear-gradient';

// Updated TripNotesScreen
interface TripNotesScreenProps {
    navigation: any;
    route: any;
}

const NOTE_CATEGORIES = [
    { id: 'general', label: 'General', icon: 'document-text-outline', color: '#64748b' },
    { id: 'thoughts', label: 'Thoughts', icon: 'bulb-outline', color: '#8b5cf6' },
    { id: 'journal', label: 'Journal', icon: 'book-outline', color: '#ec4899' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline', color: '#f59e0b' },
    { id: 'transport', label: 'Transport', icon: 'bus-outline', color: '#3b82f6' },
    { id: 'stay', label: 'Stay', icon: 'bed-outline', color: '#6366f1' },
    { id: 'sightseeing', label: 'Sights', icon: 'camera-outline', color: '#10b981' },
    { id: 'shopping', label: 'Shopping', icon: 'cart-outline', color: '#db2777' },
];

const NOTE_COLORS = ['#ffffff', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2', '#f3f4f6'];

const NOTE_TEMPLATES: Record<string, { title: string; content: string }[]> = {
    general: [
        { title: 'Daily Summary', content: '📅 Date:\n\n✨ Highlights:\n- \n\n📝 Notes:\n- ' },
        { title: 'Quick Reminder', content: '⚠️ Reminder:\n\n⏰ Time:\n\n📍 Location:\n' },
        { title: 'To-Do List', content: '📝 To-Do:\n\n[ ] \n[ ] \n[ ] \n' },
    ],
    thoughts: [
        { title: 'Idea', content: '💡 Idea:\n\n🤔 Why:\n\n🚀 Next Steps:\n' },
        { title: 'Reflection', content: '💭 Reflection:\n\nWhat went well?\n- \n\nWhat could be better?\n- \n' },
        { title: 'Observation', content: '👀 Observation:\n\nWhere:\n\nWhat I noticed:\n' },
    ],
    journal: [
        { title: 'Morning Pages', content: '☀️ Morning Thoughts:\n\n🎯 Intentions for today:\n- \n\n🙏 Grateful for:\n- \n' },
        { title: 'Evening Recap', content: '🌙 Evening Recap:\n\nBest moment:\n\nChallenge faced:\n\nTomorrow\'s focus:\n' },
        { title: 'Memorable Moment', content: '✨ Moment:\n\n📍 Location:\n\n👥 With:\n\n📝 Description:\n' },
    ],
    food: [
        { title: 'Restaurant Review', content: '🍽️ Restaurant:\n\n⭐ Rating: /5\n\n🍲 Ordered:\n- \n\n💰 Price:\n\n📝 Review:\n' },
        { title: 'Must Try', content: '😋 Dish:\n\n📍 Where:\n\n📝 Notes:\n' },
    ],
    transport: [
        { title: 'Flight Details', content: '✈️ Flight:\n\n🕒 Departure:\n\n🕒 Arrival:\n\n🎫 Booking Ref:\n\n💺 Seat:\n' },
        { title: 'Train/Bus', content: '🚆 Route:\n\n🕒 Time:\n\n🎫 Ticket:\n\nPlatform/Stop:\n' },
    ],
    stay: [
        { title: 'Hotel Check-in', content: '🏨 Hotel:\n\n📍 Address:\n\n🕒 Check-in:\n\n🕒 Check-out:\n\n📶 Wifi:\n' },
    ],
    sightseeing: [
        { title: 'Place to Visit', content: '🏛️ Place:\n\n📍 Location:\n\n🕒 Opening Hours:\n\n🎫 Ticket Price:\n\n📝 Must see:\n' },
    ],
    shopping: [
        { title: 'Shopping List', content: '🛍️ Shop:\n\nItems:\n- \n- \n' },
        { title: 'Souvenirs', content: '🎁 For:\n\nItem:\n\nBudget:\n' },
    ],
};

export default function TripNotesScreen({ navigation, route }: TripNotesScreenProps) {
    const theme = useTheme();
    const { tripId } = route.params;
    const { trips, updateTrip } = useApp();
    const trip = trips.find(t => t.id === tripId);

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [templateCategory, setTemplateCategory] = useState('general');

    const safeTheme = {
        colors: {
            background: theme?.colors?.background || '#FFFFFF',
            surface: theme?.colors?.surface || '#FFFFFF',
            surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
            onSurface: theme?.colors?.onSurface || '#000000',
            onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
            primary: theme?.colors?.primary || '#8b5cf6',
            onPrimary: theme?.colors?.onPrimary || '#FFFFFF',
            error: theme?.colors?.error || '#EF4444',
            outline: theme?.colors?.outline || '#E5E5E5',
            outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
            elevation: {
                level1: theme?.colors?.elevation?.level1 || '#F3F4F6',
            }
        },
    };

    const notes = useMemo(() => {
        if (!trip?.notes) return [];
        return trip.notes
            .filter(note =>
                note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.content.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }, [trip?.notes, searchQuery]);

    const handleSaveNote = async () => {
        if (!noteTitle.trim() && !noteContent.trim()) return;

        const newNote: Note = {
            id: editingNote ? editingNote.id : `note_${Date.now()}`,
            title: noteTitle.trim() || 'Untitled Note',
            content: noteContent.trim(),
            createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            color: selectedColor,
            category: selectedCategory,
        };

        let updatedNotes = trip?.notes || [];
        if (editingNote) {
            updatedNotes = updatedNotes.map(n => n.id === editingNote.id ? newNote : n);
        } else {
            updatedNotes = [newNote, ...updatedNotes];
        }

        await updateTrip(tripId, { notes: updatedNotes });

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        closeModal();
    };

    const handleDeleteNote = async (noteId: string) => {
        Alert.alert(
            "Delete Note",
            "Are you sure you want to delete this note?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const updatedNotes = (trip?.notes || []).filter(n => n.id !== noteId);
                        await updateTrip(tripId, { notes: updatedNotes });
                        if (Platform.OS !== 'web') {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    }
                }
            ]
        );
    };

    const openModal = (note?: Note) => {
        if (note) {
            setEditingNote(note);
            setNoteTitle(note.title);
            setNoteContent(note.content);
            setSelectedColor(note.color || null);
            setSelectedCategory(note.category || 'general');
        } else {
            setEditingNote(null);
            setNoteTitle('');
            setNoteContent('');
            setSelectedColor(null);
            setSelectedCategory('general');
        }
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
    };

    const openTemplateModal = () => {
        setTemplateCategory(selectedCategory); // Start with current category
        setIsTemplateModalVisible(true);
    };

    const applyTemplate = (template: { title: string; content: string }) => {
        // If content is empty, just replace. If not, ask user or append?
        // For simplicity and "user can edit that template text", we'll replace if empty, or append if not.
        if (!noteContent.trim()) {
            setNoteTitle(template.title);
            setNoteContent(template.content);
        } else {
            Alert.alert(
                "Apply Template",
                "Do you want to replace your current note or append the template?",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Append",
                        onPress: () => setNoteContent(prev => prev + '\n\n' + template.content)
                    },
                    {
                        text: "Replace",
                        style: 'destructive',
                        onPress: () => {
                            setNoteTitle(template.title);
                            setNoteContent(template.content);
                        }
                    }
                ]
            );
        }
        setIsTemplateModalVisible(false);
    };

    const getCategoryIcon = (catId: string) => {
        return NOTE_CATEGORIES.find(c => c.id === catId)?.icon || 'document-text-outline';
    };

    const getCategoryColor = (catId: string) => {
        return NOTE_CATEGORIES.find(c => c.id === catId)?.color || safeTheme.colors.onSurfaceVariant;
    };

    const renderNoteContent = (content: string, textColor: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = content.split(urlRegex);

        return (
            <Text style={[styles.notePreview, { color: textColor }]} numberOfLines={3}>
                {parts.map((part, index) => {
                    if (part.match(urlRegex)) {
                        return (
                            <Text
                                key={index}
                                style={{ color: safeTheme.colors.primary, textDecorationLine: 'underline' }}
                                onPress={() => Linking.openURL(part).catch(err => console.error("Couldn't load page", err))}
                            >
                                {part}
                            </Text>
                        );
                    }
                    return <Text key={index}>{part}</Text>;
                })}
            </Text>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={safeTheme.colors.onSurface} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, { color: safeTheme.colors.onSurface }]}>Trip Notes</Text>
                    <Text style={[styles.headerSubtitle, { color: safeTheme.colors.onSurfaceVariant }]}>
                        {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
                    </Text>
                </View>
                <View style={styles.backButton} />
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, { backgroundColor: safeTheme.colors.surfaceVariant }]}>
                <Ionicons name="search" size={20} color={safeTheme.colors.onSurfaceVariant} />
                <TextInput
                    style={[styles.searchInput, { color: safeTheme.colors.onSurface }]}
                    placeholder="Search notes..."
                    placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color={safeTheme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Notes List */}
            <ScrollView contentContainerStyle={styles.notesList} showsVerticalScrollIndicator={false}>
                <AnimatePresence>
                    {notes.length === 0 ? (
                        <MotiView
                            from={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            style={styles.emptyState}
                        >
                            <Ionicons name="document-text-outline" size={64} color={safeTheme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                            <Text style={[styles.emptyStateText, { color: safeTheme.colors.onSurfaceVariant }]}>
                                {searchQuery ? "No notes found" : "No notes yet. Tap + to add one."}
                            </Text>
                        </MotiView>
                    ) : (
                        notes.map((note, index) => {
                            // Determine text color based on note background
                            // If note has a color (and it's not null/undefined), it's a custom pastel color -> Use Black text
                            // If note.color is null/undefined, it uses theme surface -> Use theme text (White in dark, Black in light)
                            const isCustomColor = !!note.color;
                            const textColor = isCustomColor ? '#000000' : safeTheme.colors.onSurface;
                            const subTextColor = isCustomColor ? '#444444' : safeTheme.colors.onSurfaceVariant;

                            return (
                                <MotiView
                                    key={note.id}
                                    from={{ opacity: 0, translateY: 20 }}
                                    animate={{ opacity: 1, translateY: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: 'timing', duration: 300, delay: index * 50 } as any}
                                >
                                    <TouchableOpacity
                                        onPress={() => openModal(note)}
                                        onLongPress={() => handleDeleteNote(note.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Surface style={[styles.noteCard, { backgroundColor: note.color || safeTheme.colors.surface }]} elevation={2}>
                                            <View style={styles.noteHeader}>
                                                <View style={styles.noteTitleContainer}>
                                                    <Text style={[styles.noteTitle, { color: textColor }]} numberOfLines={1}>
                                                        {note.title}
                                                    </Text>
                                                    {note.category && (
                                                        <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(note.category) + '20' }]}>
                                                            <Ionicons name={getCategoryIcon(note.category) as any} size={12} color={getCategoryColor(note.category)} />
                                                            <Text style={[styles.categoryText, { color: getCategoryColor(note.category) }]}>
                                                                {NOTE_CATEGORIES.find(c => c.id === note.category)?.label}
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={[styles.noteDate, { color: subTextColor }]}>
                                                    {formatDateTime(note.updatedAt)}
                                                </Text>
                                            </View>
                                            {renderNoteContent(note.content, subTextColor)}
                                        </Surface>
                                    </TouchableOpacity>
                                </MotiView>
                            );
                        })
                    )}
                </AnimatePresence>
            </ScrollView>

            {/* FAB */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: safeTheme.colors.primary }]}
                color={safeTheme.colors.onPrimary}
                onPress={() => openModal()}
            />

            {/* Edit/Add Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={closeModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={[styles.modalContainer, { backgroundColor: safeTheme.colors.background }]}
                >
                    {/* Modal Header - Title Only */}
                    <SafeAreaView edges={['top']} style={{ backgroundColor: safeTheme.colors.background }}>
                        <View style={[styles.modalHeader, { borderBottomColor: safeTheme.colors.outlineVariant }]}>
                            <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>
                                {editingNote ? 'Edit Note' : 'New Note'}
                            </Text>
                            <TouchableOpacity onPress={openTemplateModal} style={styles.templateButton}>
                                <Ionicons name="grid-outline" size={20} color={safeTheme.colors.primary} />
                                <Text style={[styles.templateButtonText, { color: safeTheme.colors.primary }]}>Templates</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>

                    <ScrollView style={styles.modalContent}>
                        {/* Category Selector */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelector}>
                            {NOTE_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        selectedCategory === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color },
                                        { borderColor: safeTheme.colors.outline }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Ionicons
                                        name={cat.icon as any}
                                        size={16}
                                        color={selectedCategory === cat.id ? cat.color : safeTheme.colors.onSurfaceVariant}
                                    />
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: selectedCategory === cat.id ? cat.color : safeTheme.colors.onSurfaceVariant }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        {/* Color Picker */}
                        <View style={styles.colorPicker}>
                            {/* Default Option */}
                            <TouchableOpacity
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: safeTheme.colors.surface, borderColor: safeTheme.colors.outline },
                                    selectedColor === null && { borderWidth: 2, borderColor: safeTheme.colors.primary }
                                ]}
                                onPress={() => setSelectedColor(null)}
                            >
                                {selectedColor === null && <View style={[styles.colorSelectedIndicator, { backgroundColor: safeTheme.colors.primary }]} />}
                            </TouchableOpacity>

                            {NOTE_COLORS.map(color => (
                                <TouchableOpacity
                                    key={color}
                                    style={[
                                        styles.colorOption,
                                        { backgroundColor: color },
                                        selectedColor === color && { borderWidth: 2, borderColor: safeTheme.colors.primary }
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>

                        <TextInput
                            style={[styles.titleInput, { color: safeTheme.colors.onSurface }]}
                            placeholder="Title"
                            placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                            value={noteTitle}
                            onChangeText={setNoteTitle}
                        />

                        <TextInput
                            style={[styles.contentInput, { color: safeTheme.colors.onSurface }]}
                            placeholder="Start typing..."
                            placeholderTextColor={safeTheme.colors.onSurfaceVariant}
                            multiline
                            textAlignVertical="top"
                            value={noteContent}
                            onChangeText={setNoteContent}
                        />
                    </ScrollView>

                    {/* Modal Footer */}
                    <View style={[styles.modalFooter, { borderTopColor: safeTheme.colors.outlineVariant, backgroundColor: safeTheme.colors.surface }]}>
                        <TouchableOpacity
                            onPress={closeModal}
                            style={[styles.footerButton, { backgroundColor: safeTheme.colors.surfaceVariant }]}
                        >
                            <Text style={[styles.footerButtonText, { color: safeTheme.colors.onSurface }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSaveNote}
                            style={[styles.footerButton, { backgroundColor: safeTheme.colors.primary }]}
                        >
                            <Text style={[styles.footerButtonText, { color: safeTheme.colors.onPrimary }]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Template Selection Modal */}
            <Modal
                visible={isTemplateModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsTemplateModalVisible(false)}
            >
                <SafeAreaView style={[styles.container, { backgroundColor: safeTheme.colors.background }]}>
                    <View style={[styles.modalHeader, { borderBottomColor: safeTheme.colors.outlineVariant, paddingTop: Platform.OS === 'ios' ? 20 : 0 }]}>
                        <Text style={[styles.modalTitle, { color: safeTheme.colors.onSurface }]}>Select Template</Text>
                        <TouchableOpacity onPress={() => setIsTemplateModalVisible(false)} style={styles.modalHeaderButton}>
                            <Ionicons name="close" size={24} color={safeTheme.colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.templateCategoryContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateCategories}>
                            {NOTE_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.templateCategoryChip,
                                        templateCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                                        { borderColor: safeTheme.colors.outline }
                                    ]}
                                    onPress={() => setTemplateCategory(cat.id)}
                                >
                                    <Text style={[
                                        styles.templateCategoryText,
                                        { color: templateCategory === cat.id ? '#FFF' : safeTheme.colors.onSurface }
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {NOTE_TEMPLATES[templateCategory]?.map((template, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.templateCard, { backgroundColor: safeTheme.colors.surface, borderColor: safeTheme.colors.outline }]}
                                onPress={() => applyTemplate(template)}
                            >
                                <Text style={[styles.templateTitle, { color: safeTheme.colors.onSurface }]}>{template.title}</Text>
                                <Text style={[styles.templatePreview, { color: safeTheme.colors.onSurfaceVariant }]} numberOfLines={2}>
                                    {template.content}
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {(!NOTE_TEMPLATES[templateCategory] || NOTE_TEMPLATES[templateCategory].length === 0) && (
                            <View style={styles.emptyTemplateState}>
                                <Text style={{ color: safeTheme.colors.onSurfaceVariant }}>No templates for this category yet.</Text>
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        textAlign: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
    },
    notesList: {
        padding: 16,
        paddingBottom: 80,
    },
    noteCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    noteHeader: {
        marginBottom: 8,
    },
    noteTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    noteTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 8,
    },
    categoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '600',
    },
    noteDate: {
        fontSize: 12,
    },
    notePreview: {
        fontSize: 14,
        lineHeight: 20,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        borderRadius: 28,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
    },
    emptyStateText: {
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalHeaderLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    modalHeaderRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    modalHeaderButton: {
        padding: 8,
    },
    modalCancel: {
        fontSize: 16,
    },
    modalSave: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    categorySelector: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
        gap: 6,
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    colorPicker: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorSelectedIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    contentInput: {
        fontSize: 16,
        flex: 1,
        lineHeight: 24,
        minHeight: 200,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        gap: 12,
    },
    footerButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    templateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
    },
    templateButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    templateCategoryContainer: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    templateCategories: {
        paddingHorizontal: 16,
    },
    templateCategoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 8,
    },
    templateCategoryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    templateCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    templateTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    templatePreview: {
        fontSize: 14,
        lineHeight: 20,
    },
    emptyTemplateState: {
        padding: 20,
        alignItems: 'center',
    },
});
