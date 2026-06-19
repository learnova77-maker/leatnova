import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function TeacherIndex() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [teacherName, setTeacherName] = useState('TEACHER');
    const [courses, setCourses] = useState<any[]>([]);
    const [statsData, setStatsData] = useState({ totalCourses: 0, totalStudents: 0, totalHours: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadDashboard();
        setRefreshing(false);
    }, []);

    const loadDashboard = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setTeacherName(user.fullName.toUpperCase());

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

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        loadDashboard();
        return () => unsubscribe();
    }, []);

    const dashboardStats = [
        { id: '1', title: 'COURSES', subtitle: 'LIVE STREAMS', value: statsData.totalCourses.toString(), icon: 'library-outline', color: '#00AEEF', path: '/teacher/courses' },
        { id: '2', title: 'STUDENTS', subtitle: 'ENROLLED', value: statsData.totalStudents.toString(), icon: 'people-outline', color: '#00AEEF', path: '/teacher/students' },
        { id: '3', title: 'Social', subtitle: 'Community', value: 'FEED', icon: 'chatbubbles-outline', color: '#00AEEF', path: '/teacher/social' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {isDark && (
                <LinearGradient
                    colors={['#000000', '#001A2A', '#000000']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="MALTOVERSE"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
                role="teacher"
            />

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#00AEEF" />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00AEEF']} tintColor="#00AEEF" />
                    }
                >
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.welcomeSubSmall}>• WELCOME BACK, {teacherName.split(' ')[0]}</Text>
                        <Text style={[styles.mainTagline, { color: colors.text }]}>
                            Teach your <Text style={{ color: '#00AEEF' }}>Students</Text>.{"\n"}
                            Shape the <Text style={{ color: '#00AEEF' }}>Future</Text>.
                        </Text>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>QUICK <Text style={{ color: '#00AEEF' }}>ACCESS</Text></Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
                        {dashboardStats.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => item.path && router.push(item.path as any)}
                                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <View style={styles.statIcon}>
                                    <Ionicons name={item.icon as any} size={18} color="#00AEEF" />
                                </View>
                                <Text style={[styles.statVal, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.statSubVal, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                                <Text style={[styles.statLargeVal, { color: '#00AEEF' }]}>{item.value}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>ACTIVE <Text style={{ color: '#00AEEF' }}>CURRICULUM</Text></Text>
                        <TouchableOpacity onPress={() => router.push('/teacher/courses')}>
                            <Text style={styles.seeAll}>MANAGE ALL</Text>
                        </TouchableOpacity>
                    </View>

                    {isOffline ? (
                        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 40 }]}>
                            <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>YOU ARE CURRENTLY OFFLINE.</Text>
                            <Text style={[styles.emptySub, { color: colors.textSecondary, marginTop: 8, fontSize: 10 }]}>Sync will resume once connection is restored.</Text>
                        </View>
                    ) : (
                        courses.length > 0 ? (
                            courses.slice(0, 3).map((course) => (
                                <TouchableOpacity
                                    key={course.id}
                                    style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => router.push(`/teacher/courses/${course.id}`)}
                                >
                                    <View style={[styles.courseImageWrapper, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                        <Ionicons name="book-outline" size={26} color="#00AEEF" />
                                    </View>
                                    <View style={styles.courseDetails}>
                                        <Text style={[styles.courseTitleText, { color: colors.text }]}>{course.title}</Text>
                                        <Text style={[styles.courseInfo, { color: colors.textSecondary }]}>
                                            {course.studentsCount || 0} STUDENTS ENROLLED
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#00AEEF" />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="school-outline" size={40} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>NO ACTIVE COURSES FOUND.</Text>
                                <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/teacher/courses')}>
                                    <Text style={styles.exploreBtnText}>CREATE COURSE</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}

                    <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>RECENT <Text style={{ color: '#00AEEF' }}>SUBMISSIONS</Text></Text>
                    </View>

                    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 40 }]}>
                        <Ionicons name="documents-outline" size={30} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary, fontSize: 10 }]}>NO RECENT ACTIVITY FROM STUDENTS.</Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 32,
        paddingTop: 10,
        paddingBottom: 100,
    },
    headerTitleContainer: {
        marginBottom: 40,
    },
    welcomeSubSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
    },
    mainTagline: {
        fontSize: 26,
        fontWeight: '900',
        marginTop: 15,
        letterSpacing: -0.5,
        lineHeight: 34,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    seeAll: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
    statsRow: {
        gap: 16,
        marginBottom: 40,
    },
    statCard: {
        width: 140,
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'flex-start',
    },
    statIcon: {
        width: 36,
        height: 36,
        backgroundColor: 'rgba(0, 174, 239, 0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statVal: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statSubVal: {
        fontSize: 8,
        marginTop: 2,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    statLargeVal: {
        fontSize: 22,
        fontWeight: '900',
        marginTop: 10,
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    courseImageWrapper: {
        width: 50,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    courseDetails: {
        flex: 1,
        marginLeft: 15,
    },
    courseTitleText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    courseInfo: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    emptyCard: {
        width: '100%',
        paddingVertical: 60,
        borderRadius: 24,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        marginTop: 20,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    exploreBtn: {
        marginTop: 30,
        backgroundColor: '#00AEEF',
        paddingHorizontal: 25,
        paddingVertical: 14,
        borderRadius: 8,
    },
    exploreBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    }
});
