import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ImageBackground,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function StudentIndex() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userName, setUserName] = useState('STUDENT');
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);
    const [offlineVideos, setOfflineVideos] = useState<any[]>([]);

    const loadInitialData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            let uid = '';
            if (userData) {
                const user = JSON.parse(userData);
                uid = user.uid;
                setUserName(user.fullName.split(' ')[0].toUpperCase());
            }

            if (uid) {
                const enrolledRes = await courseApi.getEnrolledCourses(uid);
                if (enrolledRes.data.success) {
                    setMyCourses(enrolledRes.data.courses);
                }
            }
        } catch (err) {
            console.error('Error loading student dashboard:', err);
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
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        loadInitialData();
        loadOfflineVideos();
        return () => unsubscribe();
    }, []);

    const loadOfflineVideos = async () => {
        try {
            const data = await AsyncStorage.getItem('downloaded_videos');
            if (data) {
                setOfflineVideos(JSON.parse(data));
            }
        } catch (e) {
            console.error('Error loading offline videos:', e);
        }
    };

    const renderCourseCard = (course: any) => (
        <TouchableOpacity
            key={course.id}
            style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/student/courses/${course.id}`)}
        >
            <View style={[styles.courseImageWrapper, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)' }]}>
                {course.thumbnail ? (
                    <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                ) : (
                    <Ionicons name="journal-outline" size={26} color="#00AEEF" />
                )}
            </View>
            <View style={styles.courseDetails}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                        <Text style={styles.categoryText}>{course.category || 'COURSE'}</Text>
                    </View>
                    <View style={[styles.categoryBadge, { backgroundColor: course.type === 'Live' ? '#00AEEF' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)') }]}>
                        <Text style={[styles.categoryText, { color: course.type === 'Live' ? '#000' : '#00AEEF' }]}>
                            {course.type === 'Live' ? 'LIVE' : 'RECORDED'}
                        </Text>
                    </View>
                    {course.reviews && Object.keys(course.reviews).length > 0 && (
                        <View style={[styles.categoryBadge, { backgroundColor: '#FBBF24' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Ionicons name="star" size={10} color="#000" />
                                <Text style={[styles.categoryText, { color: '#000' }]}>{Object.keys(course.reviews).length}</Text>
                            </View>
                        </View>
                    )}
                </View>
                <Text style={[styles.courseTitleText, { color: colors.text }]}>{course.title}</Text>
                <Text style={[styles.instructorName, { color: colors.textSecondary }]}>BY {course.instructorName?.toUpperCase() || 'EXPERT'}</Text>
                <View style={styles.enrolledStatus}>
                    <Ionicons name="shield-checkmark" size={14} color="#00AEEF" />
                    <Text style={styles.enrolledText}>ENROLLED</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            {isDark && (
                <LinearGradient
                    colors={['#000000', '#001A2A', '#000000']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="MATLOVERSE"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="student"
                showExplore
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
                        <Text style={styles.welcomeSubSmall}>• WELCOME BACK, {userName}</Text>
                        <Text style={[styles.mainTagline, { color: colors.text }]}>
                            Learn the <Text style={{ color: '#00AEEF' }}>Skills</Text>.{"\n"}
                            Own the <Text style={{ color: '#00AEEF' }}>Future</Text>.
                        </Text>
                    </View>



                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={styles.bannerWrapper}
                        onPress={() => router.push('/student/explore')}
                    >
                        <ImageBackground
                            source={require('../../assets/images/dashboard_banner.jpg')}
                            style={styles.bannerBackground}
                            imageStyle={{ borderRadius: 24 }}
                        >
                            <LinearGradient
                                colors={isDark ? ['rgba(0,0,0,0.8)', 'rgba(0,174,239,0.3)'] : ['rgba(255,255,255,0.4)', 'rgba(0,174,239,0.2)']}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={styles.bannerOverlay}
                            >
                                <View style={styles.bannerContent}>
                                    <Text style={[styles.bannerMainText, { color: isDark ? '#FFF' : '#000000ff' }]}>LEARN MORE{"\n"}EARN MORE</Text>
                                    <View style={styles.exploreBadge}>
                                        <Text style={styles.exploreBadgeText}>EXPLORE NOW</Text>
                                        <Ionicons name="arrow-forward" size={14} color="#000" />
                                    </View>
                                </View>
                            </LinearGradient>
                        </ImageBackground>
                    </TouchableOpacity>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>QUICK <Text style={{ color: '#00AEEF' }}>ACCESS</Text></Text>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
                        {[
                            { id: '1', title: 'Videos', subtitle: 'Watch & Learn', icon: 'play-outline', color: '#00AEEF', path: '/student/videos' },
                            { id: '3', title: 'Social', subtitle: 'Community', icon: 'people-outline', color: '#00AEEF', path: '/student/social' },
                            { id: '4', title: 'Explore', subtitle: 'Browse All', icon: 'compass-outline', color: '#00AEEF', path: '/student/explore' },
                        ].map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.8}
                                onPress={() => router.push(item.path as any)}
                                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            >
                                <View style={styles.statIcon}>
                                    <Ionicons name={item.icon as any} size={18} color="#00AEEF" />
                                </View>
                                <Text style={[styles.statVal, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.statSubVal, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            {isOffline ? 'OFFLINE' : 'ACTIVE'} <Text style={{ color: '#00AEEF' }}>{isOffline ? 'VIDEOS' : 'COURSES'}</Text>
                        </Text>
                        <Text style={[styles.courseCount, { color: colors.textSecondary }]}>
                            {isOffline ? offlineVideos.length : myCourses.length} {isOffline ? 'SAVED' : 'STREAMS'}
                        </Text>
                    </View>

                    {isOffline ? (
                        offlineVideos.length > 0 ? (
                            offlineVideos.map(video => (
                                <TouchableOpacity
                                    key={video.id}
                                    style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => router.push(`/student/courses/${video.courseId}`)}
                                >
                                    <View style={[styles.courseImageWrapper, { backgroundColor: 'rgba(0, 174, 239, 0.05)' }]}>
                                        <Ionicons name="play-circle" size={30} color="#00AEEF" />
                                    </View>
                                    <View style={styles.courseDetails}>
                                        <View style={[styles.categoryBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                                            <Text style={[styles.categoryText, { color: '#10B981' }]}>READY OFFLINE</Text>
                                        </View>
                                        <Text style={[styles.courseTitleText, { color: colors.text }]}>{video.title}</Text>
                                        <Text style={[styles.instructorName, { color: colors.textSecondary }]}>{video.courseTitle || 'DOWNLOADED'}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>YOU ARE OFFLINE AND HAVE NO SAVED VIDEOS.</Text>
                            </View>
                        )
                    ) : (
                        myCourses.length > 0 ? (
                            myCourses.map(course => renderCourseCard(course))
                        ) : (
                            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="school-outline" size={40} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading your courses...</Text>
                                <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/student/explore')}>
                                    <Text style={styles.exploreBtnText}>BROWSE COURSES</Text>
                                </TouchableOpacity>
                            </View>
                        )
                    )}
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
    searchRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 40,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 54,
        borderWidth: 1,
    },
    searchText: {
        marginLeft: 12,
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    filterBtn: {
        width: 54,
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
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
    courseCount: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statsRow: {
        gap: 16,
        marginBottom: 40,
    },
    statCard: {
        width: 140,
        padding: 24,
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
        marginBottom: 16,
    },
    statVal: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    statSubVal: {
        fontSize: 9,
        marginTop: 4,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    bannerWrapper: {
        marginBottom: 45,
        height: 200,
        marginHorizontal: -32,
    },
    bannerBackground: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    bannerOverlay: {
        flex: 1,
        borderRadius: 24,
        padding: 32,
        justifyContent: 'center',
    },
    bannerContent: {
        maxWidth: '75%',
    },
    bannerMainText: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 1.5,
        lineHeight: 28,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    exploreBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#00AEEF',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 20,
        gap: 8,
    },
    exploreBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    courseImageWrapper: {
        width: 80,
        height: 80,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
    },
    courseDetails: {
        flex: 1,
        marginLeft: 20,
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 8,
        color: '#00AEEF',
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    courseTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    instructorName: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    enrolledStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    enrolledText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
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
