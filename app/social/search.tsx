import { userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SocialSearchScreen() {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (query.trim().length > 0) {
                performSearch(query.trim());
            } else {
                setResults([]);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    const performSearch = async (searchQuery: string) => {
        setIsSearching(true);
        try {
            const resp = await userApi.searchRealtime(searchQuery);
            if (resp.data.success) {
                setResults(resp.data.users || []);
            }
        } catch (err) {
            console.error('Realtime search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    const renderUser = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.userRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/social/profile?userId=${item.uid}`)}
        >
            <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                {item.photoUrl ? (
                    <Image source={{ uri: item.photoUrl }} style={styles.avatarImg} />
                ) : (
                    <Text style={styles.avatarText}>{item.fullName?.charAt(0)}</Text>
                )}
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={[styles.fullName, { color: colors.text }]} numberOfLines={1}>
                    {item.fullName}
                </Text>
                <Text style={[styles.userName, { color: colors.textSecondary }]} numberOfLines={1}>
                    @{item.username || 'user'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.searchContainer, { backgroundColor: isDark ? '#1A2744' : '#F0F2F5' }]}>
                    <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search users..."
                        placeholderTextColor={colors.textSecondary}
                        autoFocus
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Results */}
            {isSearching ? (
                <View style={styles.centerParams}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : query.trim().length > 0 && results.length === 0 ? (
                <View style={styles.centerParams}>
                    <Ionicons name="search-outline" size={50} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No users found.</Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderUser}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={{ padding: 10 }}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 40 : 50,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    backBtn: { marginRight: 15 },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 15,
    },
    searchInput: { flex: 1, fontSize: 16 },
    centerParams: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    fullName: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    userName: { fontSize: 14 },
});
