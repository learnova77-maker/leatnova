import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
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
                <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? '#1E293B' : '#F0F9FF' }]}>
                    {item.thumbnail ? (
                        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                    ) : (
                        <Ionicons name="journal" size={30} color={Colors.primary} />
                    )}
                </View>
                <View style={styles.info}>
                    <Text style={[styles.courseTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <Text style={styles.instructor}>By {item.instructorName || 'Expert'}</Text>
                </View>
            </View>

            <View style={styles.cardBottom}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Course Progress</Text>
                    <Text style={[styles.progressPercent, { color: Colors.primary }]}>
                        {item.progress || 0}%
                    </Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                    <View
                        style={[
                            styles.progressBarFill,
                            { width: `${item.progress || 0}%`, backgroundColor: Colors.primary }
                        ]}
                    />
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity
                        style={[styles.continueBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => router.push(`/student/courses/${item.id}`)}
                    >
                        <Text style={styles.continueBtnText}>Continue Learning</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar
                role="student"
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <AppHeader
                title="My Courses"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                role="student"
            />

            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Learning Path</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        You have {enrolledCourses.length} active courses
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={enrolledCourses}
                        keyExtractor={(item) => item.id}
                        renderItem={renderCourseItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name="library-outline" size={80} color={Colors.grey} />
                                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Courses Yet</Text>
                                <Text style={styles.emptySub}>Enroll in a course to start your learning journey.</Text>
                                <TouchableOpacity
                                    style={styles.browseBtn}
                                    onPress={() => router.push('/student')}
                                >
                                    <Text style={styles.browseBtnText}>Browse Catalog</Text>
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
    container: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    header: { marginTop: 20, marginBottom: 25 },
    title: { fontSize: 24, fontWeight: 'bold' },
    subtitle: { fontSize: 14, marginTop: 4 },
    listContainer: { paddingBottom: 100 },
    courseCard: {
        borderRadius: 20,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    imagePlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        overflow: 'hidden'
    },
    thumbnail: { width: '100%', height: '100%' },
    info: { flex: 1 },
    courseTitle: { fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
    instructor: { fontSize: 13, color: '#64748b', marginTop: 4 },
    cardBottom: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
    progressPercent: { fontSize: 13, fontWeight: 'bold' },
    progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 15 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    cardActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    continueBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    continueBtnText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
    browseBtn: {
        backgroundColor: Colors.secondary,
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 15,
        marginTop: 25
    },
    browseBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});
