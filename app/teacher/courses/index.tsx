import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

const PREDEFINED_CATEGORIES = [
    'Programming & Tech',
    'Language & Communication',
    'Business & Finance',
    'Art & Design',
    'Health & Fitness',
    'Science & Nature',
    'Mathematics',
    'Music & Audio',
    'Photography & Video',
    'Marketing & Sales'
];

export default function TeacherCourseList() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

    // Create Course Form State
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCoursePrice, setNewCoursePrice] = useState('');
    const [newCourseCategory, setNewCourseCategory] = useState('');
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
    const [newCourseDescription, setNewCourseDescription] = useState('');
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadCourses = async () => {
        setIsLoading(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const response = await courseApi.getTeacherDashboard(user.uid);
                if (response.data.success) {
                    setCourses(response.data.courses);
                }
            }
        } catch (err) {
            console.error('Error loading courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setThumbnail(result.assets[0].uri);
        }
    };

    const handleCreateCourse = async () => {
        if (!newCourseTitle.trim()) {
            Alert.alert('Error', 'Please enter a course title.');
            return;
        }

        if (!PREDEFINED_CATEGORIES.includes(newCourseCategory)) {
            Alert.alert('Invalid Category', 'Please select a valid category from the suggestions.');
            return;
        }

        const wordCount = newCourseDescription.trim() ? newCourseDescription.trim().split(/\s+/).length : 0;
        if (wordCount > 50) {
            Alert.alert('Limit Exceeded', 'The course description cannot exceed 50 words.');
            return;
        }
        if (!thumbnail) {
            Alert.alert('Thumbnail Required', 'Please upload a course thumbnail before launching.');
            return;
        }

        setIsSubmitting(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const courseData = {
                    title: newCourseTitle,
                    instructorId: user.uid,
                    instructorName: user.fullName,
                    price: newCoursePrice || '0',
                    category: newCourseCategory || 'General',
                    description: newCourseDescription.trim(),
                    thumbnail: thumbnail, // Send thumbnail URI
                    status: 'active'
                };

                const response = await courseApi.createCourse(courseData);
                if (response.data.success) {
                    setIsCreateModalVisible(false);
                    setNewCourseTitle('');
                    setNewCoursePrice('');
                    setNewCourseCategory('');
                    setNewCourseDescription('');
                    setThumbnail(null);
                    loadCourses();
                    Alert.alert('Success', 'Course created! Now you can add modules and lectures.');
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to create course.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCourse = (id: string) => {
        Alert.alert(
            'Delete Course',
            'Are you sure you want to permanently delete this course and all its content?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await courseApi.deleteCourse(id);
                            if (res.data.success) {
                                setCourses(prev => prev.filter(c => c.id !== id));
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete course');
                        }
                    }
                }
            ]
        );
    };

    const renderLeftActions = (id: string) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDeleteCourse(id)}
            >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
                <Text style={styles.deleteActionText}>Delete</Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="My Courses"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="teacher"
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>All Courses</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setIsCreateModalVisible(true)}
                    >
                        <Ionicons name="add" size={20} color={Colors.secondary} />
                        <Text style={styles.addBtnText}>Create New</Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={courses}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <Swipeable
                                renderLeftActions={() => renderLeftActions(item.id)}
                                friction={2}
                                leftThreshold={40}
                            >
                                <TouchableOpacity
                                    style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                    onPress={() => router.push(`/teacher/courses/${item.id}`)}
                                >
                                    <View style={[styles.courseIconBox, { backgroundColor: isDark ? colors.surface : '#F0F9FF' }]}>
                                        {item.thumbnail ? (
                                            <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
                                        ) : (
                                            <Ionicons name="journal-outline" size={30} color={Colors.primary} />
                                        )}
                                    </View>
                                    <View style={styles.courseInfo}>
                                        <Text style={[styles.courseTitle, { color: colors.text }]}>{item.title}</Text>
                                        <View style={styles.courseMeta}>
                                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.category || 'General'}</Text>
                                            <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
                                            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.price === '0' || !item.price ? 'Free' : `$${item.price}`}</Text>
                                        </View>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </Swipeable>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="library-outline" size={60} color={Colors.grey} />
                                <Text style={styles.emptyText}>You haven't created any courses yet.</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                )}
            </View>

            {/* Create Course Modal */}
            <Modal visible={isCreateModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCreateModalVisible(false)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                    </Pressable>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={styles.modalCentered}
                    >
                        <View style={[styles.modalContentCompact, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeaderCompact}>
                                <Text style={[styles.modalTitleCompact, { color: colors.text }]}>Create Course</Text>
                                <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.formScroll}
                                keyboardShouldPersistTaps="handled"
                                style={{ maxHeight: 500 }}
                            >
                                <TouchableOpacity style={[styles.imagePicker, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickImage}>
                                    {thumbnail ? (
                                        <Image source={{ uri: thumbnail }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                                            <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>Upload Course Thumbnail</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Course Title</Text>
                                    <TextInput
                                        style={[styles.inputCompact, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="e.g. Master English Speaking"
                                        placeholderTextColor={colors.textSecondary}
                                        value={newCourseTitle}
                                        onChangeText={setNewCourseTitle}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Category</Text>
                                    <TextInput
                                        style={[styles.inputCompact, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="e.g. Programming, Language..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={newCourseCategory}
                                        onFocus={() => setShowCategorySuggestions(true)}
                                        onChangeText={(text) => {
                                            setNewCourseCategory(text);
                                            setShowCategorySuggestions(true);
                                        }}
                                    />
                                    {showCategorySuggestions && (
                                        <View style={{ marginTop: 5, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, maxHeight: 150, zIndex: 1000 }}>
                                            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                {PREDEFINED_CATEGORIES.filter(c => c.toLowerCase().includes(newCourseCategory.toLowerCase())).map((cat) => (
                                                    <TouchableOpacity
                                                        key={cat}
                                                        style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}
                                                        onPress={() => {
                                                            setNewCourseCategory(cat);
                                                            setShowCategorySuggestions(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.text, fontSize: 14 }}>{cat}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Description (Max 50 Words)</Text>
                                    <TextInput
                                        style={[styles.inputCompact, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text, height: 100, textAlignVertical: 'top' }]}
                                        placeholder="Add a brief description of what students will learn..."
                                        placeholderTextColor={colors.textSecondary}
                                        multiline
                                        numberOfLines={4}
                                        value={newCourseDescription}
                                        onChangeText={setNewCourseDescription}
                                    />
                                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 }}>
                                        <Text style={{ fontSize: 11, color: (newCourseDescription.trim() ? newCourseDescription.trim().split(/\s+/).length : 0) > 50 ? '#EF4444' : colors.textSecondary }}>
                                            Words: {newCourseDescription.trim() ? newCourseDescription.trim().split(/\s+/).length : 0}/50
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: colors.text }]}>Price ($)</Text>
                                    <TextInput
                                        style={[styles.inputCompact, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="0 for free"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="numeric"
                                        value={newCoursePrice}
                                        onChangeText={setNewCoursePrice}
                                    />
                                    {newCoursePrice !== '' && parseFloat(newCoursePrice) > 0 && (
                                        <Text style={[styles.profitText, { color: colors.textSecondary }]}>
                                            Your Profit: <Text style={{ fontWeight: 'bold', color: '#16A34A' }}>${(parseFloat(newCoursePrice) * 0.55).toFixed(2)}</Text> (55% share)
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtnCompact, isSubmitting && { opacity: 0.7 }]}
                                    onPress={handleCreateCourse}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color={Colors.secondary} />
                                    ) : (
                                        <Text style={styles.submitBtnTextCompact}>Launch Course</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, gap: 5 },
    addBtnText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 14 },
    courseCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1 },
    courseIconBox: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    courseInfo: { flex: 1 },
    courseTitle: { fontSize: 16, fontWeight: 'bold' },
    courseMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    metaText: { fontSize: 12, color: Colors.grey },
    metaDot: { fontSize: 12, color: Colors.grey },
    emptyState: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { color: Colors.grey, fontSize: 16, textAlign: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    modalCentered: { width: '85%', maxWidth: 400, justifyContent: 'center' },
    modalContentCompact: { borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
    modalTitleCompact: { fontSize: 18, fontWeight: 'bold' },
    closeBtn: { padding: 5 },
    formScroll: { gap: 15 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', marginLeft: 2 },
    inputCompact: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
    submitBtnCompact: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    submitBtnTextCompact: { color: Colors.secondary, fontSize: 16, fontWeight: 'bold' },
    profitText: { fontSize: 12, color: Colors.grey, marginTop: 4, marginLeft: 2 },
    imagePicker: { width: '100%', height: 180, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, overflow: 'hidden', marginBottom: 20 },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    imagePlaceholderText: { color: Colors.grey, fontSize: 14, fontWeight: '500' },
    previewImage: { width: '100%', height: '100%' },
    thumbnailImg: { width: '100%', height: '100%', borderRadius: 12 },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '86%',
        borderRadius: 16,
        marginVertical: 4,
        marginLeft: 10,
    },
    deleteActionText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4,
    },
});
