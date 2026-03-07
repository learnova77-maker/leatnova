import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function StudentIndex() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userName, setUserName] = useState('Student');
    const [isLoading, setIsLoading] = useState(true);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load User Name
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    setUserName(user.fullName.split(' ')[0]);
                }

                // Load Courses
                const response = await courseApi.getCourses();
                if (response.data.success) {
                    setAllCourses(response.data.courses);
                    setFilteredCourses(response.data.courses);
                }
            } catch (err) {
                console.error('Error loading student dashboard:', err);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (!text.trim()) {
            setFilteredCourses(allCourses);
        } else {
            const filtered = allCourses.filter(course =>
                course.title.toLowerCase().includes(text.toLowerCase()) ||
                (course.category && course.category.toLowerCase().includes(text.toLowerCase())) ||
                (course.instructorName && course.instructorName.toLowerCase().includes(text.toLowerCase()))
            );
            setFilteredCourses(filtered);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Learnova" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            {isLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color={Colors.grey} />
                        <TextInput
                            placeholder="Search courses, teachers, categories..."
                            style={styles.searchInput}
                            placeholderTextColor={Colors.grey}
                            value={searchQuery}
                            onChangeText={handleSearch}
                        />
                    </View>

                    <View style={styles.welcomeBox}>
                        <Text style={styles.welcomeTitle}>Hello, {userName}!</Text>
                        <View style={styles.subBadge}>
                            <Ionicons name="star" size={12} color={Colors.secondary} />
                            <Text style={styles.subText}>Premium Member</Text>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        {[
                            { id: '1', title: 'Videos', icon: 'videocam', color: '#4A90E2' },
                            { id: '2', title: 'Quizzes', icon: 'checkbox', color: '#9B51E0' },
                            { id: '3', title: 'Social', icon: 'people', color: '#F2994A' },
                        ].map((item) => (
                            <View key={item.id} style={styles.statCard}>
                                <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                                </View>
                                <Text style={styles.statVal}>{item.title}</Text>
                            </View>
                        ))}
                    </View>

                    {searchQuery.trim() !== '' && (
                        <View style={{ marginBottom: 20 }}>
                            <Text style={styles.sectionTitle}>Search Results ({filteredCourses.length})</Text>
                        </View>
                    )}

                    <Text style={styles.sectionTitle}>{searchQuery.trim() === '' ? 'Available Courses' : ''}</Text>

                    {filteredCourses.length > 0 ? (
                        filteredCourses.map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={styles.courseCard}
                                onPress={() => router.push(`/student/courses/${course.id}`)}
                            >
                                <View style={styles.courseImagePlaceholder}>
                                    <Ionicons name="book" size={30} color={Colors.primary} />
                                </View>
                                <View style={styles.courseDetails}>
                                    <View style={styles.categoryTag}>
                                        <Text style={styles.categoryText}>{course.category || 'General'}</Text>
                                    </View>
                                    <Text style={styles.courseTitleText}>{course.title}</Text>
                                    <Text style={styles.instructorName}>By {course.instructorName || 'Expert Instructor'}</Text>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.priceText}>{course.price === '0' || !course.price ? 'Free' : `$${course.price}`}</Text>
                                        <TouchableOpacity style={styles.enrollBtnSmall}>
                                            <Text style={styles.enrollBtnText}>Enroll</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptySearch}>
                            <Ionicons name="search" size={50} color={Colors.lightGrey} />
                            <Text style={styles.emptySearchText}>No courses found matching your search.</Text>
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
        backgroundColor: '#F9FAFB',
    },
    scrollContent: {
        padding: 15,
        paddingBottom: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 48,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
    },
    welcomeBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    subBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#FFF9E5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    subText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statVal: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    featuredCard: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    featuredText: {
        flex: 1,
        gap: 10,
    },
    tag: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    tagText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    featuredTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    joinBtn: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    joinBtnText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    dateBadge: {
        width: 60,
        height: 70,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateNum: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    dateMon: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.grey,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
        marginBottom: 15,
    },
    hScroll: {
        overflow: 'visible',
    },
    vCard: {
        width: 180,
        marginRight: 15,
    },
    vThumb: {
        width: '100%',
        height: 100,
        backgroundColor: '#E5E7EB',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        overflow: 'hidden',
    },
    pLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        backgroundColor: Colors.primary,
    },
    vTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    vInfo: {
        fontSize: 11,
        color: Colors.grey,
    },
    courseCard: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    courseImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: '#F0F9FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    courseDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    categoryTag: {
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#16A34A',
    },
    courseTitleText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
        marginBottom: 2,
    },
    instructorName: {
        fontSize: 12,
        color: Colors.grey,
        marginBottom: 8,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    enrollBtnSmall: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 8,
    },
    enrollBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    emptySearch: {
        alignItems: 'center',
        marginTop: 50,
        gap: 10,
    },
    emptySearchText: {
        fontSize: 14,
        color: Colors.grey,
        textAlign: 'center',
    }
});
