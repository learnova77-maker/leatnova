import LiveSession from '@/components/live/LiveSession';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { liveApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function StudentLive() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [recordedSessions, setRecordedSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiveRoom, setIsLiveRoom] = useState(false);
    const [userName, setUserName] = useState('Student');

    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [joinData, setJoinData] = useState<{
        appId: string;
        token: string;
        channelName: string;
        uid: number;
        sessionId: string;
    } | null>(null);

    const fetchSessions = async () => {
        try {
            const [activeRes, recordedRes] = await Promise.all([
                liveApi.getActiveSessions(),
                liveApi.getRecordedSessions(),
            ]);
            if (activeRes.data.success) {
                setActiveSessions(activeRes.data.sessions);
            }
            if (recordedRes.data.success) {
                setRecordedSessions(recordedRes.data.sessions);
            }
        } catch (err) {
            console.error('Error fetching live sessions:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const loadUser = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserName(user.fullName);
            }
        };
        loadUser();
        fetchSessions();
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleJoinSession = async (session: any) => {
        setIsLoading(true);
        try {
            const uid = Math.floor(Math.random() * 1000000);
            const tokenRes = await liveApi.getToken({
                channelName: session.channelName,
                uid,
                role: 'subscriber'
            });

            if (!tokenRes.data.success) throw new Error('Failed to join live session');
            const { token, appId } = tokenRes.data;

            setJoinData({
                appId,
                token,
                channelName: session.channelName,
                uid,
                sessionId: session.id
            });
            setIsLiveRoom(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not join live class.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveSession = () => {
        setIsLiveRoom(false);
        setJoinData(null);
    };

    const handleWatchRecording = (session: any) => {
        if (session.recordingUrl) {
            setSelectedVideo(session.recordingUrl);
        } else {
            Alert.alert('Not Available', 'Recording is not available for this session.');
        }
    };

    const formatTimeAgo = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        const mins = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    const formatDuration = (startedAt: number, endedAt: number) => {
        const diff = Math.floor((endedAt - startedAt) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    if (isLiveRoom && joinData) {
        return (
            <LiveSession
                appId={joinData.appId}
                channelName={joinData.channelName}
                token={joinData.token}
                uid={joinData.uid}
                sessionId={joinData.sessionId}
                userName={userName}
                role="subscriber"
                onEnd={handleLeaveSession}
            />
        );
    }

    const renderActiveItem = (item: any) => (
        <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.liveBadgeSmall, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' }]}>
                <View style={styles.dot} />
                <Text style={styles.liveTextSmall}>LIVE NOW</Text>
            </View>
            <View style={styles.listText}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.instructorName, { color: colors.textSecondary }]}>BY {item.teacherName?.toUpperCase()}</Text>
            </View>
            <TouchableOpacity
                style={styles.joinBtn}
                onPress={() => handleJoinSession(item)}
            >
                <Text style={styles.joinBtnText}>JOIN LIVE</Text>
                <Ionicons name="flash-outline" size={16} color="#000" />
            </TouchableOpacity>
        </View>
    );

    const renderRecordedItem = (item: any) => (
        <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.liveBadgeSmall, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}>
                <Ionicons name={item.recordingUrl ? "videocam-outline" : "hourglass-outline"} size={12} color={item.recordingUrl ? colors.textSecondary : '#F59E0B'} />
                <Text style={[styles.liveTextSmall, { color: item.recordingUrl ? colors.textSecondary : '#F59E0B' }]}>{item.recordingUrl ? 'RECORDED' : 'PROCESSING'}</Text>
            </View>
            <View style={styles.listText}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                    <Text style={[styles.instructorName, { color: colors.textSecondary }]}>BY {item.teacherName?.toUpperCase()}</Text>
                    {item.startedAt && item.endedAt && (
                        <Text style={{ fontSize: 9, color: '#00AEEF', fontWeight: '900' }}>
                            {formatDuration(item.startedAt, item.endedAt)}
                        </Text>
                    )}
                    {item.endedAt && (
                        <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700' }}>
                            {formatTimeAgo(item.endedAt)}
                        </Text>
                    )}
                </View>
            </View>
            {item.recordingUrl ? (
                <TouchableOpacity
                    style={[styles.joinBtn, { backgroundColor: isDark ? 'rgba(0,174,239,0.15)' : 'rgba(0,174,239,0.1)' }]}
                    onPress={() => handleWatchRecording(item)}
                >
                    <Ionicons name="play" size={16} color="#00AEEF" />
                    <Text style={[styles.joinBtnText, { color: '#00AEEF' }]}>WATCH REPLAY</Text>
                </TouchableOpacity>
            ) : (
                <View style={[styles.joinBtn, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.05)' }]}>
                    <Ionicons name="cloud-upload-outline" size={16} color="#F59E0B" />
                    <Text style={[styles.joinBtnText, { color: '#F59E0B' }]}>Recording Processing...</Text>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="LIVE CLASSES" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContainer}>
                {isLoading && activeSessions.length === 0 && recordedSessions.length === 0 ? (
                    <View style={{ marginTop: 100 }}>
                        <ActivityIndicator size="large" color="#00AEEF" />
                    </View>
                ) : (
                    <FlatList
                        data={[]}
                        renderItem={() => null}
                        ListHeaderComponent={
                            <>
                                {/* Active Live Sessions */}
                                <View style={styles.sectionHeader}>
                                    <Text style={[styles.screenTitle, { color: colors.text }]}>LIVE <Text style={{ color: '#FF4444' }}>NOW</Text></Text>
                                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Join interactive live classes from your instructors.</Text>
                                </View>

                                {activeSessions.length > 0 ? (
                                    activeSessions.map(item => (
                                        <View key={item.id}>{renderActiveItem(item)}</View>
                                    ))
                                ) : (
                                    <View style={styles.emptyStateSmall}>
                                        <Ionicons name="radio-outline" size={28} color={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                                        <Text style={[styles.emptyTextSmall, { color: colors.textSecondary }]}>No live classes right now</Text>
                                    </View>
                                )}

                                {/* Recorded Sessions - YouTube-like replays */}
                                <View style={[styles.sectionHeader, { marginTop: 35 }]}>
                                    <Text style={[styles.screenTitle, { color: colors.text }]}>PAST <Text style={{ color: '#00AEEF' }}>RECORDINGS</Text></Text>
                                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Watch recorded live classes anytime, just like YouTube.</Text>
                                </View>

                                {recordedSessions.length > 0 ? (
                                    recordedSessions.map(item => (
                                        <View key={item.id}>{renderRecordedItem(item)}</View>
                                    ))
                                ) : (
                                    <View style={styles.emptyStateSmall}>
                                        <Ionicons name="film-outline" size={28} color={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                                        <Text style={[styles.emptyTextSmall, { color: colors.textSecondary }]}>No recordings available yet</Text>
                                    </View>
                                )}
                            </>
                        }
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                {/* Floating refresh button */}
                <TouchableOpacity
                    style={styles.floatingRefresh}
                    onPress={() => { setIsLoading(true); fetchSessions(); }}
                >
                    <Ionicons name="refresh-outline" size={20} color="#FFF" />
                </TouchableOpacity>
                {/* Video Player Modal */}
                <Modal visible={!!selectedVideo} animationType="fade" transparent={true}>
                    <View style={styles.videoModalContainer}>
                        <TouchableOpacity style={styles.videoOverlay} activeOpacity={1} onPress={() => setSelectedVideo(null)} />
                        <View style={[styles.videoFullBox, { backgroundColor: '#000' }]}>
                            <View style={styles.videoTopHeader}>
                                <Text style={styles.videoHeaderTitle}>LIVE REPLAY</Text>
                                <TouchableOpacity style={styles.closeVideoBtn} onPress={() => setSelectedVideo(null)}>
                                    <Ionicons name="close" size={24} color="#00AEEF" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.videoContainer}>
                                {selectedVideo && (
                                    <Video
                                        source={{ uri: selectedVideo }}
                                        rate={1.0}
                                        volume={1.0}
                                        isMuted={false}
                                        resizeMode={ResizeMode.CONTAIN}
                                        shouldPlay
                                        useNativeControls
                                        style={styles.playerStyle}
                                    />
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
    sectionHeader: {
        marginBottom: 20,
        marginTop: 10,
    },
    screenTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },
    screenSub: {
        fontSize: 10,
        marginTop: 6,
        lineHeight: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    listContent: {
        paddingBottom: 100,
        paddingTop: 20,
    },
    listItem: {
        padding: 20,
        borderRadius: 20,
        marginBottom: 14,
        borderWidth: 1,
    },
    liveBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        alignSelf: 'flex-start',
        gap: 6,
        marginBottom: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF4444',
    },
    liveTextSmall: {
        fontSize: 9,
        fontWeight: '900',
        color: '#FF4444',
        letterSpacing: 1,
    },
    listText: {
        marginBottom: 16,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    instructorName: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    joinBtn: {
        backgroundColor: '#00AEEF',
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    joinBtnText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
    },
    emptyStateSmall: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 10,
    },
    emptyTextSmall: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    floatingRefresh: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#00AEEF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#00AEEF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    videoOverlay: { ...StyleSheet.absoluteFillObject },
    videoFullBox: { width: '100%' },
    videoTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32 },
    videoHeaderTitle: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    closeVideoBtn: { padding: 5 },
    videoContainer: { width: '100%', aspectRatio: 16 / 9 },
    playerStyle: { width: '100%', height: '100%' },
});
