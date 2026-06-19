import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MyCoursesPage() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadEnrolledCourses();
    }, []);

    const loadEnrolledCourses = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const res = await courseApi.getEnrolledCourses(user.uid);
                if (res.data.success) {
                    setEnrolledCourses(res.data.courses || []);
                }
            }
        } catch (err) {
            console.error('Error loading enrolled courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const renderCourseItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.8}
            onPress={() => router.push(`/student/courses/${item.id}`)}
        >
            <View style={styles.cardTop}>
                <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)' }]}>
                    {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                    ) : (
                        <Ionicons name="journal-outline" size={30} color="#00AEEF" />
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={[styles.instructor, { color: colors.textSecondary }]}>BY {item.instructorName?.toUpperCase() || 'EXPERT'}</Text>
                </View>
            </View>

            <View style={[styles.cardBottom, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>PROGRESS</Text>
                    <Text style={styles.progressPercent}>{item.progress || 0}%</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${item.progress || 0}%` }
                        ]}
                    />
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={styles.continueBtn}
                        onPress={() => router.push(`/student/courses/${item.id}`)}
                    >
                        <Text style={styles.continueBtnText}>CONTINUE LEARNING</Text>
                        <Ionicons name="arrow-forward" size={14} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar
                role="student"
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <AppHeader
                title="MY COURSES"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="student"
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>MY LEARNING <Text style={{ color: '#00AEEF' }}>PATH</Text></Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {enrolledCourses.length} ENROLLED COURSES
                    </Text>
                </View>

                {isLoading ? (
                    <View style={styles.loadingWrapper}>
                        <ActivityIndicator size="large" color="#00AEEF" />
                    </View>
                ) : (
                    <FlatList
                        data={enrolledCourses}
                        keyExtractor={(item) => item.id}
                        renderItem={renderCourseItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="library-outline" size={60} color={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>NO COURSES YET</Text>
                                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Enroll in a course to start learning.</Text>
                                <TouchableOpacity
                                    style={[styles.browseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    onPress={() => router.push('/student')}
                                >
                                    <Text style={[styles.browseBtnText, { color: colors.text }]}>BROWSE COURSES</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 32,
    },
    header: {
        marginTop: 40,
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: 10,
        marginTop: 8,
        letterSpacing: 1,
        fontWeight: '700',
    },
    listContainer: {
        paddingBottom: 100,
    },
    courseCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    imagePlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        overflow: 'hidden',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    info: {
        flex: 1,
    },
    courseTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 24,
    },
    instructor: {
        fontSize: 10,
        marginTop: 6,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cardBottom: {
        borderTopWidth: 1,
        paddingTop: 24,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressLabel: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '900',
        color: '#00AEEF',
    },
    progressBarBg: {
        height: 3,
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 24,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 2,
        backgroundColor: '#00AEEF',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    continueBtn: {
        backgroundColor: '#00AEEF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    continueBtnText: {
        color: '#000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    loadingWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 100,
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 24,
    },
    emptySub: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 40,
        lineHeight: 18,
        fontWeight: '600',
    },
    browseBtn: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 10,
        marginTop: 35,
        borderWidth: 1,
    },
    browseBtnText: {
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    }
});
