import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi, paymentApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function StudentCourseDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const url = Linking.useURL();

    useEffect(() => {
        loadUserAndCourse();
    }, [id]);

    // Handle deep link return from Stripe
    useEffect(() => {
        if (url) {
            const { queryParams } = Linking.parse(url);
            if (queryParams?.status === 'success' && queryParams?.session_id) {
                handlePaymentSuccess(queryParams.session_id as string);
            } else if (queryParams?.status === 'cancel') {
                setIsPaymentLoading(false);
                Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
            }
        }
    }, [url]);

    const handlePaymentSuccess = async (sessionId: string) => {
        setIsPaymentLoading(true);
        try {
            const res = await paymentApi.verifyPayment(sessionId);
            if (res.data.success) {
                setIsEnrolled(true);
                router.replace({
                    pathname: '/student/courses/success' as any,
                    params: {
                        courseId: course?.id || id,
                        courseTitle: course?.title || 'Your Course'
                    }
                });
            }
        } catch (err) {
            console.error('Verify error:', err);
        } finally {
            setIsPaymentLoading(false);
        }
    };

    const loadUserAndCourse = async () => {
        console.log('Loading course details for ID:', id);
        try {
            // Get current user
            const userData = await AsyncStorage.getItem('user');
            let user = null;
            if (userData) {
                user = JSON.parse(userData);
                setCurrentUser(user);
                console.log('Current user found:', user.uid);
            }

            // Fetch course details
            const response = await courseApi.getCourseDetails(id as string);
            console.log('Course API response:', response.data.success ? 'Success' : 'Failed');
            if (response.data.success) {
                setCourse(response.data.course);
            } else {
                console.warn('Course fetch failed:', response.data.message);
            }

            // Check enrollment status
            if (user) {
                try {
                    const enrollResponse = await paymentApi.checkEnrollment({
                        studentId: user.uid,
                        courseId: id as string,
                    });
                    console.log('Enrollment check:', enrollResponse.data.enrolled ? 'Enrolled' : 'Not Enrolled');
                    if (enrollResponse.data.success && enrollResponse.data.enrolled) {
                        setIsEnrolled(true);
                    }
                } catch (e) {
                    console.error('Enrollment check error:', e);
                }
            }
        } catch (err) {
            console.error('Error in loadUserAndCourse:', err);
            Alert.alert('Error', 'Failed to load course details.');
        } finally {
            console.log('Finishing load, setting isLoading to false');
            setIsLoading(false);
        }
    };

    const [videoProgressMap, setVideoProgressMap] = useState<Record<string, number>>({});

    // Load all saved video progresses
    useEffect(() => {
        const loadProgress = async () => {
            try {
                const saved = await AsyncStorage.getItem('video_progress');
                if (saved) setVideoProgressMap(JSON.parse(saved));
            } catch (e) {
                console.error('Error loading progress:', e);
            }
        };
        loadProgress();
    }, []);

    const handleVideoPress = async (video: any) => {
        const videoId = video.id || video.videoUrl;
        setSelectedVideo(video);

        // Save to Recent Videos in AsyncStorage
        try {
            const recentVideo = {
                id: videoId,
                title: video.title || 'Course Video',
                videoUrl: video.videoUrl,
                courseId: id,
                courseTitle: course?.title,
                thumbnail: course?.thumbnail,
                playedAt: new Date().toISOString()
            };
            await AsyncStorage.setItem('recent_video', JSON.stringify(recentVideo));
        } catch (error) {
            console.error('Error saving recent video:', error);
        }
    };

    const handlePlaybackStatusUpdate = async (status: any, videoId: string) => {
        if (status.isLoaded && status.isPlaying) {
            // Save progress every few seconds
            const currentPos = status.positionMillis;
            if (currentPos > 3000) { // Only save if more than 3 seconds
                const newProgressMap = { ...videoProgressMap, [videoId]: currentPos };
                setVideoProgressMap(newProgressMap);
                await AsyncStorage.setItem('video_progress', JSON.stringify(newProgressMap));
            }
        }
    };

    const handleEnroll = async () => {
        if (!currentUser) {
            Alert.alert('Login Required', 'Please login to enroll in courses.');
            return;
        }

        if (!course) return;
        const price = course.price || '0';

        setIsPaymentLoading(true);
        try {
            const returnUrl = Linking.createURL('/student/courses/' + id);

            const response = await paymentApi.createCheckout({
                courseId: course.id,
                courseTitle: course.title,
                price: price,
                studentId: currentUser.uid,
                studentName: currentUser.fullName || '',
                teacherId: course.instructorId || course.userId,
                successUrl: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
                cancelUrl: `${returnUrl}?status=cancel`
            });

            if (response.data.success) {
                if (response.data.free) {
                    setIsEnrolled(true);
                    Alert.alert('🎉 Enrolled!', 'You are now enrolled in this course.');
                    setIsPaymentLoading(false);
                } else if (response.data.url) {
                    await WebBrowser.openBrowserAsync(response.data.url);
                }
            }
        } catch (err: any) {
            const serverMsg = err?.response?.data?.message || err?.message || 'Unknown error';
            console.error('Enroll error:', serverMsg, err?.response?.data);
            Alert.alert('Payment Error', `Server: ${serverMsg}`);
            setIsPaymentLoading(false);
        }
    };


    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!course) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={{ textAlign: 'center', marginTop: 50, color: colors.text }}>Course not found.</Text>
            </SafeAreaView>
        );
    }

    const modules = course.modules
        ? Object.keys(course.modules).map(key => ({
            id: key,
            ...course.modules[key]
        }))
        : [];

    const isFree = !course.price || parseFloat(course.price) === 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppHeader
                title="Course Overview"
                showBack={true}
                onBackPress={() => router.back()}
                role="student"
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Course Header */}
                <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.imageBox, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                        {course.thumbnail ? (
                            <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                        ) : (
                            <Ionicons name="book" size={40} color={Colors.primary} />
                        )}
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{course.category || 'General'}</Text>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
                        <Text style={[styles.instructor, { color: colors.textSecondary }]}>By {course.instructorName || 'Expert Instructor'}</Text>
                    </View>
                </View>

                {/* Course Stats */}
                <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Ionicons name="layers-outline" size={18} color={Colors.grey} />
                        <Text style={[styles.statLabel, { color: colors.text }]}>{modules.length} Modules</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="pricetag-outline" size={18} color={Colors.grey} />
                        <Text style={[styles.statLabel, { color: colors.text }]}>{isFree ? 'Free' : `$${course.price}`}</Text>
                    </View>
                    {isEnrolled && (
                        <View style={styles.enrolledBadge}>
                            <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
                            <Text style={styles.enrolledText}>Enrolled</Text>
                        </View>
                    )}
                </View>

                {/* Enrollment Banner (if not enrolled and paid) */}
                {!isEnrolled && !isFree && (
                    <View style={[styles.payBanner, { backgroundColor: isDark ? '#1A1A2E' : '#FFF9E6' }]}>
                        <View style={styles.payBannerLeft}>
                            <Ionicons name="lock-closed" size={24} color={Colors.primary} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={[styles.payBannerTitle, { color: colors.text }]}>Unlock Full Course</Text>
                                <Text style={[styles.payBannerSub, { color: colors.textSecondary }]}>
                                    Pay ${course.price} to access all modules and lectures
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Curriculum */}
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Curriculum</Text>

                {modules.length > 0 ? (
                    modules.map((module: any, index) => (
                        <View key={module.id} style={[styles.moduleBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.moduleHeader, { backgroundColor: isDark ? colors.surface : '#F9FAFB', borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                                {module.thumbnail && (
                                    <View style={styles.moduleThumbBox}>
                                        <Image source={{ uri: module.thumbnail }} style={styles.moduleThumbImg} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.moduleNumber}>Module {index + 1}</Text>
                                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
                                </View>
                                {!isEnrolled && !isFree && (
                                    <Ionicons name="lock-closed-outline" size={16} color={Colors.grey} />
                                )}
                            </View>

                            <View style={styles.lectureList}>
                                {module.lectures ? (
                                    Object.keys(module.lectures).map((lKey, lIdx) => {
                                        const lecture = module.lectures[lKey];
                                        const isLocked = !isEnrolled && !isFree;

                                        return (
                                            <TouchableOpacity
                                                key={lKey}
                                                style={[styles.lectureRow, isLocked && { opacity: 0.5 }]}
                                                disabled={isLocked}
                                                onPress={() => {
                                                    if (isLocked) {
                                                        Alert.alert('🔒 Locked', 'Please enroll to access this lecture.');
                                                        return;
                                                    }
                                                    if (lecture.type === 'Live') {
                                                        router.push('/student/live');
                                                    } else {
                                                        // Check for ANY possible video URL field (url, videoUrl, video, link)
                                                        const videoLink = lecture.url || lecture.videoUrl || lecture.video || lecture.link;

                                                        if (videoLink && videoLink.trim() !== '') {
                                                            setSelectedVideo(videoLink);
                                                        } else {
                                                            Alert.alert('Video Not Found', 'The instructor has not uploaded a video for this lecture yet.');
                                                        }
                                                    }
                                                }}
                                            >
                                                <View style={styles.lectureIcon}>
                                                    <Ionicons
                                                        name={isLocked ? 'lock-closed' : lecture.type === 'Video' ? 'play-circle' : 'videocam'}
                                                        size={20}
                                                        color={isLocked ? Colors.grey : Colors.primary}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.lectureTitle, { color: colors.text }]}>{lecture.title}</Text>
                                                    <Text style={styles.lectureMeta}>
                                                        {lecture.type === 'Live' && lecture.scheduledAt
                                                            ? `Scheduled: ${lecture.scheduledAt}`
                                                            : `${lecture.duration || '00:00'} • ${lecture.type}`
                                                        }
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color={Colors.lightGrey} />
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <Text style={styles.noLectures}>No lectures in this module.</Text>
                                )}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContent}>
                        <Ionicons name="journal-outline" size={50} color={Colors.lightGrey} />
                        <Text style={styles.emptyTitle}>Curriculum Coming Soon</Text>
                        <Text style={styles.emptySub}>The instructor hasn't uploaded any content yet.</Text>
                    </View>
                )}

                {/* Enroll/Access Button */}
                {isEnrolled ? (
                    <View style={[styles.enrolledBar, { backgroundColor: isDark ? '#0D3320' : '#F0FDF4' }]}>
                        <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                        <Text style={[styles.enrolledBarText, { color: '#16A34A' }]}>
                            You're enrolled! Enjoy learning.
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[
                            styles.actionBtn,
                            { backgroundColor: '#FACC15' }, // Vibrant Yellow
                            isPaymentLoading && { opacity: 0.7 }
                        ]}
                        onPress={handleEnroll}
                        disabled={isPaymentLoading}
                    >
                        {isPaymentLoading ? (
                            <ActivityIndicator color={isDark ? '#000' : '#FFF'} />
                        ) : (
                            <View style={styles.actionBtnInner}>
                                <Ionicons
                                    name={isFree ? 'rocket' : 'card'}
                                    size={20}
                                    color={isDark ? '#000' : '#FFF'}
                                />
                                <Text style={[styles.actionBtnText, { color: isDark ? '#000' : '#FFF' }]}>
                                    {isFree ? 'Enroll for Free' : `Pay $${course.price} & Enroll`}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Video Player Modal */}
            <Modal visible={!!selectedVideo} animationType="fade" transparent={true}>
                <View style={styles.videoModalContainer}>
                    <TouchableOpacity
                        style={styles.videoOverlay}
                        activeOpacity={1}
                        onPress={() => setSelectedVideo(null)}
                    />

                    <View style={styles.videoFullBox}>
                        <View style={styles.videoTopHeader}>
                            <Text style={styles.videoHeaderTitle} numberOfLines={1}>
                                {typeof selectedVideo === 'object' && selectedVideo?.title ? selectedVideo.title : 'Course Preview'}
                            </Text>
                            <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setSelectedVideo(null)}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.videoContainer}>
                            {selectedVideo && (
                                <Video
                                    source={{ uri: typeof selectedVideo === 'string' ? selectedVideo : selectedVideo.videoUrl }}
                                    rate={1.0}
                                    volume={1.0}
                                    isMuted={false}
                                    resizeMode={ResizeMode.CONTAIN}
                                    shouldPlay
                                    useNativeControls
                                    onPlaybackStatusUpdate={(status) => handlePlaybackStatusUpdate(status, typeof selectedVideo === 'string' ? selectedVideo : selectedVideo.id || selectedVideo.videoUrl)}
                                    progressUpdateIntervalMillis={2000}
                                    positionMillis={videoProgressMap[typeof selectedVideo === 'string' ? selectedVideo : selectedVideo.id || selectedVideo.videoUrl] || 0}
                                    style={styles.playerStyle}
                                />
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { padding: 20, paddingBottom: 50 },
    headerCard: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0' },
    imageBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    headerInfo: { flex: 1, justifyContent: 'center' },
    tag: { backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 6 },
    tagText: { fontSize: 10, fontWeight: 'bold', color: '#16A34A' },
    title: { fontSize: 20, fontWeight: 'bold', color: Colors.secondary, marginBottom: 4 },
    instructor: { fontSize: 13, color: Colors.grey },
    statsBar: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 20, gap: 20, borderWidth: 1, borderColor: '#F0F0F0', alignItems: 'center' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statLabel: { fontSize: 13, fontWeight: '600' },
    enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    enrolledText: { fontSize: 12, fontWeight: 'bold', color: '#16A34A' },
    payBanner: { padding: 16, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
    payBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    payBannerTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
    payBannerSub: { fontSize: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary, marginBottom: 15 },
    moduleBox: { backgroundColor: '#FFF', borderRadius: 20, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#F0F0F0' },
    moduleHeader: { backgroundColor: '#F9FAFB', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    moduleNumber: { fontSize: 11, fontWeight: 'bold', color: Colors.primary, marginBottom: 2 },
    moduleTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },
    lectureList: { padding: 10 },
    lectureRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#FFF', marginBottom: 5 },
    lectureIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    lectureTitle: { fontSize: 14, fontWeight: '600' },
    lectureMeta: { fontSize: 11, color: Colors.grey, marginTop: 1 },
    noLectures: { textAlign: 'center', padding: 20, color: Colors.grey, fontSize: 13 },
    emptyContent: { alignItems: 'center', marginTop: 30, backgroundColor: '#FFF', padding: 40, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#EEE' },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary, marginTop: 15 },
    emptySub: { fontSize: 13, color: Colors.grey, textAlign: 'center', marginTop: 5 },
    actionBtn: { backgroundColor: Colors.secondary, padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
    actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    enrolledBar: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 16, marginTop: 20, justifyContent: 'center', gap: 10 },
    enrolledBarText: { fontSize: 16, fontWeight: 'bold' },
    thumbnailImg: { width: '100%', height: '100%', borderRadius: 20 },
    moduleThumbBox: { width: 50, height: 50, borderRadius: 10, marginRight: 12, overflow: 'hidden' },
    moduleThumbImg: { width: '100%', height: '100%' },
    // Video Modal Styles
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center' },
    videoBox: { width: '100%', height: 300, backgroundColor: '#000' },
    videoHeader: { position: 'absolute', top: -50, right: 10, zIndex: 10 },
    closeVideo: { padding: 10 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    paymentPopUp: { width: '100%', maxWidth: 450, height: 450, borderRadius: 30, borderWidth: 1, overflow: 'hidden', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
    webviewHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
    webviewTitle: { fontSize: 18, fontWeight: 'bold' },
    webviewSubTitle: { fontSize: 12, marginTop: 2 },
    closeModalBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
    webViewWrapper: { flex: 1 },
    webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
    paymentFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, gap: 6 },
    secureText: { fontSize: 11, color: Colors.grey, fontWeight: '600' },
    // New Video Modal Styles
    videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)' },
    videoFullBox: { width: '92%', backgroundColor: '#111', borderRadius: 24, overflow: 'hidden', elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.5, shadowRadius: 25 },
    videoTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#1A1A1A' },
    videoHeaderTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 15 },
    closeVideoBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    videoContainer: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
    playerStyle: { width: '100%', height: '100%' },
    videoFooter: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#1A1A1A', gap: 8, justifyContent: 'center' },
    videoFooterText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' },
});


