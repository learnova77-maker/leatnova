import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { assignmentApi, courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
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
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type TabType = 'assignments' | 'submissions';

export default function TeacherAssignments() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<TabType>('assignments');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [pickedFile, setPickedFile] = useState<any>(null);
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);

    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserId(user.uid);
                setUserName(user.fullName);

                const [assignRes, subRes, courseRes] = await Promise.all([
                    assignmentApi.getTeacherAssignments(user.uid),
                    assignmentApi.getSubmissions(user.uid),
                    courseApi.getTeacherDashboard(user.uid),
                ]);

                if (assignRes.data.success) setAssignments(assignRes.data.assignments);
                if (subRes.data.success) setSubmissions(subRes.data.submissions);
                if (courseRes.data.success) setCourses(courseRes.data.courses);
            }
        } catch (err) {
            console.error('Error loading assignments:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, []);

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPickedFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Document picker error:', err);
        }
    };

    const handleCreateAssignment = async () => {
        if (!selectedCourse) {
            Alert.alert('Required', 'Please select a course.');
            return;
        }
        if (!taskTitle.trim()) {
            Alert.alert('Required', 'Please enter a task title.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await assignmentApi.create({
                teacherId: userId,
                teacherName: userName,
                courseId: selectedCourse.id,
                courseTitle: selectedCourse.title,
                title: taskTitle,
                description: taskDescription,
                fileUrl: pickedFile?.uri || null,
            });

            if (res.data.success) {
                Alert.alert('Success', res.data.message);
                setIsModalVisible(false);
                setTaskTitle('');
                setTaskDescription('');
                setSelectedCourse(null);
                setPickedFile(null);
                loadData();
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create assignment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkComplete = async (submission: any) => {
        Alert.alert('Mark Complete', `Mark ${submission.studentName}'s submission as completed?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Complete',
                onPress: async () => {
                    try {
                        await assignmentApi.markComplete({
                            teacherId: userId,
                            assignmentId: submission.assignmentId,
                            studentId: submission.studentId,
                        });
                        Alert.alert('Done', 'Submission marked as completed!');
                        loadData();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to mark as completed.');
                    }
                },
            },
        ]);
    };

    const renderAssignmentItem = ({ item }: any) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="document-text" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{item.courseTitle}</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name="people" size={14} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 12 }}>{item.studentCount || 0}</Text>
                </View>
            </View>
            {item.description ? (
                <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {new Date(item.createdAt).toLocaleDateString()}
            </Text>
        </View>
    );

    const renderSubmissionItem = ({ item }: any) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
                <View style={[styles.iconCircle, { backgroundColor: item.status === 'completed' ? '#10B98115' : '#F5920015' }]}>
                    <Ionicons
                        name={item.status === 'completed' ? 'checkmark-circle' : 'time'}
                        size={22}
                        color={item.status === 'completed' ? '#10B981' : '#F59200'}
                    />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{item.studentName}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>{item.assignmentTitle}</Text>
                </View>
                {item.status !== 'completed' && (
                    <TouchableOpacity
                        style={styles.completeBtn}
                        onPress={() => handleMarkComplete(item)}
                    >
                        <Ionicons name="checkmark" size={18} color="#FFF" />
                        <Text style={styles.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.subMeta}>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                </Text>
                {item.status === 'completed' && (
                    <View style={styles.completedTag}>
                        <Ionicons name="checkmark-done" size={14} color="#10B981" />
                        <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 12 }}>Completed</Text>
                    </View>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Assignments" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="teacher" />

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'assignments' && styles.tabActive]}
                    onPress={() => setActiveTab('assignments')}
                >
                    <Text style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}>
                        Assignments ({assignments.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'submissions' && styles.tabActive]}
                    onPress={() => setActiveTab('submissions')}
                >
                    <Text style={[styles.tabText, activeTab === 'submissions' && styles.tabTextActive]}>
                        Submissions ({submissions.length})
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.screenContent}>
                {activeTab === 'assignments' && (
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 15 }}>
                            <TouchableOpacity style={styles.assignBtn} onPress={() => setIsModalVisible(true)}>
                                <Ionicons name="add-circle" size={20} color={Colors.secondary} />
                                <Text style={styles.assignBtnText}>Assign Task</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={assignments}
                            keyExtractor={(item) => item.id}
                            renderItem={renderAssignmentItem}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
                            ListEmptyComponent={
                                isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                                    <View style={styles.emptyState}>
                                        <Ionicons name="document-text-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No assignments created yet.</Text>
                                    </View>
                            }
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    </View>
                )}

                {activeTab === 'submissions' && (
                    <FlatList
                        data={submissions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSubmissionItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
                        ListEmptyComponent={
                            isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                                <View style={styles.emptyState}>
                                    <Ionicons name="folder-open-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No submissions received yet.</Text>
                                </View>
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                    />
                )}
            </View>

            {/* Create Assignment Modal */}
            <Modal visible={isModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsModalVisible(false)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                    </Pressable>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalCentered}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>New Assignment</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close" size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 15, paddingBottom: 30 }}>
                                {/* Course Selector */}
                                <View>
                                    <Text style={[styles.label, { color: colors.text }]}>Select Course</Text>
                                    <TouchableOpacity
                                        style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={() => setShowCourseDropdown(!showCourseDropdown)}
                                    >
                                        <Text style={{ color: selectedCourse ? colors.text : colors.textSecondary, fontSize: 14 }}>
                                            {selectedCourse ? selectedCourse.title : 'Choose a course...'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>

                                    {showCourseDropdown && (
                                        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                            <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                                {courses.map((c) => (
                                                    <TouchableOpacity
                                                        key={c.id}
                                                        style={styles.dropdownItem}
                                                        onPress={() => {
                                                            setSelectedCourse(c);
                                                            setShowCourseDropdown(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: colors.text, fontSize: 14 }}>{c.title}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* Title */}
                                <View>
                                    <Text style={[styles.label, { color: colors.text }]}>Task Title</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="e.g. Chapter 3 Practice Questions"
                                        placeholderTextColor={colors.textSecondary}
                                        value={taskTitle}
                                        onChangeText={setTaskTitle}
                                    />
                                </View>

                                {/* Description */}
                                <View>
                                    <Text style={[styles.label, { color: colors.text }]}>Brief Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="Describe what students need to do..."
                                        placeholderTextColor={colors.textSecondary}
                                        multiline
                                        numberOfLines={4}
                                        value={taskDescription}
                                        onChangeText={setTaskDescription}
                                    />
                                </View>

                                {/* File Picker */}
                                <View>
                                    <Text style={[styles.label, { color: colors.text }]}>Attach File (PDF/Doc)</Text>
                                    <TouchableOpacity
                                        style={[styles.filePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                        onPress={pickFile}
                                    >
                                        <Ionicons name="attach" size={22} color={Colors.primary} />
                                        <Text style={{ color: pickedFile ? colors.text : colors.textSecondary, fontSize: 14, flex: 1 }} numberOfLines={1}>
                                            {pickedFile ? pickedFile.name : 'Tap to attach a file (optional)'}
                                        </Text>
                                        {pickedFile && (
                                            <TouchableOpacity onPress={() => setPickedFile(null)}>
                                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {/* Submit */}
                                <TouchableOpacity
                                    style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                                    onPress={handleCreateAssignment}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color={Colors.secondary} />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Assign to Students</Text>
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
    container: { flex: 1 },
    tabRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginTop: 10,
        gap: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: { fontWeight: '600', color: '#6B7280', fontSize: 13 },
    tabTextActive: { color: Colors.secondary, fontWeight: 'bold' },
    screenContent: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: { fontSize: 15, fontWeight: 'bold' },
    cardSub: { fontSize: 12, marginTop: 2 },
    descText: { fontSize: 13, marginTop: 10, lineHeight: 18 },
    dateText: { fontSize: 11, marginTop: 8 },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    subMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    completedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    completeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    completeBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    assignBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    assignBtnText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 14 },
    emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
    emptyText: { fontSize: 15 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalCentered: { width: '88%', maxWidth: 420 },
    modalContent: { borderRadius: 24, padding: 22, maxHeight: '85%', elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
    input: { borderRadius: 12, padding: 13, fontSize: 14, borderWidth: 1 },
    textArea: { height: 100, textAlignVertical: 'top' },
    selector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 12,
        padding: 13,
        borderWidth: 1,
    },
    dropdown: {
        borderWidth: 1,
        borderRadius: 12,
        marginTop: 5,
    },
    dropdownItem: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    filePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 13,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderRadius: 12,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 5,
    },
    submitBtnText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 16 },
});
