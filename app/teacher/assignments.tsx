import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { assignmentApi, courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
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
    const [selectedModule, setSelectedModule] = useState<any>(null);

    // MCQs state
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '', '', '']); // Default 4 options
    const [correctOptionIndex, setCorrectOptionIndex] = useState<number | null>(null);

    const [showCourseDropdown, setShowCourseDropdown] = useState(false);
    const [showModuleDropdown, setShowModuleDropdown] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<any>(null);

    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    const [assignmentLimit, setAssignmentLimit] = useState(10);
    const [submissionLimit, setSubmissionLimit] = useState(10);

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

    const updateOption = (text: string, index: number) => {
        const newOptions = [...options];
        newOptions[index] = text;
        setOptions(newOptions);
    };

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, '']);
        } else {
            Alert.alert('Limit Reached', 'Maximum 6 options allowed.');
        }
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) {
            Alert.alert('Required', 'Minimum 2 options required.');
            return;
        }
        const newOptions = [...options];
        newOptions.splice(index, 1);
        setOptions(newOptions);
        if (correctOptionIndex === index) {
            setCorrectOptionIndex(null);
        } else if (correctOptionIndex !== null && correctOptionIndex > index) {
            setCorrectOptionIndex(correctOptionIndex - 1);
        }
    };

    const handleCreateAssignment = async () => {
        if (!selectedCourse && !editingAssignment) {
            Alert.alert('Required', 'Please select a course.');
            return;
        }
        if (!selectedModule && !editingAssignment) {
            Alert.alert('Required', 'Please select a module.');
            return;
        }
        if (!question.trim()) {
            Alert.alert('Required', 'Please enter a question.');
            return;
        }
        if (options.some(opt => !opt.trim())) {
            Alert.alert('Required', 'Please fill in all options or remove empty ones.');
            return;
        }
        if (correctOptionIndex === null) {
            Alert.alert('Required', 'Please select the correct option.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingAssignment) {
                // Update
                const res = await assignmentApi.update({
                    assignmentId: editingAssignment.id,
                    teacherId: userId,
                    courseId: editingAssignment.courseId,
                    question: question,
                    options: options,
                    correctOptionIndex: correctOptionIndex,
                });
                if (res.data.success) {
                    closeModal();
                    loadData();
                }
            } else {
                // Create
                const res = await assignmentApi.create({
                    teacherId: userId,
                    teacherName: userName,
                    courseId: selectedCourse.id,
                    courseTitle: selectedCourse.title,
                    moduleId: selectedModule.id,
                    moduleTitle: selectedModule.title,
                    question: question,
                    options: options,
                    correctOptionIndex: correctOptionIndex,
                });

                if (res.data.success) {
                    closeModal();
                    loadData();
                }
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Action failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (assignment: any) => {
        Alert.alert('Delete MCQs', `Are you sure you want to delete this MCQ? This will remove it for all students too.`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await assignmentApi.delete(userId, assignment.id, assignment.courseId);
                        Alert.alert('Deleted', 'MCQs removed successfully.');
                        loadData();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to delete MCQs.');
                    }
                },
            },
        ]);
    };

    const openEditModal = (assignment: any) => {
        setEditingAssignment(assignment);
        setQuestion(assignment.question || '');
        setOptions(assignment.options || ['', '', '', '']);
        setCorrectOptionIndex(assignment.correctOptionIndex);

        // Find course and module to display logic if we wanted, but editing doesn't allow changing course/module usually
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setEditingAssignment(null);
        setQuestion('');
        setOptions(['', '', '', '']);
        setCorrectOptionIndex(null);
        setSelectedCourse(null);
        setSelectedModule(null);
        setShowCourseDropdown(false);
        setShowModuleDropdown(false);
    };

    const handleMarkComplete = async (submission: any) => {
        Alert.alert('Approve Answer', `Mark ${submission.studentName}'s answer as completed?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Approve',
                onPress: async () => {
                    try {
                        await assignmentApi.markComplete({
                            teacherId: userId,
                            assignmentId: submission.assignmentId,
                            studentId: submission.studentId,
                        });
                        loadData();
                    } catch (err) {
                        Alert.alert('Error', 'Failed to approve answer.');
                    }
                },
            },
        ]);
    };

    const handleReject = async (submission: any) => {
        Alert.prompt(
            'Reject Answer',
            'Enter feedback for the student (optional):',
            async (feedback) => {
                try {
                    await assignmentApi.rejectSubmission({
                        teacherId: userId,
                        assignmentId: submission.assignmentId,
                        studentId: submission.studentId,
                        feedback: feedback
                    });
                    Alert.alert('Rejected', 'Answer has been rejected and sent back.');
                    loadData();
                } catch (err) {
                    Alert.alert('Error', 'Failed to reject answer.');
                }
            },
            'plain-text'
        );
    };

    const renderAssignmentItem = ({ item }: any) => (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
                <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
                    <Ionicons name="list" size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.question}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                        {item.courseTitle} • {item.moduleTitle}
                    </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: Colors.primary + '20' }]}>
                    <Ionicons name="people" size={14} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 12 }}>{item.studentCount || 0}</Text>
                </View>
            </View>

            {item.options && (
                <View style={{ marginTop: 10, paddingLeft: 10 }}>
                    {item.options.map((opt: string, idx: number) => (
                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 3 }}>
                            <Ionicons
                                name={idx === item.correctOptionIndex ? "checkmark-circle" : "ellipse-outline"}
                                size={14}
                                color={idx === item.correctOptionIndex ? "#10B981" : colors.textSecondary}
                                style={{ marginRight: 6 }}
                            />
                            <Text style={{ color: idx === item.correctOptionIndex ? colors.text : colors.textSecondary, fontSize: 13 }}>
                                {opt}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.cardBottom}>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
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
                    {item.submissionFileName && item.submissionFileName !== 'submission' && (
                        <Text style={{ color: colors.text, marginTop: 4, fontWeight: 'bold' }}>
                            Answer: {item.submissionFileName}
                        </Text>
                    )}
                </View>
                {item.status === 'submitted' && (
                    <View style={{ gap: 8 }}>
                        <TouchableOpacity style={styles.completeBtn} onPress={() => handleMarkComplete(item)}>
                            <Ionicons name="checkmark" size={16} color="#FFF" />
                            <Text style={styles.completeBtnText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleReject(item)}>
                            <Ionicons name="close" size={16} color="#FFF" />
                            <Text style={styles.completeBtnText}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            <View style={styles.subMeta}>
                <View>
                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                    </Text>
                </View>
                {item.status === 'completed' && (
                    <View style={styles.completedTag}>
                        <Ionicons name="checkmark-done" size={14} color="#10B981" />
                        <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 12 }}>Approved</Text>
                    </View>
                )}
                {item.status === 'rejected' && (
                    <View style={styles.completedTag}>
                        <Ionicons name="close-circle" size={14} color="#EF4444" />
                        <Text style={{ color: '#EF4444', fontWeight: '600', fontSize: 12 }}>Rejected</Text>
                    </View>
                )}
            </View>
        </View>
    );

    const getModulesForSelectedCourse = () => {
        if (!selectedCourse || !selectedCourse.modules) return [];
        return Object.keys(selectedCourse.modules).map(key => ({
            id: key,
            ...selectedCourse.modules[key]
        }));
    };

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
                                <Text style={styles.assignBtnText}>Assign MCQs</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={assignments.slice(0, assignmentLimit)}
                            keyExtractor={(item) => item.id}
                            renderItem={renderAssignmentItem}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
                            ListEmptyComponent={
                                isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                                    <View style={styles.emptyState}>
                                        <Ionicons name="list-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No MCQs created yet.</Text>
                                    </View>
                            }
                            contentContainerStyle={{ paddingBottom: 100 }}
                            ListFooterComponent={
                                assignments.length > assignmentLimit ? (
                                    <TouchableOpacity style={{ padding: 20, alignItems: 'center' }} onPress={() => setAssignmentLimit(prev => prev + 10)}>
                                        <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Load More</Text>
                                    </TouchableOpacity>
                                ) : null
                            }
                        />
                    </View>
                )}

                {activeTab === 'submissions' && (
                    <FlatList
                        data={submissions.slice(0, submissionLimit)}
                        keyExtractor={(item) => item.id}
                        renderItem={renderSubmissionItem}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
                        ListEmptyComponent={
                            isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                                <View style={styles.emptyState}>
                                    <Ionicons name="folder-open-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No answers received yet.</Text>
                                </View>
                        }
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListFooterComponent={
                            submissions.length > submissionLimit ? (
                                <TouchableOpacity style={{ padding: 20, alignItems: 'center' }} onPress={() => setSubmissionLimit(prev => prev + 10)}>
                                    <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Load More</Text>
                                </TouchableOpacity>
                            ) : null
                        }
                    />
                )}
            </View>

            {/* Create/Edit Assignment Modal */}
            <Modal visible={isModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModal}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                    </Pressable>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalCentered}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <View style={[styles.modalContent, { backgroundColor: colors.card, paddingVertical: 15 }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>
                                    {editingAssignment ? 'Edit MCQs' : 'New MCQs'}
                                </Text>
                                <TouchableOpacity onPress={closeModal}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 15, paddingBottom: 30 }}>
                                {/* Course & Module Selector */}
                                {!editingAssignment && (
                                    <>
                                        <View style={{ zIndex: 2 }}>
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
                                                                    setSelectedModule(null);
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

                                        {selectedCourse && (
                                            <View style={{ zIndex: 1 }}>
                                                <Text style={[styles.label, { color: colors.text }]}>Select Module</Text>
                                                <TouchableOpacity
                                                    style={[styles.selector, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                                    onPress={() => setShowModuleDropdown(!showModuleDropdown)}
                                                >
                                                    <Text style={{ color: selectedModule ? colors.text : colors.textSecondary, fontSize: 14 }}>
                                                        {selectedModule ? selectedModule.title : 'Choose a module...'}
                                                    </Text>
                                                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                                                </TouchableOpacity>

                                                {showModuleDropdown && (
                                                    <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }}>
                                                            {getModulesForSelectedCourse().map((m: any) => (
                                                                <TouchableOpacity
                                                                    key={m.id}
                                                                    style={styles.dropdownItem}
                                                                    onPress={() => {
                                                                        setSelectedModule(m);
                                                                        setShowModuleDropdown(false);
                                                                    }}
                                                                >
                                                                    <Text style={{ color: colors.text, fontSize: 14 }}>{m.title}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </>
                                )}

                                {/* Question */}
                                <View style={{ zIndex: -1 }}>
                                    <Text style={[styles.label, { color: colors.text }]}>Question</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="Type your question here..."
                                        placeholderTextColor={colors.textSecondary}
                                        multiline
                                        numberOfLines={3}
                                        value={question}
                                        onChangeText={setQuestion}
                                    />
                                </View>

                                {/* Options */}
                                <View style={{ zIndex: -1 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Options & Correct Answer</Text>
                                        {(options.length < 6) && (
                                            <TouchableOpacity onPress={addOption}>
                                                <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: 'bold' }}>+ Add Option</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {options.map((opt, idx) => (
                                        <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                                            <TouchableOpacity onPress={() => setCorrectOptionIndex(idx)}>
                                                <Ionicons
                                                    name={correctOptionIndex === idx ? "radio-button-on" : "radio-button-off"}
                                                    size={24}
                                                    color={correctOptionIndex === idx ? Colors.primary : colors.textSecondary}
                                                />
                                            </TouchableOpacity>
                                            <TextInput
                                                style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: correctOptionIndex === idx ? Colors.primary : colors.border, color: colors.text }]}
                                                placeholder={`Option ${idx + 1}`}
                                                placeholderTextColor={colors.textSecondary}
                                                value={opt}
                                                onChangeText={(val) => updateOption(val, idx)}
                                            />
                                            <TouchableOpacity onPress={() => removeOption(idx)} style={{ padding: 4 }}>
                                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
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
                                        <Text style={styles.submitBtnText}>
                                            {editingAssignment ? 'Save MCQs' : 'Assign to Students'}
                                        </Text>
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
    cardSub: { fontSize: 12, marginTop: 4 },
    dateText: { fontSize: 11, marginTop: 8 },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 15,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        padding: 4,
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
    modalCentered: { width: '92%', maxWidth: 450, maxHeight: '90%' },
    modalContent: { borderRadius: 24, paddingHorizontal: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 19, fontWeight: 'bold' },
    label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginLeft: 2 },
    input: { borderRadius: 12, padding: 13, fontSize: 14, borderWidth: 1 },
    textArea: { height: 80, textAlignVertical: 'top' },
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
        maxHeight: 150,
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        zIndex: 50,
    },
    dropdownItem: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' },
    submitBtn: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: { color: Colors.secondary, fontWeight: 'bold', fontSize: 16 },
});
