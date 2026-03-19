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
                    thumbnail: thumbnail, // Send thumbnail URI
                    status: 'active'
                };

                const response = await courseApi.createCourse(courseData);
                if (response.data.success) {
                    setIsCreateModalVisible(false);
                    setNewCourseTitle('');
                    setNewCoursePrice('');
                    setNewCourseCategory('');
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
                            <TouchableOpacity
                                style={styles.courseCard}
                                onPress={() => router.push(`/teacher/courses/${item.id}`)}
                            >
                                <View style={styles.courseIconBox}>
                                    {item.thumbnail ? (
                                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} />
                                    ) : (
                                        <Ionicons name="journal-outline" size={30} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={styles.courseInfo}>
                                    <Text style={styles.courseTitle}>{item.title}</Text>
                                    <View style={styles.courseMeta}>
                                        <Text style={styles.metaText}>{item.category || 'General'}</Text>
                                        <Text style={styles.metaDot}>•</Text>
                                        <Text style={styles.metaText}>{item.price === '0' || !item.price ? 'Free' : `$${item.price}`}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={Colors.grey} />
                            </TouchableOpacity>
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
                        <View style={styles.modalContentCompact}>
                            <View style={styles.modalHeaderCompact}>
                                <Text style={styles.modalTitleCompact}>Create Course</Text>
                                <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.closeBtn}>
                                    <Ionicons name="close" size={20} color={Colors.secondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.formScroll}
                                keyboardShouldPersistTaps="handled"
                                style={{ maxHeight: 500 }}
                            >
                                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                    {thumbnail ? (
                                        <Image source={{ uri: thumbnail }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="image-outline" size={40} color={Colors.grey} />
                                            <Text style={styles.imagePlaceholderText}>Upload Course Thumbnail</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Course Title</Text>
                                    <TextInput
                                        style={styles.inputCompact}
                                        placeholder="e.g. Master English Speaking"
                                        placeholderTextColor={Colors.grey}
                                        value={newCourseTitle}
                                        onChangeText={setNewCourseTitle}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Category</Text>
                                    <TextInput
                                        style={styles.inputCompact}
                                        placeholder="e.g. Language, Art..."
                                        placeholderTextColor={Colors.grey}
                                        value={newCourseCategory}
                                        onChangeText={setNewCourseCategory}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Price ($)</Text>
                                    <TextInput
                                        style={styles.inputCompact}
                                        placeholder="0 for free"
                                        placeholderTextColor={Colors.grey}
                                        keyboardType="numeric"
                                        value={newCoursePrice}
                                        onChangeText={setNewCoursePrice}
                                    />
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: Colors.secondary },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, gap: 5 },
    addBtnText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 14 },
    courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
    courseIconBox: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    courseInfo: { flex: 1 },
    courseTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },
    courseMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
    metaText: { fontSize: 12, color: Colors.grey },
    metaDot: { fontSize: 12, color: Colors.grey },
    emptyState: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { color: Colors.grey, fontSize: 16, textAlign: 'center' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    modalCentered: { width: '85%', maxWidth: 400, justifyContent: 'center' },
    modalContentCompact: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
    modalHeaderCompact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 5 },
    modalTitleCompact: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary },
    closeBtn: { padding: 5 },
    formScroll: { gap: 15 },
    inputGroup: { gap: 8 },
    label: { fontSize: 13, fontWeight: '600', color: Colors.secondary, marginLeft: 2 },
    inputCompact: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#EEE', color: Colors.secondary },
    submitBtnCompact: { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
    submitBtnTextCompact: { color: Colors.secondary, fontSize: 16, fontWeight: 'bold' },
    imagePicker: { width: '100%', height: 180, backgroundColor: '#F9FAFB', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#EEE', overflow: 'hidden', marginBottom: 20 },
    imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    imagePlaceholderText: { color: Colors.grey, fontSize: 14, fontWeight: '500' },
    previewImage: { width: '100%', height: '100%' },
    thumbnailImg: { width: '100%', height: '100%', borderRadius: 12 },
});
