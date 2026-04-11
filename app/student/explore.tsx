import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ExploreCourses() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchCourses();
        setRefreshing(false);
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await courseApi.getCourses();
            if (res.data.success) {
                // Filter courses to only show "Live" courses (has at least 1 module and 1 lecture)
                const liveCourses = (res.data.courses || []).filter((c: any) => {
                    const hasModules = c.modules && Object.keys(c.modules).length > 0;
                    if (!hasModules) return false;

                    const hasLectures = Object.values(c.modules).some((m: any) => m.lectures && Object.keys(m.lectures).length > 0);
                    return hasLectures;
                });
                setAllCourses(liveCourses);
                setFilteredCourses(liveCourses);
            }
        } catch (err) {
            console.error('Error fetching courses for explore:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        const filtered = allCourses.filter(course =>
            course.title.toLowerCase().includes(text.toLowerCase()) ||
            (course.category && course.category.toLowerCase().includes(text.toLowerCase())) ||
            (course.instructorName && course.instructorName.toLowerCase().includes(text.toLowerCase()))
        );
        setFilteredCourses(filtered);
    };

    const renderCourseCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/student/courses/${item.id}`)}
        >
            <View style={[styles.courseImageWrapper, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} resizeMode="cover" />
                ) : (
                    <Ionicons name="book" size={40} color={Colors.primary} />
                )}
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category || 'General'}</Text>
                </View>
            </View>
            <View style={styles.courseDetails}>
                <Text style={[styles.courseTitleText, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.instructorName, { color: colors.textSecondary }]}>By {item.instructorName || 'Expert Instructor'}</Text>

                {item.description ? (
                    <Text style={[styles.shortDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                <View style={styles.priceRow}>
                    <Text style={[styles.priceText, { color: colors.text }]}>
                        {item.price === '0' || !item.price ? 'Free' : `$${item.price}`}
                    </Text>
                    <View style={[styles.enrollBtn, { backgroundColor: Colors.primary }]}>
                        <Ionicons name="arrow-forward" size={16} color={Colors.secondary} />
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppHeader title="Explore Courses" showBack onBackPress={() => router.back()} role="student" />

            <View style={styles.content}>
                <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={20} color={Colors.grey} />
                    <TextInput
                        placeholder="Search for courses, skills, teachers..."
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Ionicons name="close-circle" size={20} color={Colors.grey} />
                        </TouchableOpacity>
                    )}
                </View>

                {isLoading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={filteredCourses}
                        keyExtractor={(item) => item.id}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
                        }
                        renderItem={renderCourseCard}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 100 }}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="search" size={60} color={colors.border} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    {searchQuery ? "No courses found for this search" : "No courses available right now"}
                                </Text>
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
        padding: 20,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        marginBottom: 20,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseCard: {
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    courseImageWrapper: {
        width: '100%',
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    categoryBadge: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: 'rgba(22, 163, 74, 0.9)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    categoryBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
    },
    courseDetails: {
        padding: 18,
    },
    courseTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
        lineHeight: 26,
    },
    instructorName: {
        fontSize: 14,
        marginBottom: 10,
        fontWeight: '500',
    },
    shortDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 15,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 12,
    },
    priceText: {
        fontSize: 22,
        fontWeight: '900',
    },
    enrollBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    enrollBtnText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.white,
    },
    emptyBox: {
        alignItems: 'center',
        marginTop: 60,
        gap: 15,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    }
});
