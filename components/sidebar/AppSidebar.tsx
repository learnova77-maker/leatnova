import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

interface SidebarProps {
    role: 'teacher' | 'student';
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppSidebar({ role, isSidebarOpen, toggleSidebar }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { colors, isDark, toggleTheme } = useTheme();

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
        const toValue = isSidebarOpen ? 0 : -SIDEBAR_WIDTH;
        const opacityValue = isSidebarOpen ? 1 : 0;

        Animated.parallel([
            Animated.timing(sidebarAnim, {
                toValue,
                duration: 350,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: opacityValue,
                duration: 350,
                useNativeDriver: true,
            })
        ]).start();
    }, [isSidebarOpen]);

    const teacherMenu = [
        { id: 'index', path: '/teacher', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'courses', path: '/teacher/courses', icon: 'library-outline', label: 'My Courses' },
        { id: 'assignments', path: '/teacher/assignments', icon: 'document-text-outline', label: 'Assignments' },
        { id: 'live', path: '/teacher/live', icon: 'videocam-outline', label: 'Go Live' },
        { id: 'students', path: '/teacher/students', icon: 'people-outline', label: 'Students' },
        { id: 'announcements', path: '/teacher/announcements', icon: 'megaphone-outline', label: 'Announcement' },
        { id: 'notifications', path: '/notifications', icon: 'notifications-outline', label: 'Notifications' },
        { id: 'social', path: '/teacher/social', icon: 'chatbubbles-outline', label: 'Social Feed' },
        { id: 'finance', path: '/teacher/finance', icon: 'wallet-outline', label: 'Finance & Earnings' },
    ];

    const studentMenu = [
        { id: 'index', path: '/student', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'my-courses', path: '/student/my-courses', icon: 'library-outline', label: 'My Courses' },
        { id: 'homework', path: '/student/homework', icon: 'book-outline', label: 'My Homework' },
        { id: 'live', path: '/student/live', icon: 'videocam-outline', label: 'Live Classes' },
        { id: 'notifications', path: '/notifications', icon: 'notifications-outline', label: 'Notifications' },
        { id: 'social', path: '/student/social', icon: 'chatbubbles-outline', label: 'Social Feed' },
    ];

    const menu = role === 'teacher' ? teacherMenu : studentMenu;

    const handleNavigate = (path: string) => {
        toggleSidebar();
        router.push(path as any);
    };

    return (
        <Modal
            visible={isSidebarOpen}
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
                        <View style={styles.logoRow}>
                            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
                                <Ionicons name="school" size={24} color={isDark ? '#FFF' : '#1A1A1A'} />
                            </View>
                            <View>
                                <Text style={[styles.brandTitle, { color: colors.text }]}>Learnova</Text>
                                <Text style={[styles.brandSub, { color: colors.textSecondary }]}>
                                    {role === 'teacher' ? 'Teacher Panel' : 'Student Panel'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={toggleSidebar}>
                            <Ionicons name="menu-outline" size={32} color={colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
                        {menu.map((item) => {
                            const isActive = pathname === item.path || (item.id === 'index' && pathname === (role === 'teacher' ? '/teacher' : '/student'));
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[
                                        styles.menuItem,
                                        isActive && { backgroundColor: isDark ? colors.primary + '20' : colors.primary }
                                    ]}
                                    onPress={() => handleNavigate(item.path)}
                                >
                                    <Ionicons
                                        name={item.icon as any}
                                        size={22}
                                        color={isActive ? (isDark ? colors.primary : colors.text) : colors.textSecondary}
                                    />
                                    <Text style={[
                                        styles.menuLabel,
                                        { color: isActive ? (isDark ? colors.primary : colors.text) : colors.textSecondary },
                                        isActive && { fontWeight: 'bold' }
                                    ]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    <View style={[styles.sidebarFooter, { backgroundColor: colors.sidebarBg, borderTopColor: colors.border }]}>
                        {/* Dark Mode Toggle */}
                        <View style={[styles.themeToggleRow, { backgroundColor: isDark ? colors.card : '#F5F5F7' }]}>
                            <View style={styles.themeInfo}>
                                <Ionicons
                                    name={isDark ? 'moon' : 'sunny'}
                                    size={20}
                                    color={isDark ? colors.primary : '#F59E0B'}
                                />
                                <Text style={[styles.themeLabel, { color: colors.text }]}>
                                    {isDark ? 'Dark Mode' : 'Light Mode'}
                                </Text>
                            </View>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: '#E2E8F0', true: colors.primary }}
                                thumbColor={isDark ? '#FFFFFF' : '#F59E0B'}
                            />
                        </View>

                        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                            <Ionicons name="log-out" size={20} color={colors.danger} />
                            <Text style={[styles.logoutLabel, { color: colors.danger }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    brandSub: {
        fontSize: 11,
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
});
