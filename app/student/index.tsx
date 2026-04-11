import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentIndex() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userName, setUserName] = useState('Student');
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [recentVideo, setRecentVideo] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);

    const loadInitialData = async () => {
        try {
            // Load User Name
            const userData = await AsyncStorage.getItem('user');
            let uid = '';
            if (userData) {
                const user = JSON.parse(userData);
                uid = user.uid;
                setUserName(user.fullName.split(' ')[0]);
            }

            // Fetch enrolled courses
            if (uid) {
                try {
                    const enrolledRes = await courseApi.getEnrolledCourses(uid);
                    if (enrolledRes.data.success) {
                        setMyCourses(enrolledRes.data.courses);
                    }
                } catch (err) {
                    console.error('Error fetching enrolled courses:', err);
                }
            }

            // Load Recent Video
            const recentVideoData = await AsyncStorage.getItem('recent_video');
            if (recentVideoData) {
                setRecentVideo(JSON.parse(recentVideoData));
            }
        } catch (err) {
            console.error('Error loading student dashboard user data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        loadInitialData();
    }, []);

    const renderCourseCard = (course: any) => (
        <TouchableOpacity
            key={course.id}
            style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/student/courses/${course.id}`)}
        >
            <View style={[styles.courseImagePlaceholder, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                {course.thumbnail ? (
                    <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                ) : (
                    <Ionicons name="book" size={30} color={Colors.primary} />
                )}
            </View>
            <View style={styles.courseDetails}>
                <View style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{course.category || 'General'}</Text>
                </View>
                <Text style={[styles.courseTitleText, { color: colors.text }]}>{course.title}</Text>
                <Text style={[styles.instructorName, { color: colors.textSecondary }]}>By {course.instructorName || 'Expert Instructor'}</Text>
                <View style={styles.purchaseBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                    <Text style={styles.purchaseText}>Enrolled</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Dashboard"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="student"
                showExplore
            />

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
                    }
                >
                    <View style={styles.welcomeBox}>
                        <View>
                            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Hello, {userName}!</Text>
                            <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>Ready to continue your learning journey?</Text>
                        </View>
                        <View style={[styles.subBadge, { borderColor: colors.primary, backgroundColor: isDark ? colors.card : '#FFF9E5' }]}>
                            <Ionicons name="star" size={14} color={Colors.primary} />
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        {[
                            { id: '1', title: 'Videos', icon: 'play-outline', color: '#4A90E2', path: '/student/videos' },
                            { id: '2', title: 'Certificates', icon: 'ribbon-outline', color: '#9B51E0', path: '/student/certificates' },
                            { id: '3', title: 'Social', icon: 'chatbubbles-outline', color: '#F2994A', path: '/student/social' },
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push(item.path as any)}
                            >
                                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                                </View>
                                <Text style={[styles.statVal, { color: colors.text }]}>{item.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* My Enrolled Courses Section */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>My Continuing Courses</Text>
                        <Text style={[styles.courseCount, { color: colors.textSecondary }]}>{myCourses.length} Enrolled</Text>
                    </View>

                    {myCourses.length > 0 ? (
                        myCourses.map(course => renderCourseCard(course))
                    ) : (
                        <View style={[styles.emptyEnrollmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="school-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't enrolled in any courses yet.</Text>
                            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/student/explore')}>
                                <Text style={styles.exploreBtnText}>Discover Courses</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Continue Watching / Recent Video Section */}
                    {recentVideo && (
                        <View style={styles.recentSection}>
                            <View style={styles.sectionHeader}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Watching</Text>
                                <TouchableOpacity onPress={async () => {
                                    await AsyncStorage.removeItem('recent_video');
                                    setRecentVideo(null);
                                }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push(`/student/courses/${recentVideo.courseId}`)}
                            >
                                <View style={styles.recentImageContainer}>
                                    {recentVideo.thumbnail ? (
                                        <Image source={{ uri: recentVideo.thumbnail }} style={styles.recentThumbnail} />
                                    ) : (
                                        <View style={[styles.recentThumbPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                                            <Ionicons name="play" size={24} color={Colors.primary} />
                                        </View>
                                    )}
                                    <View style={styles.playOverlay}>
                                        <Ionicons name="play" size={16} color="#FFF" />
                                    </View>
                                </View>
                                <View style={styles.recentContent}>
                                    <Text style={[styles.recentCourseTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                        {recentVideo.courseTitle}
                                    </Text>
                                    <Text style={[styles.recentVideoTitle, { color: colors.text }]} numberOfLines={1}>
                                        {recentVideo.title}
                                    </Text>
                                    <View style={styles.progressBarContainer}>
                                        <View style={[styles.progressBar, { backgroundColor: Colors.primary }]} />
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
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
        padding: 20,
        paddingBottom: 40,
    },
    welcomeBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    welcomeTitle: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    welcomeSub: {
        fontSize: 14,
        marginTop: 2,
    },
    subBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statVal: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '800',
    },
    courseCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    courseImagePlaceholder: {
        width: 85,
        height: 85,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    courseDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    categoryTag: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#16A34A',
    },
    courseTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    instructorName: {
        fontSize: 12,
        marginBottom: 6,
    },
    purchaseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    purchaseText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#16A34A',
    },
    emptyEnrollmentCard: {
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    emptyText: {
        fontSize: 14,
        marginTop: 15,
        textAlign: 'center',
        marginBottom: 20,
    },
    exploreBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 14,
    },
    exploreBtnText: {
        color: Colors.secondary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Recent Video Styles
    recentSection: {
        marginBottom: 30,
    },
    recentCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    recentImageContainer: {
        position: 'relative',
        width: 100,
        height: 65,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 15,
    },
    recentThumbnail: {
        width: '100%',
        height: '100%',
    },
    recentThumbPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playOverlay: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentContent: {
        flex: 1,
        justifyContent: 'center',
    },
    recentCourseTitle: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    recentVideoTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    progressBarContainer: {
        height: 3,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        width: '70%', // Simulated progress
    },
});
