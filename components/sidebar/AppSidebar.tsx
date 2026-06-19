import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SidebarProps {
    role: 'teacher' | 'student' | 'school';
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppSidebar({ role, isSidebarOpen, toggleSidebar }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark, toggleTheme } = useTheme();

    const [user, setUser] = React.useState<{ uid?: string; fullName?: string; photoUrl?: string } | null>(null);
    const [shouldRender, setShouldRender] = React.useState(isSidebarOpen);
    const [chatUnreadCount, setChatUnreadCount] = React.useState(0);

    React.useEffect(() => {
        const loadUser = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                if (parsedUser.uid) {
                    try {
                        const { chatApi } = require('@/constants/api');
                        const res = await chatApi.getUnreadCount(parsedUser.uid);
                        if (res.data?.success) {
                            setChatUnreadCount(res.data.totalUnread || 0);
                        }
                    } catch (err) { }
                }
            }
        };
        if (isSidebarOpen) {
            loadUser();
        }
    }, [isSidebarOpen]);

    const getAvatarSource = () => {
        if (user?.photoUrl) return { uri: user.photoUrl };
        const name = user?.fullName || 'User';
        return { uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=100` };
    };

    const handleLogout = async () => {
        try {
            // 1. Close sidebar first
            toggleSidebar();

            // 2. Delay to let animations/modals settle and unmount
            setTimeout(async () => {
                // 3. Clear ALL user-related storage
                await AsyncStorage.multiRemove([
                    'user',
                    'recent_video',
                    'video_progress'
                ]);

                // 4. Force reset to login
                router.replace('/(auth)/login');
            }, 500);
        } catch (error) {
            console.error("Logout Error:", error);
            router.replace('/(auth)/login');
        }
    };

    const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const overlayOpacity = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isSidebarOpen) {
            setShouldRender(true);
            Animated.parallel([
                Animated.timing(sidebarAnim, {
                    toValue: 0,
                    duration: 700, // Even slower for "aram sa" feel
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 1,
                    duration: 700,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(sidebarAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 600,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
                    useNativeDriver: true,
                }),
                Animated.timing(overlayOpacity, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true,
                })
            ]).start(() => setShouldRender(false));
        }
    }, [isSidebarOpen]);

    const teacherMenu = [
        { id: 'index', path: '/teacher', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'courses', path: '/teacher/courses', icon: 'library-outline', label: 'My Courses' },
        { id: 'assignments', path: '/teacher/assignments', icon: 'document-text-outline', label: 'Assignments' },
        { id: 'live', path: '/teacher/live', icon: 'videocam-outline', label: 'Go Live' },
        { id: 'students', path: '/teacher/students', icon: 'people-outline', label: 'Students' },
        { id: 'announcements', path: '/teacher/announcements', icon: 'megaphone-outline', label: 'Announcement' },
        { id: 'notifications', path: '/notifications', icon: 'notifications-outline', label: 'Notifications' },
        { id: 'chat', path: '/chat', icon: 'chatbubbles', label: 'Chat' },
        { id: 'social', path: '/teacher/social', icon: 'earth-outline', label: 'Social Feed' },
        { id: 'finance', path: '/teacher/finance', icon: 'wallet-outline', label: 'Finance & Earnings' },
        { id: 'settings', path: '/settings', icon: 'settings-outline', label: 'Settings' },
        { id: 'support', path: '#support', icon: 'help-circle-outline', label: 'Live Support' },
    ];

    const studentMenu = [
        { id: 'index', path: '/student', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'my-courses', path: '/student/my-courses', icon: 'library-outline', label: 'My Courses' },
        { id: 'homework', path: '/student/homework', icon: 'book-outline', label: 'My Homework' },
        { id: 'downloads', path: '/student/downloads', icon: 'cloud-download-outline', label: 'Offline Videos' },
        { id: 'live', path: '/student/live', icon: 'videocam-outline', label: 'Live Classes' },
        { id: 'notifications', path: '/notifications', icon: 'notifications-outline', label: 'Notifications' },
        { id: 'chat', path: '/chat', icon: 'chatbubbles', label: 'Chat' },
        { id: 'social', path: '/student/social', icon: 'earth-outline', label: 'Social Feed' },
        { id: 'settings', path: '/settings', icon: 'settings-outline', label: 'Settings' },
        { id: 'support', path: '#support', icon: 'help-circle-outline', label: 'Live Support' },
    ];

    const schoolMenu = [
        { id: 'index', path: '/principal', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'teachers', path: '/principal/teachers', icon: 'school-outline', label: 'Faculty & Teachers' },
        { id: 'classes', path: '/principal/classes', icon: 'business-outline', label: 'Classes & Subjects' },
        { id: 'analytics', path: '/principal/analytics', icon: 'bar-chart-outline', label: 'School Analytics' },
        { id: 'settings', path: '/settings', icon: 'settings-outline', label: 'Settings' },
        { id: 'support', path: '/principal/support', icon: 'chatbubbles-outline', label: 'Live Support' },
    ];

    const menu = role === 'school' ? schoolMenu : role === 'teacher' ? teacherMenu : studentMenu;

    const handleNavigate = (path: string) => {
        if (path === '#support') {
            toggleSidebar();
            router.push('/support/chat' as any);
            return;
        }
        toggleSidebar();
        router.push(path as any);
    };

    return (
        <>
            <Modal
                visible={shouldRender}
                transparent={true}
                animationType="none"
                onRequestClose={toggleSidebar}
            >
                <View style={styles.modalContainer}>
                    <Pressable
                        style={styles.overlay}
                        onPress={toggleSidebar}
                    >
                        <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]} />
                    </Pressable>

                    <Animated.View style={[
                        styles.sidebar,
                        { transform: [{ translateX: sidebarAnim }], backgroundColor: colors.sidebarBg }
                    ]}>
                        <View style={styles.sidebarHeader}>
                            <View style={styles.headerTopRow}>
                                <View style={styles.logoRow}>
                                    <Image
                                        source={require('../../assets/images/logo.jpg')}
                                        style={styles.sidebarLogo}
                                    />
                                    <View>
                                        <Text style={[styles.brandTitle, { color: colors.text }]}>
                                            MATLO<Text style={{ color: '#00AEEF', textShadowColor: '#00AEEF', textShadowRadius: isDark ? 10 : 0 }}>VERSE</Text>
                                        </Text>
                                        <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
                                            {role === 'school' ? 'PRINCIPAL TERMINAL' : role === 'teacher' ? 'TEACHER INTERFACE' : 'STUDENT ECOSYSTEM'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={toggleSidebar}>
                                    <Ionicons name="close-outline" size={32} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* User Profile Section */}
                            <TouchableOpacity
                                style={styles.userProfileSection}
                                activeOpacity={0.8}
                                onPress={() => {
                                    toggleSidebar();
                                    if (user?.uid) {
                                        router.push(`/social/profile?userId=${user.uid}` as any);
                                    }
                                }}
                            >
                                <View style={styles.avatarContainer}>
                                    <Image source={getAvatarSource()} style={styles.sidebarAvatar} />
                                </View>
                                <View style={styles.userNameContainer}>
                                    <Text style={[styles.userNameText, { color: colors.text }]}>{user?.fullName || 'Student'}</Text>
                                    <Text style={[styles.userRoleText, { color: colors.textSecondary }]}>Active {role === 'student' ? 'Learner' : role}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                            {menu.map((item) => {
                                const isActive = item.path === '#support' ? false : (pathname === item.path || (item.id === 'index' && pathname === (role === 'teacher' ? '/teacher' : '/student')));
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.menuItem,
                                            isActive && {
                                                backgroundColor: isDark ? 'rgba(0, 174, 239, 0.15)' : 'rgba(0, 174, 239, 0.08)',
                                                borderLeftWidth: 4,
                                                borderLeftColor: '#00AEEF'
                                            }
                                        ]}
                                        onPress={() => handleNavigate(item.path)}
                                    >
                                        <Ionicons
                                            name={item.icon as any}
                                            size={22}
                                            color={isActive ? "#00AEEF" : colors.textSecondary}
                                        />
                                        <Text style={[
                                            styles.menuLabel,
                                            { color: isActive ? '#00AEEF' : colors.textSecondary },
                                            isActive && { fontWeight: '900' }
                                        ]}>
                                            {item.label.toUpperCase()}
                                        </Text>

                                        {item.id === 'chat' && chatUnreadCount > 0 && (
                                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#00AEEF', marginLeft: 'auto' }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <View style={[styles.sidebarFooter, { backgroundColor: colors.sidebarBg, borderTopColor: colors.border }]}>
                            <TouchableOpacity
                                style={[styles.themeToggleRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }]}
                                onPress={toggleTheme}
                            >
                                <View style={styles.themeInfo}>
                                    <Ionicons
                                        name={isDark ? "moon-outline" : "sunny-outline"}
                                        size={20}
                                        color="#00AEEF"
                                    />
                                    <View>
                                        <Text style={[styles.themeLabel, { color: colors.text }]}>
                                            {isDark ? 'DARK MODE' : 'LIGHT MODE'}
                                        </Text>
                                        <Text style={{ fontSize: 9, color: colors.textSecondary, fontWeight: '700', letterSpacing: 1 }}>
                                            {isDark ? 'CURRENT: DEEP VOID' : 'CURRENT: DAYLIGHT'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 174, 239, 0.12)', padding: 2, justifyContent: 'center' }}>
                                    <Animated.View style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: '#00AEEF',
                                        alignSelf: isDark ? 'flex-end' : 'flex-start'
                                    }} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                                <Text style={[styles.logoutLabel, { color: colors.danger, letterSpacing: 1 }]}>LOGOUT SESSION</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

        </>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        paddingTop: 50,
        elevation: 16,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    sidebarHeader: {
        paddingHorizontal: 20,
        marginBottom: 30,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sidebarLogo: {
        width: 60,
        height: 60,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(0, 174, 239, 0.3)',
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    brandSub: {
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    userProfileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 174, 239, 0.2)',
        gap: 15,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#00AEEF',
        padding: 2,
        backgroundColor: '#000',
    },
    sidebarAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    userNameContainer: {
        flex: 1,
    },
    userNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E2E2E2',
    },
    userRoleText: {
        fontSize: 10,
        color: 'rgba(226, 226, 226, 0.4)',
        letterSpacing: 1,
        fontWeight: '700',
    },
    menuScroll: {
        flex: 1,
        paddingHorizontal: 15,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 5,
        gap: 12,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    sidebarFooter: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        gap: 15,
    },
    themeToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 14,
    },
    themeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    themeLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 10,
    },
    logoutLabel: {
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    supportCard: {
        width: '100%',
        borderRadius: 20,
        padding: 25,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
    },
    supportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10
    },
    supportTitle: {
        fontSize: 20,
        fontWeight: 'bold'
    },
    supportSubtitle: {
        fontSize: 13,
        marginBottom: 20,
        lineHeight: 18
    },
    inputField: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 15,
        fontSize: 14,
        marginBottom: 15
    },
    textArea: {
        height: 100
    },
    supportActions: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 10
    },
    supportCancelBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center'
    },
    supportSubmitBtn: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center'
    }
});
