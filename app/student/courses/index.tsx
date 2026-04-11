import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MyCoursesPage() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [myCourses, setMyCourses] = useState<any[]>([]);

    useEffect(() => {
        loadMyCourses();
    }, []);

    const loadMyCourses = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);

            const response = await courseApi.getEnrolledCourses(user.uid);
            if (response.data.success) {
                setMyCourses(response.data.courses);
            }
        } catch (err) {
            console.error('Error fetching my courses:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppHeader title="My Courses" showBack={true} />

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={[styles.mainTitle, { color: colors.text }]}>My Courses</Text>
                        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                            {myCourses.length} Enrolled
                        </Text>
                    </View>

                    {myCourses.length > 0 ? (
                        myCourses.map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => router.push(`/student/courses/${course.id}`)}
                            >
                                <View style={[styles.courseImagePlaceholder, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                                    {course.thumbnail ? (
                                        <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                                    ) : (
                                        <Ionicons name="book" size={30} color={Colors.primary} />
                                    )}
                                </View>
                                <View style={styles.courseDetails}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={styles.categoryTag}>
                                            <Text style={styles.categoryText}>{course.category || 'General'}</Text>
                                        </View>
                                        <View style={[styles.categoryTag, { backgroundColor: '#E8F5E9' }]}>
                                            <Text style={[styles.categoryText, { color: '#2E7D32' }]}>Purchased</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.courseTitleText, { color: colors.text }]}>{course.title}</Text>
                                    <Text style={[styles.instructorName, { color: colors.textSecondary }]}>By {course.instructorName || 'Expert Instructor'}</Text>

                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: '0%' }]} />
                                    </View>
                                    <Text style={styles.progressText}>0% Complete</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="school" size={60} color={Colors.lightGrey} />
                            <Text style={styles.emptyText}>You haven't enrolled in any courses yet.</Text>
                            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/student')}>
                                <Text style={styles.exploreBtnText}>Explore Courses</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subTitle: {
        fontSize: 14,
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 12,
        marginBottom: 15,
        borderWidth: 1,
    },
    courseImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    courseDetails: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center',
    },
    categoryTag: {
        backgroundColor: Colors.lightGrey,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.grey,
        textTransform: 'uppercase',
    },
    courseTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    instructorName: {
        fontSize: 12,
        marginBottom: 10,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        marginBottom: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 3,
    },
    progressText: {
        fontSize: 11,
        color: '#6B7280',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.grey,
        marginTop: 15,
        marginBottom: 25,
        textAlign: 'center',
    },
    exploreBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 12,
    },
    exploreBtnText: {
        color: Colors.secondary,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
