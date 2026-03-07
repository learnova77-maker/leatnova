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
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TeacherIndex() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [teacherName, setTeacherName] = useState('Teacher');
    const [courses, setCourses] = useState<any[]>([]);
    const [statsData, setStatsData] = useState({ totalCourses: 0, totalStudents: 0, totalHours: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setTeacherName(user.fullName);

                    // Fetch real dashboard data
                    const response = await courseApi.getTeacherDashboard(user.uid);
                    if (response.data.success) {
                        setCourses(response.data.courses);
                        setStatsData(response.data.stats);
                    }
                }
            } catch (err) {
                console.error('Error loading dashboard:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadDashboard();
    }, []);

    const dashboardStats = [
        { title: 'Courses', value: statsData.totalCourses.toString(), icon: 'library', color: Colors.primary },
        { title: 'Students', value: statsData.totalStudents.toString(), icon: 'people', color: '#F2994A' },
        { title: 'Hours', value: statsData.totalHours.toString(), icon: 'time', color: '#EB5757' },
    ];

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Learnova"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
                role="teacher"
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.welcomeSection}>
                    <Text style={styles.hiText}>Teacher Dashboard</Text>
                    <Text style={styles.subHiText}>Welcome back, {teacherName}</Text>
                </View>

                <View style={styles.statsRow}>
                    {dashboardStats.map((stat, i) => (
                        <View key={i} style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '10' }]}>
                                <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                            </View>
                            <Text style={styles.statVal}>{stat.value}</Text>
                            <Text style={styles.statName}>{stat.title}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.homeworkCard}>
                    <View style={styles.hHeader}>
                        <Text style={styles.hTitle}>My Courses</Text>
                        <TouchableOpacity onPress={() => router.push('/teacher/courses')}>
                            <Text style={styles.seeAll}>Manage Curriculum</Text>
                        </TouchableOpacity>
                    </View>

                    {courses.length > 0 ? (
                        <View style={styles.courseQuickRow}>
                            {courses.slice(0, 2).map((course) => (
                                <TouchableOpacity
                                    key={course.id}
                                    style={styles.courseMiniCard}
                                    onPress={() => router.push(`/teacher/courses/${course.id}`)}
                                >
                                    <Ionicons name="book-outline" size={24} color={Colors.primary} />
                                    <Text style={styles.courseMiniTitle} numberOfLines={1}>{course.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No courses created yet.</Text>
                            <TouchableOpacity onPress={() => router.push('/teacher/courses')}>
                                <Text style={styles.createBtn}>Create your first course</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.homeworkCard}>
                    <View style={styles.hHeader}>
                        <Text style={styles.hTitle}>Recent Submissions</Text>
                    </View>

                    <View style={styles.emptyState}>
                        <Ionicons name="documents-outline" size={40} color={Colors.grey} />
                        <Text style={styles.emptyText}>No recent submissions from students.</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    content: {
        padding: 20,
        paddingBottom: 150,
    },
    welcomeSection: {
        marginBottom: 25,
    },
    hiText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    subHiText: {
        fontSize: 14,
        color: Colors.grey,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: 15,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        alignItems: 'center',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statVal: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    statName: {
        fontSize: 11,
        color: Colors.grey,
        fontWeight: '600',
    },
    homeworkCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 25,
    },
    hHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    hTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    hRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    rowInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    miniAvatar: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#EEE',
    },
    studentName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    courseName: {
        fontSize: 11,
        color: Colors.grey,
    },
    gradeBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    gradeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    seeAll: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    courseQuickRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 5,
    },
    courseMiniCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderRadius: 15,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    courseMiniTitle: {
        fontSize: 13,
        fontWeight: 'bold',
        color: Colors.secondary,
        textAlign: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.grey,
        textAlign: 'center',
    },
    createBtn: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primary,
        textDecorationLine: 'underline',
    },
});
