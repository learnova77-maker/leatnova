import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi, paymentApi, userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Keyboard,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { endConnection, finishTransaction, initConnection, purchaseErrorListener, purchaseUpdatedListener } from 'react-native-iap';

const { width } = Dimensions.get('window');

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
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [videoProgressMap, setVideoProgressMap] = useState<Record<string, number>>({});
    const [downloadingVideos, setDownloadingVideos] = useState<Record<string, number>>({});
    const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
    const url = Linking.useURL();

    // Keyboard Tracking
    const keyboardHeight = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
            Animated.timing(keyboardHeight, { toValue: e.endCoordinates.height, duration: 250, useNativeDriver: false }).start();
        });
        const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
            Animated.timing(keyboardHeight, { toValue: 0, duration: 250, useNativeDriver: false }).start();
        });
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    const videoSourceString = typeof selectedVideo === 'string' ? selectedVideo : (selectedVideo?.videoUrl || selectedVideo?.url || null);

    const player = useVideoPlayer(videoSourceString, p => {
        if (videoSourceString) {
            p.loop = false;
            // Native recovery for saved progress will be handled gracefully after player is ready
            p.play();
        }
    });

    useEffect(() => {
        if (!player) return;

        const interval = setInterval(() => {
            // Check status for error or idle failures
            if (player.status === 'error' || player.status === 'idle') {
                if (player.status === 'idle' && isVideoLoading) {
                    setIsVideoLoading(false);
                } else if (player.status === 'error') {
                    setIsVideoLoading(false);
                }
            }
            // Check status for buffering/loading
            else if (player.status === 'loading') {
                setIsVideoLoading(true);
            } else if (player.status === 'readyToPlay' || player.playing) {
                setIsVideoLoading(false);
                // Ensure it plays if it's ready but got stuck
                if (!player.playing) {
                    player.play();
                }
            }

            // Save progress
            const currentTime = player.currentTime;
            if (currentTime && currentTime > 3) {
                const currentPos = currentTime * 1000;
                const videoId = typeof selectedVideo === 'string' ? selectedVideo : selectedVideo?.id || videoSourceString;
                if (videoId) {
                    setVideoProgressMap(prev => {
                        const newMap = { ...prev, [videoId]: currentPos };
                        AsyncStorage.setItem('video_progress', JSON.stringify(newMap)).catch(() => { });
                        return newMap;
                    });
                }
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [player, selectedVideo]);

    // Reset loading state when video changes
    useEffect(() => {
        if (selectedVideo) {
            setIsVideoLoading(true);
        }
    }, [selectedVideo]);

    useEffect(() => {
        loadUserAndCourse();
    }, [id]);

    useEffect(() => {
        const loadDownloaded = async () => {
            try {
                const data = await AsyncStorage.getItem('downloaded_videos');
                if (data) {
                    const parsed = JSON.parse(data);
                    setDownloadedIds(parsed.map((item: any) => item.id));
                }
            } catch (e) { }
        };
        loadDownloaded();
    }, []);

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

    // Google Play IAP Initialization
    useEffect(() => {
        const setupIAP = async () => {
            try {
                await initConnection();
            } catch (err) {
                console.log('IAP Init Error:', err);
            }
        };
        setupIAP();

        const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: any) => {
            if (purchase) {
                try {
                    Alert.alert('DEBUG 1', 'Received Native Purchase');
                    try {
                        await finishTransaction({ purchase, isConsumable: true });
                        Alert.alert('DEBUG 2', 'Finish Transaction Passed');
                    } catch (e: any) {
                        Alert.alert('DEBUG FAILED', 'finishTransaction error: ' + (e?.message || JSON.stringify(e)));
                        throw e; // Bubble up
                    }

                    // Critical: The listener closure might have stale state!
                    // Always read from AsyncStorage to get the latest currentUser to avoid "null" crashes
                    let syncUser = currentUser;
                    if (!syncUser || !syncUser.uid) {
                        const saved = await AsyncStorage.getItem('user');
                        if (saved) {
                            syncUser = JSON.parse(saved);
                        }
                    }
                    if (!syncUser || !syncUser.uid) {
                        setIsPaymentLoading(false);
                        Alert.alert('Session Error', 'Please log in again to sync your purchase.');
                        return;
                    }

                    Alert.alert('DEBUG 3', 'Calling paymentApi.createCheckout for User: ' + syncUser.uid);

                    // Tell our backend to give access
                    await paymentApi.createCheckout({
                        courseId: id as string,
                        courseTitle: 'Premium Course',
                        price: '0',
                        studentId: syncUser.uid,
                        studentName: syncUser.fullName || '',
                        teacherId: '',
                    });

                    Alert.alert('DEBUG 4', 'API Hit Successful!');

                    setIsPaymentLoading(false);
                    Alert.alert('Success', 'Enrollment successful via Google Play!');
                    setIsEnrolled(true);
                    loadUserAndCourse();
                } catch (ackErr: any) {
                    Alert.alert('DEBUG CATCH BLOCK', 'Message: ' + (ackErr?.message || 'Unknown'));
                    console.log('ackErr', ackErr);
                    setIsPaymentLoading(false);
                    Alert.alert('Sync Error', 'Payment succeeded but course sync failed. Please click Join Course again to automatically restore.');
                }
            }
        });

        const purchaseErrorSubscription = purchaseErrorListener((error) => {
            setIsPaymentLoading(false);
            console.log('purchaseErrorListener', error);
            if (error.code !== 'E_USER_CANCELLED') {
                // Don't show confusing errors if it's already owned
            }
        });

        return () => {
            purchaseUpdateSubscription.remove();
            purchaseErrorSubscription.remove();
            endConnection();
        };
    }, []); // Empty dependency array so listener is not recreated multiple times!

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
        try {
            const userData = await AsyncStorage.getItem('user');
            let user = null;
            if (userData) {
                user = JSON.parse(userData);
                setCurrentUser(user);
            }

            const response = await courseApi.getCourseDetails(id as string);
            if (response.data.success) {
                setCourse(response.data.course);
            }

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
            console.error('Error loading course:', err);
        } finally {
            setIsLoading(false);
        }
    };
    const handleSubmitReview = async () => {
        if (!reviewText.trim()) return;
        setIsSubmittingReview(true);
        try {
            const res = await courseApi.addReview({
                courseId: course.id,
                studentId: currentUser.uid,
                studentName: currentUser.fullName || 'Student',
                rating,
                text: reviewText
            });
            if (res.data.success) {
                setReviewText('');
                setRating(5);
                loadUserAndCourse();
            }
        } catch (err) {
            console.error('Review submission failed:', err);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleDeleteReview = async () => {
        const userReviewId = course?.reviews ? Object.keys(course.reviews).find(key => course.reviews[key].studentId === currentUser?.uid) : null;
        if (!userReviewId) return;
        Alert.alert('DELETE REVIEW', 'Are you sure you want to delete your review?', [
            { text: 'CANCEL', style: 'cancel' },
            {
                text: 'CONFIRM', style: 'destructive', onPress: async () => {
                    try {
                        const res = await courseApi.deleteReview(course.id, userReviewId);
                        if (res.data.success) {
                            Alert.alert('DELETED', 'Review has been removed.');
                            loadUserAndCourse();
                        }
                    } catch (e) {
                        Alert.alert('ERROR', 'Could not delete review.');
                    }
                }
            }
        ]);
    };

    useEffect(() => {
        const loadProgress = async () => {
            try {
                const saved = await AsyncStorage.getItem('video_progress');
                if (saved) setVideoProgressMap(JSON.parse(saved));
            } catch (e) { }
        };
        loadProgress();
    }, []);

    useEffect(() => {
        const loadProgress = async () => {
            try {
                const saved = await AsyncStorage.getItem('video_progress');
                if (saved) setVideoProgressMap(JSON.parse(saved));
            } catch (e) { }
        };
        loadProgress();
    }, []);

    const handleEnroll = async () => {
        if (!currentUser) {
            Alert.alert('Login Required', 'Please login to enroll in this course.');
            return;
        }

        if (!course) return;
        setIsPaymentLoading(true);

        const isFree = !course.price || parseFloat(course.price) === 0;

        if (isFree) {
            try {
                const response = await paymentApi.createCheckout({
                    courseId: course.id,
                    courseTitle: course.title,
                    price: '0',
                    studentId: currentUser.uid,
                    studentName: currentUser.fullName || '',
                    teacherId: course.instructorId || course.userId,
                });

                if (response.data.success && response.data.free) {
                    setIsEnrolled(true);
                    loadUserAndCourse();
                }
            } catch (err: any) {
                Alert.alert('Error', 'Failed to enroll in free course.');
            } finally {
                setIsPaymentLoading(false);
            }
        } else {
            try {
                const priceNum = parseInt(course.price) || 0;

                // Fetch latest profile to check coins balance
                const profileRes = await userApi.getProfile(currentUser.uid);
                const userCoins = profileRes.data?.user?.coins || 0;

                if (userCoins < priceNum) {
                    setIsPaymentLoading(false);
                    Alert.alert(
                        'Insufficient Coins',
                        `This course costs ${priceNum} coins, but you only have ${userCoins} coins. Would you like to buy more?`,
                        [
                            { text: 'CANCEL', style: 'cancel' },
                            { text: 'BUY COINS', onPress: () => router.push('/student/wallet') }
                        ]
                    );
                    return;
                }

                // Confirm Purchase
                Alert.alert(
                    'CONFIRM PURCHASE',
                    `Unlock this course for ${priceNum} Coins?`,
                    [
                        { text: 'CANCEL', onPress: () => setIsPaymentLoading(false), style: 'cancel' },
                        {
                            text: 'BUY NOW',
                            onPress: async () => {
                                try {
                                    const res = await paymentApi.buyCourseWithCoins({
                                        studentId: currentUser.uid,
                                        courseId: course.id,
                                        courseTitle: course.title,
                                        price: priceNum,
                                        teacherId: course.instructorId || course.userId,
                                        studentName: currentUser.fullName || ''
                                    });

                                    if (res.data?.success) {
                                        Alert.alert('Success', 'Course unlocked successfully!');
                                        setIsEnrolled(true);
                                        loadUserAndCourse();
                                    } else {
                                        Alert.alert('Error', res.data?.message || 'Transaction failed');
                                    }
                                } catch (e) {
                                    Alert.alert('Error', 'Coin transaction failed. Please check your internet.');
                                } finally {
                                    setIsPaymentLoading(false);
                                }
                            }
                        }
                    ]
                );

            } catch (err: any) {
                setIsPaymentLoading(false);
                Alert.alert('Error', 'Could not process coin transaction.');
            }
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color="#00AEEF" style={{ marginTop: 100 }} />
            </SafeAreaView>
        );
    }

    if (!course) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={{ textAlign: 'center', marginTop: 50, color: colors.textSecondary }}>COURSE NOT AVAILABLE.</Text>
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

    const userReviewId = course?.reviews ? Object.keys(course.reviews).find(key => course.reviews[key].studentId === currentUser?.uid) : null;
    const userReview = userReviewId ? course.reviews[userReviewId] : null;

    const handleDownloadVideo = async (lectureId: string, lectureTitle: string, videoUrl: string) => {
        if (!videoUrl) return Alert.alert('Error', 'Video URL not found.');

        const callback = (downloadProgress: any) => {
            const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
            setDownloadingVideos(prev => ({ ...prev, [lectureId]: progress }));
        };

        setDownloadingVideos(prev => ({ ...prev, [lectureId]: 0 }));
        try {
            let fileName = videoUrl.substring(videoUrl.lastIndexOf('/') + 1).split('?')[0];
            if (!fileName.includes('.')) fileName += '.mp4';
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;

            const downloadResumable = FileSystem.createDownloadResumable(videoUrl, fileUri, {}, callback);
            const downloadResumed = await downloadResumable.downloadAsync();

            if (downloadResumed?.status === 200) {
                const savedData = await AsyncStorage.getItem('downloaded_videos');
                const downloaded = savedData ? JSON.parse(savedData) : [];
                const existingIndex = downloaded.findIndex((item: any) => item.id === lectureId);
                if (existingIndex > -1) downloaded.splice(existingIndex, 1);

                downloaded.push({
                    id: lectureId, title: lectureTitle, courseId: course.id,
                    courseTitle: course.title, thumbnail: course.thumbnail,
                    localUri: downloadResumed.uri, downloadedAt: Date.now()
                });
                await AsyncStorage.setItem('downloaded_videos', JSON.stringify(downloaded));
                setDownloadedIds(prev => [...prev, lectureId]);
                Alert.alert('Download Complete', `${lectureTitle} is now available offline.`);
            } else {
                Alert.alert('Download Failed', 'Could not save the video.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Download Error', 'An error occurred during download.');
        } finally {
            setDownloadingVideos(prev => {
                const updated = { ...prev };
                delete updated[lectureId];
                return updated;
            });
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader
                title="COURSE DETAILS"
                showBack={true}
                onBackPress={() => router.back()}
                role="student"
            />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Course Header */}
                <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.imageBox, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                        {course.thumbnail ? (
                            <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                        ) : (
                            <Ionicons name="journal-outline" size={30} color="#00AEEF" />
                        )}
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <View style={[styles.tag, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                <Text style={[styles.tagText, { color: colors.textSecondary }]}>{course.category || 'COURSE'}</Text>
                            </View>
                            <View style={[styles.tag, { backgroundColor: course.type === 'Live' ? '#00AEEF' : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)') }]}>
                                <Text style={[styles.tagText, { color: course.type === 'Live' ? '#000' : colors.textSecondary }]}>
                                    {course.type === 'Live' ? 'LIVE COURSE' : 'RECORDED'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>{course.title}</Text>
                        <Text style={[styles.instructor, { color: colors.textSecondary }]}>By: {course.instructorName || 'Teacher'}</Text>
                    </View>
                </View>

                {/* Course Stats */}
                <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Ionicons name="layers-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.statLabel, { color: colors.text }]}>{modules.length} MODULES</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="hardware-chip-outline" size={16} color={colors.textSecondary} />
                        <Text style={[styles.statLabel, { color: colors.text }]}>VERIFIED</Text>
                    </View>
                    {isEnrolled && (
                        <View style={styles.statItem}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#00AEEF" />
                            <Text style={[styles.statLabel, { color: '#00AEEF' }]}>ENROLLED</Text>
                        </View>
                    )}
                </View>

                {/* Curriculum */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>LECTURES</Text>
                    <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>List of all modules and lessons.</Text>
                </View>

                {modules.length > 0 ? (
                    modules.map((module: any, index) => (
                        <View key={module.id} style={[styles.moduleBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.moduleHeader, { borderBottomColor: colors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.moduleNumber}>Part 0{index + 1}</Text>
                                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{module.title}</Text>
                                </View>
                                {!isEnrolled && !isFree && (
                                    <View style={styles.lockBadge}>
                                        <Ionicons name="lock-closed" size={12} color="#00AEEF" />
                                        <Text style={styles.lockText}>LOCKED</Text>
                                    </View>
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
                                                style={[styles.lectureRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)' }, isLocked && { opacity: 0.3 }]}
                                                disabled={isLocked}
                                                onPress={() => {
                                                    if (lecture.type === 'Live') {
                                                        router.push('/student/live');
                                                    } else {
                                                        const videoLink = lecture.url || lecture.videoUrl || lecture.video || lecture.link;
                                                        if (videoLink) {
                                                            setSelectedVideo(videoLink);
                                                        } else {
                                                            Alert.alert('NOT AVAILABLE', 'This video is not available right now.');
                                                        }
                                                    }
                                                }}
                                            >
                                                <View style={[styles.lectureIcon, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                                    <Ionicons
                                                        name={lecture.type === 'Live' ? 'pulse' : (lecture.isRecorded ? 'videocam-outline' : 'play-outline')}
                                                        size={18}
                                                        color={isLocked ? colors.textSecondary : "#00AEEF"}
                                                    />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.lectureTitle, { color: colors.text }]}>{lecture.title}</Text>
                                                    <Text style={[styles.lectureMeta, { color: lecture.isRecorded ? '#00AEEF' : colors.textSecondary, fontWeight: lecture.isRecorded ? 'bold' : 'normal' }]}>
                                                        {lecture.type === 'Live' ? 'LIVE CLASS' : (lecture.isRecorded ? 'Recorded Video' : `${lecture.duration || '00:00'}`)}
                                                    </Text>
                                                </View>
                                                {(lecture.isRecorded || lecture.videoUrl || lecture.url) && !isLocked && (
                                                    <View style={{ marginRight: 5, padding: 10 }}>
                                                        {downloadedIds.includes(lKey) ? (
                                                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                                        ) : downloadingVideos[lKey] !== undefined ? (
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                                <ActivityIndicator size="small" color="#00AEEF" />
                                                                <Text style={{ fontSize: 10, color: '#00AEEF', fontWeight: 'bold' }}>
                                                                    {Math.round(downloadingVideos[lKey])}%
                                                                </Text>
                                                            </View>
                                                        ) : (
                                                            <TouchableOpacity
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    const videoLink = lecture.url || lecture.videoUrl || lecture.video || lecture.link;
                                                                    handleDownloadVideo(lKey, lecture.title, videoLink);
                                                                }}
                                                            >
                                                                <Ionicons name="download-outline" size={20} color="#00AEEF" />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                                <Ionicons name="chevron-forward" size={14} color={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} />
                                            </TouchableOpacity>
                                        );
                                    })
                                ) : (
                                    <Text style={[styles.noLectures, { color: colors.textSecondary }]}>NO LECTURES FOUND.</Text>
                                )}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={[styles.emptyContent, { borderColor: colors.border }]}>
                        <Ionicons name="cloud-offline-outline" size={50} color={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>EMPTY COURSE</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>NO MODULES FOUND IN THIS COURSE.</Text>
                    </View>
                )}

                {/* Enrollment Button */}
                {!isEnrolled && (
                    <TouchableOpacity
                        style={[styles.actionBtn, isPaymentLoading && { opacity: 0.7 }]}
                        onPress={handleEnroll}
                        disabled={isPaymentLoading}
                    >
                        {isPaymentLoading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.actionBtnText}>
                                {isFree ? 'ENROLL FREE' : `JOIN WITH ${course.price} COINS`}
                            </Text>
                        )}
                    </TouchableOpacity>
                )}

                {/* Review Section */}
                {isEnrolled && (
                    <View style={styles.reviewSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>COURSE <Text style={{ color: '#00AEEF' }}>REVIEWS</Text></Text>
                            <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>What you think about this course.</Text>
                        </View>
                        {userReview ? (
                            <View style={[styles.myReviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.myReviewHeader}>
                                    <Text style={[styles.myReviewName, { color: colors.text }]}>YOUR REVIEW</Text>
                                    <View style={styles.starsRow}>
                                        {[...Array(5)].map((_, i) => (
                                            <Ionicons key={i} name={i < userReview.rating ? "star" : "star-outline"} size={14} color="#FBBF24" />
                                        ))}
                                    </View>
                                </View>
                                <Text style={[styles.myReviewText, { color: colors.textSecondary }]}>{userReview.text}</Text>
                                <TouchableOpacity style={styles.deleteReviewBtn} onPress={handleDeleteReview}>
                                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                    <Text style={styles.deleteReviewText}>Delete Review</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={[styles.directReviewBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.ratingSelect}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <TouchableOpacity key={star} onPress={() => setRating(star)}>
                                            <Ionicons name={star <= rating ? "star" : "star-outline"} size={28} color="#FBBF24" style={{ marginHorizontal: 4 }} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TextInput
                                    style={[styles.reviewInputDirect, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                    placeholder="Write your review here..."
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    value={reviewText}
                                    onChangeText={setReviewText}
                                />
                                <TouchableOpacity
                                    style={[styles.submitReviewBtnDirect, isSubmittingReview && { opacity: 0.7 }]}
                                    onPress={handleSubmitReview}
                                    disabled={isSubmittingReview}
                                >
                                    {isSubmittingReview ? <ActivityIndicator color="#000" /> : <Text style={styles.submitReviewText}>Submit Review</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
            <Animated.View style={{ height: keyboardHeight }} />

            {/* Video Player Modal */}
            <Modal visible={!!selectedVideo} animationType="fade" transparent={true}>
                <View style={styles.videoModalContainer}>
                    <TouchableOpacity style={styles.videoOverlay} activeOpacity={1} onPress={() => setSelectedVideo(null)} />
                    <View style={[styles.videoFullBox, { backgroundColor: '#000' }]}>
                        <View style={styles.videoTopHeader}>
                            <Text style={styles.videoHeaderTitle}>VIDEO PLAYER</Text>
                            <TouchableOpacity style={styles.closeVideoBtn} onPress={() => {
                                setSelectedVideo(null);
                                player.pause();
                            }}>
                                <Ionicons name="close" size={24} color="#00AEEF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.videoContainer}>
                            {videoSourceString && (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    {isVideoLoading && (
                                        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1, backgroundColor: '#000' }]}>
                                            <ActivityIndicator size="large" color="#00AEEF" />
                                            <Text style={{ color: '#00AEEF', marginTop: 10, fontSize: 12, letterSpacing: 1 }}>LOADING VIDEO...</Text>
                                        </View>
                                    )}
                                    <VideoView
                                        player={player}
                                        style={styles.playerStyle}
                                        allowsFullscreen
                                        allowsPictureInPicture
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 32, paddingTop: 40, paddingBottom: 100 },
    headerCard: { flexDirection: 'row', borderRadius: 24, padding: 24, marginBottom: 25, borderWidth: 1 },
    imageBox: { width: 80, height: 80, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
    headerInfo: { flex: 1, justifyContent: 'center' },
    tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
    tagText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
    instructor: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    sectionHeader: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    sectionSub: { fontSize: 9, marginTop: 8, fontWeight: '700', letterSpacing: 0.5 },
    moduleBox: { borderRadius: 24, marginBottom: 20, overflow: 'hidden', borderWidth: 1 },
    moduleHeader: { padding: 20, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
    moduleNumber: { fontSize: 8, fontWeight: '900', color: '#00AEEF', marginBottom: 6, letterSpacing: 1 },
    moduleTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0, 174, 239, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    lockText: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 0.5 },
    lectureList: { padding: 12 },
    lectureRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 16, marginBottom: 8 },
    lectureIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    lectureTitle: { fontSize: 13, fontWeight: '600' },
    lectureMeta: { fontSize: 9, marginTop: 2, fontWeight: '900', letterSpacing: 0.5 },
    noLectures: { textAlign: 'center', padding: 25, fontSize: 10, fontWeight: '900' },
    emptyContent: { alignItems: 'center', padding: 50, borderRadius: 24, borderStyle: 'dashed', borderWidth: 1 },
    emptyTitle: { fontSize: 14, fontWeight: '900', marginTop: 15, letterSpacing: 2 },
    emptySub: { fontSize: 10, textAlign: 'center', marginTop: 10, fontWeight: '700', letterSpacing: 0.5, lineHeight: 16 },
    actionBtn: { backgroundColor: '#00AEEF', height: 62, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
    actionBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    thumbnailImg: { width: '100%', height: '100%', borderRadius: 16 },
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    videoOverlay: { ...StyleSheet.absoluteFillObject },
    videoFullBox: { width: '100%' },
    videoTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32 },
    videoHeaderTitle: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    closeVideoBtn: { padding: 5 },
    videoContainer: { width: '100%', aspectRatio: 16 / 9 },
    playerStyle: { width: '100%', height: '100%' },
    reviewSection: { marginTop: 40 },
    myReviewCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginTop: 15 },
    myReviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    myReviewName: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    starsRow: { flexDirection: 'row' },
    myReviewText: { fontSize: 13, lineHeight: 20 },
    deleteReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 15, alignSelf: 'flex-start' },
    deleteReviewText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    submitReviewText: { color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    directReviewBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginTop: 15 },
    reviewInputDirect: { height: 100, borderWidth: 1, borderRadius: 12, padding: 15, textAlignVertical: 'top', fontSize: 14, marginTop: 15 },
    submitReviewBtnDirect: { backgroundColor: '#00AEEF', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
    statsBar: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 16, padding: 20, marginBottom: 35, alignItems: 'center', gap: 10, borderWidth: 1 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5 },
    ratingSelect: { flexDirection: 'row', justifyContent: 'center' },
    statLine: { width: 1, height: 15 },
    statLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, flexShrink: 1 },
});
