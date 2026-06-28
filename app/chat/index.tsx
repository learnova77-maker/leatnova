import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { chatApi, userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatInbox() {
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [inbox, setInbox] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const router = useRouter();
    const isFocused = useIsFocused();

    useEffect(() => {
        loadInbox();
    }, [isFocused]);

    const loadInbox = async () => {
        try {
            setIsLoading(true);
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUser(user);

                const resp = await chatApi.getInbox(user.uid);
                if (resp && resp.data && resp.data.success) {
                    setInbox(resp.data.inbox || []);
                }
            }
        } catch (err) {
            console.error('Error loading inbox:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const resp = await userApi.searchByUsername(searchQuery.trim().toLowerCase());
            if (resp.data.success && resp.data.user) {
                const u = resp.data.user;
                if (u.uid === currentUser?.uid) {
                    Alert.alert('Its You!', 'You searched for your own username.');
                } else {
                    router.push(`/chat/${u.uid}?name=${encodeURIComponent(u.fullName)}`);
                    setSearchQuery('');
                }
            } else {
                Alert.alert('Not Found', 'No user exists with this username.');
            }
        } catch (err) {
            Alert.alert('Search Error', 'Could not search user. Please try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const formatTime = (ts: number) => {
        if (!ts) return '';
        const d = new Date(ts);
        return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const renderInboxItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.inboxItem, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/chat/${item.userId}?name=${encodeURIComponent(item.userName)}`)}
        >
            <View style={styles.avatar}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{item.userName?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.userName}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>{formatTime(item.lastMessageTime)}</Text>
                </View>
                <Text style={[
                    styles.lastMsg,
                    {
                        color: item.unreadCount > 0 ? colors.text : colors.textSecondary,
                        fontWeight: item.unreadCount > 0 ? 'bold' : 'normal'
                    }
                ]} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
            {item.unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#00AEEF' }]}>
                    <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="CHATS & SEARCH" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={[styles.searchContainer, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
                <TouchableOpacity
                    style={[styles.searchInputRow, { backgroundColor: isDark ? '#1A2744' : '#F0F2F5' }]}
                    onPress={() => router.push('/social/search')}
                >
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Search for a user...
                    </Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color="#00AEEF" /></View>
            ) : inbox.length === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="chatbubbles-outline" size={50} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No recent chats found.</Text>
                </View>
            ) : (
                <FlatList
                    data={inbox}
                    renderItem={renderInboxItem}
                    keyExtractor={(item) => item.userId}
                    contentContainerStyle={{ padding: 10 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    inboxItem: { flexDirection: 'row', padding: 15, borderBottomWidth: 1, alignItems: 'center', gap: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00AEEF', justifyContent: 'center', alignItems: 'center' },
    userName: { fontSize: 16, fontWeight: 'bold' },
    time: { fontSize: 12 },
    lastMsg: { fontSize: 14, marginTop: 4 },
    badge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    searchContainer: { padding: 15, borderBottomWidth: 1 },
    searchInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 44, borderRadius: 22 },
    searchInput: { flex: 1, fontSize: 14 }
});
