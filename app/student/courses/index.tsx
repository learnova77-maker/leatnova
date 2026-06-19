import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function MyCoursesCatalog() {
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
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="COURSE LOGS" showBack={true} role="student" onBackPress={() => router.back()} />

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#00AEEF" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={[styles.mainTitle, { color: colors.text }]}>ENROLLED <Text style={{ color: '#00AEEF' }}>DATA</Text></Text>
                        <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                            {myCourses.length} ACTIVE STREAMS
                        </Text>
                    </View>

                    {myCourses.length > 0 ? (
                        myCourses.map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                activeOpacity={0.8}
                                onPress={() => router.push(`/student/courses/${course.id}`)}
                            >
                                <View style={[styles.courseImagePlaceholder, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                    {course.thumbnail ? (
                                        <Image source={{ uri: course.thumbnail }} style={styles.thumbnailImg} />
                                    ) : (
                                        <Ionicons name="journal-outline" size={30} color="#00AEEF" />
                                    )}
                                </View>
                                <View style={styles.courseDetails}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View style={[styles.categoryTag, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                            <Text style={[styles.categoryText, { color: colors.text }]}>{course.category || 'Course'}</Text>
                                        </View>
                                        <View style={styles.purchasedTag}>
                                            <Text style={styles.purchasedText}>SYNCED</Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.courseTitleText, { color: colors.text }]}>{course.title}</Text>
                                    <Text style={[styles.instructorName, { color: colors.textSecondary }]}>BY {course.instructorName?.toUpperCase() || 'EXPERT'}</Text>

                                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <View style={styles.progressBarFill} />
                                    </View>
                                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>0% RECEPTION</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="school-outline" size={60} color={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>NO COURSES FOUND IN YOUR LIBRARY.</Text>
                            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/student')}>
                                <Text style={styles.exploreBtnText}>BROWSE COURSES</Text>
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
        paddingHorizontal: 32,
        paddingTop: 40,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 35,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subTitle: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    courseCard: {
        flexDirection: 'row',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
    },
    courseImagePlaceholder: {
        width: 85,
        height: 85,
        borderRadius: 16,
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
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    purchasedTag: {
        backgroundColor: 'rgba(0, 174, 239, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    purchasedText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 0.5,
    },
    courseTitleText: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    instructorName: {
        fontSize: 9,
        marginBottom: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    progressBarBg: {
        height: 4,
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00AEEF',
        width: '0%',
    },
    progressText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
    },
    emptyText: {
        fontSize: 12,
        marginTop: 20,
        marginBottom: 30,
        textAlign: 'center',
        fontWeight: '900',
        letterSpacing: 1,
        lineHeight: 20,
    },
    exploreBtn: {
        backgroundColor: '#00AEEF',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 10,
    },
    exploreBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
});
