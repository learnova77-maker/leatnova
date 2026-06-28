import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { assignmentApi, courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentHomework() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');
    const [homeworkLimit, setHomeworkLimit] = useState(10);

    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [isMCQModalVisible, setIsMCQModalVisible] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadHomework = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserId(user.uid);
                setUserName(user.fullName);

                // Fetch both assignments and enrolled courses (which have progress)
                const [assignRes, enrolledRes] = await Promise.all([
                    assignmentApi.getStudentAssignments(user.uid),
                    courseApi.getEnrolledCourses(user.uid)
                ]);

                if (assignRes.data.success && enrolledRes.data.success) {
                    const rawAssignments = assignRes.data.assignments;
                    const enrolledCourses = enrolledRes.data.courses;

                    const filtered = rawAssignments.filter((assign: any) => {
                        // 1. Find the course
                        const course = enrolledCourses.find((c: any) => c.id === assign.courseId);
                        if (!course) return false;

                        // 2. Find the module in the course details
                        const module = course.modules?.[assign.moduleId];
                        if (!module || !module.lectures) return true; // Show if structure not found

                        // 3. Check if all lectures in this module are completed in course.lectureProgress
                        const lectureIds = Object.keys(module.lectures);
                        const progress = course.lectureProgress || {};

                        const allCompleted = lectureIds.every(lId => progress[lId]?.completed === true);
                        return allCompleted;
                    });

                    setAssignments(filtered);
                }
            }
        } catch (err) {
            console.error('Error loading homework:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadHomework(); }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadHomework();
        setRefreshing(false);
    }, []);

    const handleSubmit = async () => {
        if (selectedOptionIndex === null) {
            Alert.alert('Required', 'Please select an option.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Firebase may convert arrays to objects, so handle both
            const opts = Array.isArray(selectedAssignment.options)
                ? selectedAssignment.options
                : Object.values(selectedAssignment.options || {});
            const chosenAnswer = String(opts[selectedOptionIndex] || `Option ${selectedOptionIndex + 1}`);

            const res = await assignmentApi.submit({
                studentId: userId,
                studentName: userName,
                assignmentId: selectedAssignment.id,
                submissionUrl: selectedOptionIndex.toString(),
                submissionFileName: chosenAnswer,
            });

            if (res.data.success) {
                setIsMCQModalVisible(false);
                setSelectedOptionIndex(null);
                setSelectedAssignment(null);
                loadHomework();
            }
        } catch (err: any) {
            console.error('Submission error:', err);
            Alert.alert('Error', 'Submission failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusConfig = (item: any) => {
        if (item.status === 'completed') {
            return { icon: 'checkmark-done-circle', color: '#00AEEF', label: 'APPROVED', bg: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' };
        }
        if (item.status === 'submitted') {
            return { icon: 'time-outline', color: '#00AEEF', label: 'AWAITING GRADE', bg: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)' };
        }
        if (item.rejected) {
            return { icon: 'alert-circle-outline', color: '#FF4444', label: 'INCORRECT / REJECTED', bg: isDark ? 'rgba(255, 68, 68, 0.1)' : 'rgba(255, 68, 68, 0.05)' };
        }
        return { icon: 'radio-button-on-outline', color: colors.textSecondary, label: 'PENDING', bg: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' };
    };

    const renderItem = ({ item }: any) => {
        const st = getStatusConfig(item);
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                    <View style={[styles.iconCircle, { backgroundColor: st.bg }]}>
                        <Ionicons name={st.icon as any} size={22} color={st.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.moduleTitle || 'MCQs'}</Text>
                        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {item.courseTitle?.toUpperCase()} • BY {item.teacherName?.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {item.question ? (
                    <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>{item.question}</Text>
                ) : null}

                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon as any} size={12} color={st.color} />
                    <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
                </View>

                {item.rejected && item.feedback && (
                    <View style={styles.feedbackBox}>
                        <Text style={styles.feedbackTitle}>TEACHER FEEDBACK:</Text>
                        <Text style={[styles.feedbackText, { color: colors.text }]}>{item.feedback}</Text>
                    </View>
                )}

                {item.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.uploadBtn}
                        onPress={() => {
                            setSelectedAssignment(item);
                            setSelectedOptionIndex(null);
                            setIsMCQModalVisible(true);
                        }}
                    >
                        <Ionicons name="create-outline" size={18} color="#000" />
                        <Text style={styles.uploadBtnText}>ATTEMPT MCQS</Text>
                    </TouchableOpacity>
                )}

                <View style={[styles.cardFooter, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <Text style={styles.dateText}>
                        ASSIGNED: {new Date(item.assignedAt).toLocaleDateString()}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="ASSIGNMENTS TERMINAL" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContent}>
                <FlatList
                    data={assignments.slice(0, homeworkLimit)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00AEEF']} tintColor="#00AEEF" />}
                    ListEmptyComponent={
                        isLoading ? <View style={{ marginTop: 100 }}><ActivityIndicator size="large" color="#00AEEF" /></View> :
                            <View style={styles.emptyState}>
                                <Ionicons name="sparkles-outline" size={60} color={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                                <Text style={[styles.emptyText, { color: colors.text }]}>ALL CLEAR</Text>
                                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>No pending MCQs detected in the terminal.</Text>
                            </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 32 }}
                    ListFooterComponent={
                        assignments.length > homeworkLimit ? (
                            <TouchableOpacity style={{ padding: 20, alignItems: 'center' }} onPress={() => setHomeworkLimit(prev => prev + 10)}>
                                <Text style={{ color: '#00AEEF', fontWeight: 'bold', letterSpacing: 1 }}>LOAD MORE</Text>
                            </TouchableOpacity>
                        ) : null
                    }
                />
            </View>

            <Modal visible={isMCQModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMCQModalVisible(false)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                    </Pressable>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A0A0A' : '#FFF', borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>ASSIGNMENT MCQs</Text>
                            <TouchableOpacity onPress={() => setIsMCQModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedAssignment && (
                            <View style={{ marginBottom: 25 }}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>{selectedAssignment.moduleTitle}</Text>
                                <Text style={[styles.descText, { color: colors.text, marginTop: 10, fontSize: 16 }]}>{selectedAssignment.question}</Text>
                            </View>
                        )}

                        <View style={{ marginBottom: 30 }}>
                            {(Array.isArray(selectedAssignment?.options)
                                ? selectedAssignment.options
                                : Object.values(selectedAssignment?.options || {})
                            ).map((opt: string, idx: number) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.optionBtn,
                                        { borderColor: selectedOptionIndex === idx ? '#00AEEF' : colors.border },
                                        selectedOptionIndex === idx && { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }
                                    ]}
                                    onPress={() => setSelectedOptionIndex(idx)}
                                >
                                    <View style={[styles.radioCircle, { borderColor: selectedOptionIndex === idx ? '#00AEEF' : colors.textSecondary }]}>
                                        {selectedOptionIndex === idx && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={[styles.optionText, { color: selectedOptionIndex === idx ? '#00AEEF' : colors.text }]}>
                                        {String(opt)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.submitBtnText}>SUBMIT ANSWER</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContent: {
        flex: 1,
        paddingTop: 20,
    },
    card: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    cardSub: {
        fontSize: 9,
        marginTop: 4,
        fontWeight: '900',
        letterSpacing: 1,
    },
    descText: {
        fontSize: 12,
        marginTop: 15,
        lineHeight: 20,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 20,
    },
    statusLabel: {
        fontWeight: '900',
        fontSize: 8,
        letterSpacing: 1,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#00AEEF',
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 24,
    },
    uploadBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
    cardFooter: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
    },
    dateText: {
        fontSize: 9,
        color: 'rgba(128, 128, 128, 0.4)',
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
        gap: 20,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    emptySub: {
        fontSize: 10,
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    feedbackBox: {
        marginTop: 20,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.2)',
        backgroundColor: 'rgba(255, 68, 68, 0.05)',
    },
    feedbackTitle: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FF4444',
        marginBottom: 8,
        letterSpacing: 1,
    },
    feedbackText: {
        fontSize: 12,
        lineHeight: 20,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00AEEF',
    },
    optionText: {
        fontSize: 14,
        flex: 1,
        fontWeight: '600',
    },
    submitBtn: {
        backgroundColor: '#00AEEF',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
});

