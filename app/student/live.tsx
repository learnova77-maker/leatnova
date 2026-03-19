import LiveSession from '@/components/live/LiveSession';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { liveApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentLive() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [activeSessions, setActiveSessions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLiveRoom, setIsLiveRoom] = useState(false);
    const [userName, setUserName] = useState('Student');
    const [userUid, setUserUid] = useState<number | null>(null);

    // Live Session Data
    const [joinData, setJoinData] = useState<{
        appId: string;
        token: string;
        channelName: string;
        uid: number;
        sessionId: string;
    } | null>(null);

    const fetchSessions = async () => {
        try {
            const response = await liveApi.getActiveSessions();
            if (response.data.success) {
                setActiveSessions(response.data.sessions);
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
        // Poll every 10 seconds for new live classes
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleJoinSession = async (session: any) => {
        setIsLoading(true);
        try {
            const uid = Math.floor(Math.random() * 1000000);

            // Get Agora Token as subscriber
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

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Live Classes" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>Active Sessions</Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Join interactive live classes from your favorite tutors.</Text>
                </View>

                {isLoading && activeSessions.length === 0 ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={activeSessions}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.liveBadgeSmall}>
                                    <View style={styles.dot} />
                                    <Text style={styles.liveTextSmall}>LIVE</Text>
                                </View>
                                <View style={styles.listText}>
                                    <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.instructorName, { color: colors.textSecondary }]}>By {item.teacherName}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.joinBtn}
                                    onPress={() => handleJoinSession(item)}
                                >
                                    <Text style={styles.joinBtnText}>Join Now</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="videocam-outline" size={50} color={Colors.grey} />
                                <Text style={styles.emptyText}>No live classes at the moment.</Text>
                                <TouchableOpacity onPress={fetchSessions}>
                                    <Text style={styles.refreshText}>Refresh List</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    screenContainer: { flex: 1, padding: 24 },
    screenHeader: { marginBottom: 25 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.secondary },
    screenSub: { fontSize: 14, color: Colors.grey, marginTop: 4, lineHeight: 20 },
    listContent: { paddingBottom: 40 },
    listItem: { backgroundColor: Colors.white, padding: 20, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: '#F0F0F0', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    liveBadgeSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', gap: 5, marginBottom: 12 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4444' },
    liveTextSmall: { fontSize: 10, fontWeight: 'bold', color: '#FF4444' },
    listText: { marginBottom: 15 },
    itemName: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary, marginBottom: 4 },
    instructorName: { fontSize: 13, color: Colors.grey },
    joinBtn: { backgroundColor: Colors.primary, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    joinBtnText: { fontSize: 16, fontWeight: 'bold', color: Colors.secondary },
    emptyState: { alignItems: 'center', marginTop: 100, gap: 15 },
    emptyText: { color: Colors.grey, fontSize: 15, textAlign: 'center' },
    refreshText: { color: Colors.primary, fontWeight: 'bold', fontSize: 14, textDecorationLine: 'underline' }
});
