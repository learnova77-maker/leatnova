import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi, liveApi, userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function NotificationsScreen() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [role, setRole] = useState<'teacher' | 'student'>('student');
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setRole(user.role || 'student');
                const res = await userApi.getNotifications(user.uid);
                if (res.data.success) {
                    setNotifications(res.data.notifications);
                }
            }
        } catch (err) {
            console.error('Error loading notifications:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    }, []);

    const markAsRead = async (id: string) => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                await userApi.markNotificationRead(user.uid, id);
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            }
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    };

    const handleNotificationPress = async (item: any) => {
        await markAsRead(item.id);

        // Navigation based on type
        if (item.type === 'assignment' && role === 'student') {
            router.push('/student/homework');
        } else if (item.type === 'submission' && role === 'teacher') {
            router.push('/teacher/assignments');
        } else if (item.type === 'social') {
            router.push('/student/social');
        } else if (item.type === 'live-scheduled' && role === 'student') {
            router.push('/student/live');
        }
    };

    const handleGoLive = async (item: any) => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);

            // 1. Start live session
            const channelName = `live_${item.courseId}_${Date.now()}`;
            await liveApi.startSession({
                channelName,
                teacherId: user.uid,
                teacherName: user.displayName || user.name || 'Teacher',
                title: item.lectureTitle || 'Live Class',
            });

            // 2. Send 'Live Now!' notification to all enrolled students
            const enrollRes = await courseApi.getCourseAnalytics(item.courseId);
            // We use a dedicated endpoint to broadcast
            await liveApi.broadcastLiveNow({
                courseId: item.courseId,
                teacherId: user.uid,
                lectureTitle: item.lectureTitle || 'Live Class',
            });

            // 3. Mark this notification as read
            await markAsRead(item.id);

            // 4. Navigate teacher to live screen
            router.push('/teacher/live');
        } catch (err) {
            console.error('Go Live error:', err);
            Alert.alert('Error', 'Could not start the live session. Please try again.');
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement': return 'megaphone';
            case 'social': return 'chatbubbles';
            case 'enrollment': return 'person-add';
            case 'assignment': return 'document-text';
            case 'submission': return 'cloud-upload';
            case 'live-scheduled': return 'radio';
            case 'teacher-go-live': return 'videocam';
            case 'live-now': return 'pulse';
            default: return 'notifications';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'announcement': return '#EF4444';
            case 'social': return '#3B82F6';
            case 'enrollment': return '#10B981';
            case 'assignment': return '#8B5CF6';
            case 'submission': return '#F59E0B';
            case 'live-scheduled': return '#EF4444';
            case 'teacher-go-live': return '#EF4444';
            case 'live-now': return '#EF4444';
            default: return Colors.primary;
        }
    };

    const markAllAsRead = async () => {
        // Optimistic: mark all locally immediately
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                await userApi.markAllNotificationsRead(user.uid);
            }
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar
                role={role}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <AppHeader
                title="Notifications"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role={role}
            />

            {/* Mark All Read bar */}
            {unreadCount > 0 && (
                <View style={[styles.markAllBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <Text style={[styles.unreadLabel, { color: colors.textSecondary }]}>{unreadCount} unread</Text>
                    <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
                        <Ionicons name="checkmark-done" size={18} color={Colors.primary} />
                        <Text style={styles.markAllText}>Mark All Read</Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.screenContainer}>
                <FlatList
                    data={notifications}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={() => (
                        isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                            <View style={styles.emptyState}>
                                <Ionicons name="notifications-off-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No notifications yet.</Text>
                            </View>
                    )}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.notifItem,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                !item.read && { borderLeftWidth: 4, borderLeftColor: Colors.primary }
                            ]}
                            onPress={() => handleNotificationPress(item)}
                        >
                            <View style={[styles.iconBox, { backgroundColor: getIconColor(item.type) + '15' }]}>
                                <Ionicons name={getIcon(item.type) as any} size={22} color={getIconColor(item.type)} />
                            </View>
                            <View style={styles.notifInfo}>
                                <View style={styles.notifHeader}>
                                    <Text style={[styles.notifTitle, { color: colors.text }, !item.read && { fontWeight: 'bold' }]}>{item.title}</Text>
                                    <Text style={styles.notifTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                <Text style={[styles.notifMsg, { color: colors.textSecondary }]} numberOfLines={2}>{item.message}</Text>
                                {item.senderName && <Text style={styles.sender}>From: {item.senderName}</Text>}
                                {item.type === 'teacher-go-live' && (
                                    <TouchableOpacity
                                        style={styles.goLiveBtn}
                                        onPress={() => handleGoLive(item)}
                                    >
                                        <Ionicons name="radio" size={16} color="#FFF" />
                                        <Text style={styles.goLiveBtnText}>Go Live Now</Text>
                                    </TouchableOpacity>
                                )}
                                {item.type === 'live-now' && role === 'student' && (
                                    <TouchableOpacity
                                        style={[styles.goLiveBtn, { backgroundColor: '#3B82F6' }]}
                                        onPress={() => { markAsRead(item.id); router.push('/student/live'); }}
                                    >
                                        <Ionicons name="videocam" size={16} color="#FFF" />
                                        <Text style={styles.goLiveBtnText}>Join Live</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.listContent}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    screenContainer: { flex: 1, paddingHorizontal: 15 },
    listContent: { paddingVertical: 20 },
    notifItem: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    notifInfo: { flex: 1 },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notifTitle: { fontSize: 15, color: '#1F2937' },
    notifTime: { fontSize: 11, color: '#9CA3AF' },
    notifMsg: { fontSize: 13, color: '#4B5563', lineHeight: 18 },
    sender: { fontSize: 11, color: Colors.primary, marginTop: 4, fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { fontSize: 16, marginTop: 10 },
    goLiveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
        marginTop: 10,
        alignSelf: 'flex-start',
        gap: 8,
    },
    goLiveBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 13,
    },
    markAllBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    unreadLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    markAllText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: 'bold',
    },
});
