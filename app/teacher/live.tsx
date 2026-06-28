import LiveSession from '@/components/live/LiveSession';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi, liveApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TeacherLive() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [roomName, setRoomName] = useState('');
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [scheduledLives, setScheduledLives] = useState<any[]>([]);
    const [fetchingScheduled, setFetchingScheduled] = useState(true);
    const [currentTime, setCurrentTime] = useState(Date.now()); // Real-time tracker for strict windows

    // Live Session Data
    const [liveData, setLiveData] = useState<{
        appId: string;
        token: string;
        channelName: string;
        uid: number;
        sessionId: string;
        teacherName: string;
        courseId?: string;
        moduleId?: string;
        lectureId?: string;
    } | null>(null);

    // Fetch scheduled live lectures for this teacher
    const fetchScheduledLives = async () => {
        setFetchingScheduled(true);
        try {
            const userDataStr = await AsyncStorage.getItem('user');
            if (!userDataStr) return;
            const user = JSON.parse(userDataStr);

            const res = await courseApi.getTeacherDashboard(user.uid);
            if (res.data && res.data.success && res.data.courses) {
                const lives: any[] = [];
                const courses = res.data.courses;

                courses.forEach((course: any) => {
                    if (course && course.modules) {
                        Object.keys(course.modules).forEach(mKey => {
                            const mod = course.modules[mKey];
                            if (mod && mod.lectures) {
                                Object.keys(mod.lectures).forEach(lKey => {
                                    const lec = mod.lectures[lKey];
                                    if (lec && lec.type === 'Live' && lec.scheduledAt) {
                                        lives.push({
                                            ...lec,
                                            id: lKey,
                                            courseId: course.id || course._id,
                                            moduleId: mKey,
                                            courseName: course.title,
                                            moduleTitle: mod.title,
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

                lives.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                setScheduledLives(lives);
            }
        } catch (err: any) {
            console.error('[Live] Fetch Error:', err);
        } finally {
            setFetchingScheduled(false);
        }
    };

    useEffect(() => {
        fetchScheduledLives();
        // Setup ticking timer to auto-update the UI strictly every 10 seconds
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 10000);
        return () => clearInterval(timer);
    }, []);

    const handleGoLive = async (customTitle?: string, courseId?: string, moduleId?: string, lectureId?: string) => {
        const title = customTitle || roomName.trim();
        if (!title) {
            Alert.alert('Required', 'Please enter a room name for the class.');
            return;
        }

        setIsLoading(true);
        try {
            const userDataStr = await AsyncStorage.getItem('user');
            if (!userDataStr) throw new Error('User not logged in');
            const user = JSON.parse(userDataStr);
            const uid = Math.floor(Math.random() * 1000000);

            const tokenRes = await liveApi.getToken({
                channelName: title,
                uid,
                role: 'publisher'
            });

            if (!tokenRes.data.success) throw new Error('Token generation failed');
            const { token, appId } = tokenRes.data;

            const sessionRes = await liveApi.startSession({
                channelName: title,
                teacherId: user.uid,
                teacherName: user.fullName,
                title,
                courseId,
                moduleId,
                lectureId
            });

            if (!sessionRes.data.success) throw new Error('Session registration failed');

            if (courseId) {
                try {
                    await liveApi.broadcastLiveNow({ courseId, teacherId: user.uid, lectureTitle: title });
                } catch (e) { }
            }

            setLiveData({
                appId,
                token,
                channelName: title,
                uid,
                sessionId: sessionRes.data.session.id,
                teacherName: user.fullName,
                courseId,
                moduleId,
                lectureId
            });
            setIsLive(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to start live class.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndLive = async () => {
        const currentLiveData = liveData;

        // 1. Immediately close the live UI
        setIsLive(false);
        setLiveData(null);
        fetchScheduledLives();

        // 2. Perform cleanup in the background
        if (currentLiveData?.sessionId) {
            try {
                // Since this is now background-ish, we don't block the UI
                const res = await liveApi.endSession(currentLiveData.sessionId);

                if (currentLiveData.courseId) {
                    const userDataStr = await AsyncStorage.getItem('user');
                    const user = userDataStr ? JSON.parse(userDataStr) : null;
                    await liveApi.broadcastLiveEnded({
                        courseId: currentLiveData.courseId,
                        teacherId: user?.uid,
                        lectureTitle: currentLiveData.channelName
                    });
                }

                if (currentLiveData.courseId && currentLiveData.moduleId && currentLiveData.lectureId) {
                    await courseApi.markLectureCompleted({
                        courseId: currentLiveData.courseId,
                        moduleId: currentLiveData.moduleId,
                        lectureId: currentLiveData.lectureId
                    });
                }
            } catch (err: any) {
                console.log('Error ending live session cleanup:', err);
            }
        }
    };

    const parseScheduledDate = (dateStr: string) => {
        try {
            if (!dateStr) return null;
            const [datePart, timePart, ampm] = dateStr.split(' ');
            const [year, month, day] = datePart.split('-').map(Number);
            let [hours, minutes] = timePart.split(':').map(Number);

            if (ampm === 'PM' && hours < 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            return new Date(year, month - 1, day, hours, minutes).getTime();
        } catch (e) {
            return null;
        }
    };

    const getLiveStatus = (scheduledAt: string) => {
        const time = parseScheduledDate(scheduledAt);
        if (!time) return 'pending'; // Fallback

        const diff = time - currentTime; // Positive if future, negative if past
        const ONE_MINUTE = 60 * 1000;

        // Strict window: 1 minute BEFORE to 1 minute AFTER
        if (diff > ONE_MINUTE) {
            return 'pending'; // Starts later
        } else if (diff <= ONE_MINUTE && diff >= -ONE_MINUTE) {
            return 'ready';   // Inside the golden +1/-1 min window
        } else {
            return 'missed';  // Passed the +1 min deadline
        }
    };

    if (isLive && liveData) {
        return (
            <LiveSession
                appId={liveData.appId}
                channelName={liveData.channelName}
                token={liveData.token}
                uid={liveData.uid}
                sessionId={liveData.sessionId}
                userName={liveData.teacherName}
                role="publisher"
                onEnd={handleEndLive}
            />
        );
    }

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
            <AppHeader title="MATLOVERSE" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={[styles.promoCard, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)', borderColor: isDark ? 'rgba(0, 174, 239, 0.2)' : 'rgba(0, 174, 239, 0.1)' }]}>
                        <View style={styles.liveBadgeIcon}>
                            <Ionicons name="videocam" size={32} color="#00AEEF" />
                        </View>
                        <Text style={[styles.promoTitle, { color: colors.text }]}>LIVE <Text style={{ color: '#00AEEF' }}>CLASSROOM</Text></Text>
                        <Text style={[styles.promoSub, { color: colors.textSecondary }]}>Start high-quality live classes for up to 1,000 students.</Text>
                    </View>

                    {scheduledLives.length > 0 && (
                        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                <Ionicons name="calendar-outline" size={20} color="#00AEEF" />
                                <Text style={[styles.label, { color: colors.text, marginBottom: 0, fontSize: 13 }]}>SCHEDULED CLASSES</Text>
                            </View>
                            {scheduledLives.map((live, index) => (
                                <View
                                    key={index}
                                    style={[styles.scheduledItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: getLiveStatus(live.scheduledAt) === 'ready' ? '#00AEEF' : colors.border }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: colors.text }}>{live.title.toUpperCase()}</Text>
                                        <Text style={{ fontSize: 9, color: colors.textSecondary, marginTop: 4, letterSpacing: 1 }}>{live.courseName.toUpperCase()}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                            <Ionicons name="time-outline" size={12} color="#00AEEF" />
                                            <Text style={{ fontSize: 10, color: "#00AEEF", fontWeight: '900' }}>{live.scheduledAt}</Text>
                                        </View>
                                    </View>

                                    {(() => {
                                        if (live.isCompleted) {
                                            return (
                                                <View style={styles.statusBadge}>
                                                    <Text style={styles.statusText}>COMPLETED</Text>
                                                </View>
                                            );
                                        }

                                        const status = getLiveStatus(live.scheduledAt);
                                        if (status === 'ready') {
                                            return (
                                                <TouchableOpacity
                                                    style={styles.goLiveBtn}
                                                    onPress={() => handleGoLive(live.title, live.courseId, live.moduleId, live.id)}
                                                    disabled={isLoading}
                                                >
                                                    <Text style={styles.goLiveBtnText}>START LIVE</Text>
                                                </TouchableOpacity>
                                            );
                                        } else if (status === 'missed') {
                                            return (
                                                <View style={[styles.statusBadge, { borderColor: colors.textSecondary }]}>
                                                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>MISSED</Text>
                                                </View>
                                            );
                                        } else {
                                            return (
                                                <View style={[styles.statusBadge, { backgroundColor: 'transparent' }]}>
                                                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>PENDING</Text>
                                                </View>
                                            );
                                        }
                                    })()}
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.label, { color: colors.text }]}>LIVE CLASS TITLE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', color: colors.text, borderColor: colors.border }]}
                            placeholder="e.g. Math Revision Chapter 1"
                            value={roomName}
                            onChangeText={setRoomName}
                            editable={!isLoading}
                            placeholderTextColor={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}
                        />

                        <TouchableOpacity
                            style={[styles.mainLiveBtn, isLoading && { opacity: 0.7 }]}
                            onPress={() => handleGoLive()}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <>
                                    <View style={styles.livePulse} />
                                    <Text style={styles.mainLiveBtnText}>START CLASS</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={async () => {
                            if (roomName.trim()) {
                                try {
                                    await Share.share({
                                        message: `🎓 JOIN CLASS: "${roomName}"`,
                                    });
                                } catch (e) { }
                            }
                        }}
                    >
                        <Ionicons name="share-social-outline" size={20} color="#00AEEF" />
                        <Text style={[styles.infoCardText, { color: colors.textSecondary }]}>
                            {roomName.trim() ? 'LIVE ACCESS DETAILS' : 'CLASS WILL BE VISIBLE TO ALL ENROLLED STUDENTS.'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 32, gap: 20, paddingBottom: 100 },
    promoCard: { padding: 30, borderRadius: 28, alignItems: 'center', borderWidth: 1 },
    liveBadgeIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(0, 174, 239, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    promoTitle: { fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    promoSub: { fontSize: 11, textAlign: 'center', lineHeight: 18, fontWeight: '600', letterSpacing: 0.5 },
    formCard: { padding: 24, borderRadius: 28, borderWidth: 1 },
    label: { fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 2 },
    input: { borderRadius: 16, height: 56, paddingHorizontal: 20, fontSize: 14, borderWidth: 1, marginBottom: 20, fontWeight: '700' },
    mainLiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#00AEEF', height: 60, borderRadius: 16, gap: 12 },
    mainLiveBtnText: { fontSize: 14, fontWeight: '900', color: '#000', letterSpacing: 1 },
    livePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000' },
    scheduledItem: { padding: 20, borderRadius: 20, marginBottom: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0, 174, 239, 0.3)' },
    statusText: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 1 },
    goLiveBtn: { backgroundColor: '#00AEEF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
    goLiveBtnText: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 15, padding: 20, borderRadius: 20, borderWidth: 1 },
    infoCardText: { fontSize: 10, fontWeight: '900', flex: 1, letterSpacing: 1 },
});
