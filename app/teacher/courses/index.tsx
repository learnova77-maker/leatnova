import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TeacherCourseList() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

    // Create Course Form State
    const [newCourseTitle, setNewCourseTitle] = useState('');
    const [newCoursePrice, setNewCoursePrice] = useState('');
    const [newCourseCategory, setNewCourseCategory] = useState('');
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
                    status: 'active' // For now let's make it active immediately
                };

                const response = await courseApi.createCourse(courseData);
                if (response.data.success) {
                    setIsCreateModalVisible(false);
                    setNewCourseTitle('');
                    setNewCoursePrice('');
                    setNewCourseCategory('');
                    loadCourses(); // Refresh list
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="My Courses"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="teacher"
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.title}>All Courses</Text>
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
                                    <Ionicons name="journal-outline" size={30} color={Colors.primary} />
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
            <Modal visible={isCreateModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCreateModalVisible(false)} />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Course</Text>
                                <TouchableOpacity onPress={() => setIsCreateModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={Colors.secondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formContainer}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Course Title</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Master English Speaking"
                                        value={newCourseTitle}
                                        onChangeText={setNewCourseTitle}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Category</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Language, Coding..."
                                        value={newCourseCategory}
                                        onChangeText={setNewCourseCategory}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Price ($) (Leave 0 for free)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={newCoursePrice}
                                        onChangeText={setNewCoursePrice}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                                    onPress={handleCreateCourse}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Create Course</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
    modalContent: { padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, paddingHorizontal: 24, paddingTop: 24 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.secondary },
    formContainer: { gap: 20, paddingHorizontal: 24 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.secondary },
    input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#EEE' },
    submitBtn: { backgroundColor: Colors.secondary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
