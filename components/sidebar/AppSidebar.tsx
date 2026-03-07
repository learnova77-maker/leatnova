import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
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

export default function AppSidebar({ role, isSidebarOpen, toggleSidebar }: SidebarProps) {
    const router = useRouter();
    const pathname = usePathname();

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
        { id: 'live', path: '/teacher/live', icon: 'videocam-outline', label: 'Go Live' },
        { id: 'students', path: '/teacher/students', icon: 'people-outline', label: 'Students' },
        { id: 'announcements', path: '/teacher/announcements', icon: 'megaphone-outline', label: 'Announcement' },
        { id: 'lectures', path: '/teacher/lectures', icon: 'play-outline', label: 'Lectures' },
        { id: 'homework', path: '/teacher/homework', icon: 'book-outline', label: 'Homework' },
        { id: 'resources', path: '/teacher/resources', icon: 'language-outline', label: 'IELTS Resources' },
    ];

    const studentMenu = [
        { id: 'index', path: '/student', icon: 'grid-outline', label: 'Dashboard' },
        { id: 'videos', path: '/student/videos', icon: 'play-circle-outline', label: 'Video Library' },
        { id: 'live', path: '/student/live', icon: 'videocam-outline', label: 'Live Classes' },
        { id: 'quizzes', path: '/student/quizzes', icon: 'help-circle-outline', label: 'Quizzes' },
        { id: 'social', path: '/student/social', icon: 'chatbubbles-outline', label: 'Social Feed' },
        { id: 'progress', path: '/student/progress', icon: 'stats-chart-outline', label: 'Progress' },
    ];

    const menu = role === 'teacher' ? teacherMenu : studentMenu;

    const handleNavigate = (path: string) => {
        toggleSidebar();
        router.push(path as any);
    };

    return (
        <>
            {isSidebarOpen && (
                <Pressable style={styles.overlay} onPress={toggleSidebar}>
                    <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]} />
                </Pressable>
            )}

            <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }]}>
                <View style={styles.sidebarHeader}>
                    <View style={styles.logoRow}>
                        <View style={styles.logoBox}>
                            <Ionicons name="school" size={24} color={Colors.secondary} />
                        </View>
                        <View>
                            <Text style={styles.brandTitle}>Learnova</Text>
                            <Text style={styles.brandSub}>{role === 'teacher' ? 'Teacher Panel' : 'Student Panel'}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={toggleSidebar}>
                        <Ionicons name="close-circle" size={32} color={Colors.grey} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.menuScroll}>
                    {menu.map((item) => {
                        const isActive = pathname === item.path || (item.id === 'index' && pathname === (role === 'teacher' ? '/teacher' : '/student'));
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.menuItem, isActive && styles.activeItem]}
                                onPress={() => handleNavigate(item.path)}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={22}
                                    color={isActive ? Colors.secondary : Colors.grey}
                                />
                                <Text style={[styles.menuLabel, isActive && styles.activeLabel]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <View style={styles.sidebarFooter}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/login')}>
                        <Ionicons name="log-out" size={20} color="#FF4444" />
                        <Text style={styles.logoutLabel}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99,
    },
    overlayBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        backgroundColor: Colors.white,
        zIndex: 100,
        paddingTop: 50,
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
        backgroundColor: Colors.primary,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    brandSub: {
        fontSize: 11,
        color: Colors.grey,
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
    activeItem: {
        backgroundColor: Colors.primary,
    },
    menuLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.grey,
    },
    activeLabel: {
        color: Colors.secondary,
    },
    sidebarFooter: {
        padding: 20,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        gap: 15,
        backgroundColor: Colors.white,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 10,
    },
    logoutLabel: {
        color: '#FF4444',
        fontWeight: 'bold',
    },
});
