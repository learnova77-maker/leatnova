import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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

    const getIcon = (type: string) => {
        switch (type) {
            case 'announcement': return 'megaphone';
            case 'social': return 'chatbubbles';
            case 'enrollment': return 'person-add';
            default: return 'notifications';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'announcement': return '#EF4444';
            case 'social': return '#3B82F6';
            case 'enrollment': return '#10B981';
            default: return Colors.primary;
        }
    };

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
                            onPress={() => markAsRead(item.id)}
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
});
