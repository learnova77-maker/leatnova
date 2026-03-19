import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi, paymentApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { WebView } from 'react-native-webview';

export default function StudentCourseDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [course, setCourse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnrolled, setIsEnrolled] = useState(false);
    const [isPaymentLoading, setIsPaymentLoading] = useState(false);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        loadUserAndCourse();
    }, [id]);

    const loadUserAndCourse = async () => {
        try {
            // Get current user
            const userData = await AsyncStorage.getItem('user');
            let user = null;
            if (userData) {
                user = JSON.parse(userData);
                setCurrentUser(user);
            }

            // Fetch course details
            const response = await courseApi.getCourseDetails(id as string);
            if (response.data.success) {
                setCourse(response.data.course);
            }

            // Check enrollment status
            if (user) {
                const enrollResponse = await paymentApi.checkEnrollment({
                    studentId: user.uid,
                    courseId: id as string,
                });
                if (enrollResponse.data.success && enrollResponse.data.enrolled) {
                    setIsEnrolled(true);
                }
            }
        } catch (err) {
            console.error('Error fetching course details:', err);
            Alert.alert('Error', 'Failed to load course details.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!currentUser) {
            Alert.alert('Login Required', 'Please login to enroll in courses.');
            return;
        }

        if (!course) return;

        const price = course.price || '0';

        // If free course, enroll directly
        if (parseFloat(price) === 0) {
            setIsPaymentLoading(true);
            try {
                const response = await paymentApi.createCheckout({
                    courseId: course.id,
                    courseTitle: course.title,
                    price: '0',
                    studentId: currentUser.uid,
                    studentName: currentUser.fullName || '',
                });
                if (response.data.success && response.data.free) {
                    setIsEnrolled(true);
                    Alert.alert('🎉 Enrolled!', 'You are now enrolled in this course. Enjoy!');
                }
            } catch (err) {
                Alert.alert('Error', 'Failed to enroll. Please try again.');
            } finally {
                setIsPaymentLoading(false);
            }
            return;
        }

        // Paid course - create Stripe checkout session
        setIsPaymentLoading(true);
        try {
            const response = await paymentApi.createCheckout({
                courseId: course.id,
                courseTitle: course.title,
                price: price,
                studentId: currentUser.uid,
                studentName: currentUser.fullName || '',
            });

            if (response.data.success && response.data.url) {
                setCheckoutUrl(response.data.url);
            }
        } catch (err) {
            console.error('Checkout error:', err);
            Alert.alert('Error', 'Failed to start payment. Please try again.');
        } finally {
            setIsPaymentLoading(false);
        }
    };

    const handleWebViewNavigation = async (navState: any) => {
        // Check if user reached success page
        if (navState.url && navState.url.includes('payment-success')) {
            setCheckoutUrl(null);
            // Extract session_id from URL
            const urlParams = new URL(navState.url);
            const sessionId = urlParams.searchParams.get('session_id');

            if (sessionId) {
                try {
                    const verifyResponse = await paymentApi.verifyPayment(sessionId);
                    if (verifyResponse.data.success) {
                        setIsEnrolled(true);
                        Alert.alert('🎉 Payment Successful!', 'You are now enrolled in this course!');
                    }
                } catch (err) {
                    // Even if verify fails, try to check enrollment
                    loadUserAndCourse();
                }
            } else {
                setIsEnrolled(true);
                Alert.alert('🎉 Enrolled!', 'Welcome to the course!');
            }
        }

        // User cancelled payment
        if (navState.url && navState.url.includes('payment-cancel')) {
            setCheckoutUrl(null);
            Alert.alert('Payment Cancelled', 'You can try again anytime.');
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
                                                    } else if (lecture.videoUrl) {
                                                        Alert.alert('Video Uploaded', `Starting Video File: ${lecture.title}`);
                                                    } else if (lecture.url) {
                                                        Alert.alert('Video Link', `Opening URL: ${lecture.url}`);
                                                    } else {
                                                        Alert.alert('Lecture', `Starting: ${lecture.title}`);
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
                        style={[styles.actionBtn, isPaymentLoading && { opacity: 0.7 }]}
                        onPress={handleEnroll}
                        disabled={isPaymentLoading}
                    >
                        {isPaymentLoading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <View style={styles.actionBtnInner}>
                                <Ionicons name={isFree ? 'rocket' : 'card'} size={20} color="#FFF" />
                                <Text style={styles.actionBtnText}>
                                    {isFree ? 'Enroll for Free' : `Pay $${course.price} & Enroll`}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Stripe Checkout WebView Modal */}
            <Modal visible={!!checkoutUrl} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={[styles.webviewHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                        <TouchableOpacity onPress={() => setCheckoutUrl(null)}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.webviewTitle, { color: colors.text }]}>Secure Payment</Text>
                        <Ionicons name="shield-checkmark" size={24} color="#16A34A" />
                    </View>
                    {checkoutUrl && (
                        <WebView
                            source={{ uri: checkoutUrl }}
                            onNavigationStateChange={handleWebViewNavigation}
                            startInLoadingState
                            renderLoading={() => (
                                <View style={styles.webviewLoading}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading payment page...</Text>
                                </View>
                            )}
                        />
                    )}
                </SafeAreaView>
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
    // WebView Styles
    webviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
    webviewTitle: { fontSize: 17, fontWeight: 'bold' },
    webviewLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
});
