import { userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface HeaderProps {
    title: string;
    toggleSidebar?: () => void;
    showLive?: boolean;
    onLivePress?: () => void;
    role?: 'teacher' | 'student';
    showBack?: boolean;
    onBackPress?: () => void;
    showPost?: boolean;
    onPostPress?: () => void;
    onAvatarPress?: () => void;
    notificationCount?: number;
    onNotificationsPress?: () => void;
    showExplore?: boolean;
}

export default function AppHeader({
    title,
    toggleSidebar,
    showLive,
    onLivePress,
    role,
    showBack,
    onBackPress,
    showPost,
    onPostPress,
    onAvatarPress,
    notificationCount,
    onNotificationsPress,
    showExplore
}: HeaderProps) {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [user, setUser] = useState<{ uid: string; fullName?: string; photoUrl?: string } | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const parsedUser = JSON.parse(userData);
                    if (parsedUser && typeof parsedUser === 'object') {
                        setUser(parsedUser);

                        // Fetch unread count
                        const notifRes = await userApi.getNotifications(parsedUser.uid);
                        if (notifRes.data.success) {
                            const unread = notifRes.data.notifications.filter((n: any) => !n.read).length;
                            setUnreadCount(unread);
                        }
                    }
                }
            } catch (err) {
                console.error('Error loading header data:', err);
            }
        };
        loadInitialData();
    }, []);

    const handleProfilePress = () => {
        router.push({
            pathname: '/profile',
            params: { role }
        });
    };

    const getAvatarSource = () => {
        if (user?.photoUrl) {
            return { uri: user.photoUrl };
        }
        const name = user?.fullName || 'User';
        return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=100` };
    };

    const getFirstName = () => {
        if (!user?.fullName) return '';
        return user.fullName.split(' ')[0];
    };

    return (
        <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
            {showBack ? (
                <TouchableOpacity style={styles.menuIcon} onPress={onBackPress}>
                    <Ionicons name="arrow-back" size={26} color={colors.text} />
                </TouchableOpacity>
            ) : (
                <TouchableOpacity style={styles.menuIcon} onPress={toggleSidebar}>
                    <Ionicons name="menu-outline" size={26} color={colors.text} />
                </TouchableOpacity>
            )}

            <View style={styles.headerBrand}>
                <Text style={[styles.brandText, { color: colors.text }]}>{title}</Text>
            </View>

            <View style={styles.headerRight}>
                {showLive && (
                    <TouchableOpacity style={styles.actionIcon} onPress={onLivePress}>
                        <Ionicons name="videocam" size={24} color={colors.text} />
                    </TouchableOpacity>
                )}

                {showExplore && role === 'student' && (
                    <TouchableOpacity style={styles.actionIcon} onPress={() => router.push('/student/explore')}>
                        <Ionicons name="compass-outline" size={26} color={colors.text} />
                    </TouchableOpacity>
                )}

                <View style={styles.userInfo}>
                    <TouchableOpacity style={styles.avatarTrigger} onPress={onAvatarPress || handleProfilePress}>
                        <View style={[styles.avatarBox, { borderColor: colors.border }]}>
                            <Image
                                source={getAvatarSource()}
                                style={styles.avatarImage}
                            />
                        </View>
                    </TouchableOpacity>
                </View>

                {showPost && (
                    <TouchableOpacity style={styles.actionIcon} onPress={onPostPress}>
                        <Ionicons name="add-circle" size={32} color={colors.primary} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={onNotificationsPress || (() => router.push('/notifications'))}
                >
                    <View>
                        <Ionicons name="notifications-outline" size={24} color={colors.text} />
                        {(notificationCount || unreadCount) > 0 ? (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{notificationCount || unreadCount}</Text>
                            </View>
                        ) : null}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 45,
        paddingBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 3,
    },
    menuIcon: {
        padding: 5,
    },
    headerBrand: {
        flex: 1,
        alignItems: 'center',
    },
    brandText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
    },
    actionIcon: {
        padding: 6,
    },
    avatarTrigger: {
        padding: 2,
    },
    avatarBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FF4444',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
