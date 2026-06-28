import NoInternet from '@/components/NoInternet';
import AppHeader from '@/components/sidebar/AppHeader';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
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
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
    const [selectedRating, setSelectedRating] = useState<number | null>(null);
    const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

    const [refreshing, setRefreshing] = useState(false);
    const [isOffline, setIsOffline] = useState(false);

    const uniqueCategories = Array.from(new Set(allCourses.map(c => c.category?.toUpperCase() || 'UNCATEGORIZED'))).filter(c => c !== 'UNCATEGORIZED');

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await fetchCourses();
        setRefreshing(false);
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await courseApi.getCourses();
            if (res.data.success) {
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
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        fetchCourses();
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let result = [...allCourses];

        if (searchQuery) {
            result = result.filter(course =>
                (course.title && course.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (course.category && course.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (course.instructorName && course.instructorName.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (selectedCategory) {
            result = result.filter(course => (course.category?.toUpperCase() || 'UNCATEGORIZED') === selectedCategory);
        }

        if (selectedPrice) {
            result = result.filter(course => {
                const isFree = !course.price || parseFloat(course.price) === 0;
                return selectedPrice === 'FREE' ? isFree : !isFree;
            });
        }

        if (selectedRating !== null) {
            result = result.filter(course => {
                const reviews = course.reviews ? Object.values(course.reviews) : [];
                const totalReviews = reviews.length;
                const avgRating = totalReviews > 0 ? reviews.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / totalReviews : 0;
                return avgRating >= selectedRating;
            });
        }

        setFilteredCourses(result);
    }, [searchQuery, selectedCategory, selectedPrice, selectedRating, allCourses]);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    const renderCourseCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.9}
            onPress={() => router.push(`/student/courses/${item.id}`)}
        >
            <View style={[styles.courseImageWrapper, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)' }]}>
                {item.thumbnail ? (
                    <Image source={{ uri: item.thumbnail }} style={styles.thumbnailImg} resizeMode="cover" />
                ) : (
                    <Ionicons name="planet-outline" size={40} color="#00AEEF" />
                )}
                <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                    <View style={[styles.categoryBadge, { position: 'relative', top: 0, left: 0 }]}>
                        <Text style={styles.categoryBadgeText}>{item.category?.toUpperCase() || 'COURSE'}</Text>
                    </View>
                    <View style={[styles.categoryBadge, { position: 'relative', top: 0, left: 0, backgroundColor: item.type === 'Live' ? '#FBBF24' : 'rgba(0,0,0,0.6)' }]}>
                        <Text style={[styles.categoryBadgeText, { color: item.type === 'Live' ? '#000' : '#FFF' }]}>
                            {item.type === 'Live' ? 'LIVE' : 'RECORDED'}
                        </Text>
                    </View>

                </View>
            </View>
            <View style={styles.courseDetails}>
                <Text style={[styles.courseTitleText, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.instructorName, { color: colors.textSecondary }]}>BY {item.instructorName?.toUpperCase() || 'EXPERT INSTRUCTOR'}</Text>

                {item.description ? (
                    <Text style={[styles.shortDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.description}
                    </Text>
                ) : null}

                {(() => {
                    const reviews = item.reviews ? Object.values(item.reviews) : [];
                    const totalReviews = reviews.length;
                    const avgRating = totalReviews > 0 ? reviews.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / totalReviews : 0;

                    return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                                {[1, 2, 3, 4, 5].map((s) => {
                                    let iconName: any = "star";
                                    if (s > avgRating) {
                                        if (s - avgRating < 1 && s - avgRating > 0) iconName = "star-half";
                                        else iconName = "star-outline";
                                    }
                                    return <Ionicons key={s} name={iconName} size={12} color="#FBBF24" />;
                                })}
                            </View>
                            <Text style={{ fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 1 }}>
                                {avgRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'REVIEW' : 'REVIEWS'})
                            </Text>
                        </View>
                    );
                })()}

                <View style={[styles.priceRow, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                    <View>
                        <Text style={styles.priceLabel}>PRICE / TYPE</Text>
                        <Text style={styles.priceText}>
                            {!item.price || parseFloat(item.price) === 0 ? 'FREE' : `${item.price} COINS`}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.enrollBtn}>
                        <Ionicons name="arrow-forward" size={16} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity >
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="EXPLORE" showBack onBackPress={() => router.back()} role="student" />

            <View style={styles.content}>
                {isOffline ? (
                    <NoInternet />
                ) : (
                    <>
                        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="search-outline" size={20} color="#00AEEF" />
                            <TextInput
                                placeholder="Search courses, skills, teachers..."
                                style={[styles.searchInput, { color: colors.text }]}
                                placeholderTextColor={colors.textSecondary}
                                value={searchQuery}
                                onChangeText={handleSearch}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => handleSearch('')} style={{ marginRight: 10 }}>
                                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(true)}>
                                <Ionicons name="options-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {isLoading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color="#00AEEF" />
                            </View>
                        ) : (
                            <FlatList
                                data={filteredCourses}
                                keyExtractor={(item) => item.id}
                                refreshControl={
                                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00AEEF']} tintColor="#00AEEF" />
                                }
                                renderItem={renderCourseCard}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 100 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyBox}>
                                        <Ionicons name="search-outline" size={60} color={isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)"} />
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                            {searchQuery ? "NO RESULTS FOUND" : "NO COURSES AVAILABLE"}
                                        </Text>
                                    </View>
                                }
                            />
                        )}
                    </>
                )}
            </View>

            {/* Filter Modal */}
            <Modal visible={isFilterModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setIsFilterModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>FILTERS</Text>
                            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                                <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Categories */}
                            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>CATEGORIES</Text>
                            <View style={styles.filterOptionsGrid}>
                                <TouchableOpacity
                                    style={[styles.filterChip, !selectedCategory ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}
                                    onPress={() => setSelectedCategory(null)}
                                >
                                    <Text style={[styles.filterChipText, { color: !selectedCategory ? '#000' : colors.text }]}>ALL CATEGORIES</Text>
                                </TouchableOpacity>
                                {uniqueCategories.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[styles.filterChip, selectedCategory === cat ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]}
                                        onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                    >
                                        <Text style={[styles.filterChipText, { color: selectedCategory === cat ? '#000' : colors.text }]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[styles.dividerFull, { backgroundColor: colors.border }]} />

                            {/* Price */}
                            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>PRICE</Text>
                            <View style={styles.filterOptionsGrid}>
                                <TouchableOpacity style={[styles.filterChip, selectedPrice === null ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedPrice(null)}>
                                    <Text style={[styles.filterChipText, { color: selectedPrice === null ? '#000' : colors.text }]}>ANY PRICE</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, selectedPrice === 'FREE' ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedPrice(selectedPrice === 'FREE' ? null : 'FREE')}>
                                    <Text style={[styles.filterChipText, { color: selectedPrice === 'FREE' ? '#000' : colors.text }]}>FREE ONLY</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, selectedPrice === 'PAID' ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedPrice(selectedPrice === 'PAID' ? null : 'PAID')}>
                                    <Text style={[styles.filterChipText, { color: selectedPrice === 'PAID' ? '#000' : colors.text }]}>PAID ACCESS</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.dividerFull, { backgroundColor: colors.border }]} />

                            {/* Ratings */}
                            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>RATING</Text>
                            <View style={styles.filterOptionsGrid}>
                                <TouchableOpacity style={[styles.filterChip, selectedRating === null ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedRating(null)}>
                                    <Text style={[styles.filterChipText, { color: selectedRating === null ? '#000' : colors.text }]}>ANY RATING</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, selectedRating === 4 ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedRating(selectedRating === 4 ? null : 4)}>
                                    <Ionicons name="star" size={12} color={selectedRating === 4 ? '#000' : '#FBBF24'} style={{ marginRight: 4 }} />
                                    <Text style={[styles.filterChipText, { color: selectedRating === 4 ? '#000' : colors.text }]}>4.0+ STARS</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterChip, selectedRating === 3 ? styles.activeFilterChip : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]} onPress={() => setSelectedRating(selectedRating === 3 ? null : 3)}>
                                    <Ionicons name="star" size={12} color={selectedRating === 3 ? '#000' : '#FBBF24'} style={{ marginRight: 4 }} />
                                    <Text style={[styles.filterChipText, { color: selectedRating === 3 ? '#000' : colors.text }]}>3.0+ STARS</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>

                        {/* Actions */}
                        <TouchableOpacity
                            style={styles.applyFilterBtn}
                            onPress={() => setIsFilterModalVisible(false)}
                        >
                            <Text style={styles.applyFilterBtnText}>VIEW {filteredCourses.length} RESULTS</Text>
                        </TouchableOpacity>

                        {(selectedCategory || selectedPrice || selectedRating) && (
                            <TouchableOpacity
                                style={{ marginTop: 15, alignItems: 'center' }}
                                onPress={() => { setSelectedCategory(null); setSelectedPrice(null); setSelectedRating(null); }}
                            >
                                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 }}>CLEAR ALL FILTERS</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Modal>
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 56,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 25,
        marginTop: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 13,
        fontWeight: '600',
    },
    loadingBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    courseCard: {
        borderRadius: 24,
        marginBottom: 25,
        borderWidth: 1,
        overflow: 'hidden',
    },
    courseImageWrapper: {
        width: '100%',
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    categoryBadge: {
        position: 'absolute',
        top: 15,
        left: 15,
        backgroundColor: '#00AEEF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    categoryBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
    },
    courseDetails: {
        padding: 24,
    },
    courseTitleText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        lineHeight: 28,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    instructorName: {
        fontSize: 10,
        marginBottom: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    shortDesc: {
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 24,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        paddingTop: 20,
    },
    priceLabel: {
        fontSize: 8,
        color: 'rgba(128, 128, 128, 0.6)',
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    priceText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
    enrollBtn: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#00AEEF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyBox: {
        alignItems: 'center',
        marginTop: 80,
        gap: 20,
    },
    emptyText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    activeFilterChip: {
        backgroundColor: '#00AEEF',
    },
    filterChipText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    chipDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(128,128,128,0.3)',
        alignSelf: 'center',
        marginHorizontal: 5
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalDismiss: {
        flex: 1,
    },
    modalContent: {
        height: '75%',
        borderTopWidth: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 45 : 30,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
    },
    filterSectionTitle: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    filterOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    dividerFull: {
        height: 1,
        width: '100%',
        marginVertical: 20,
    },
    applyFilterBtn: {
        backgroundColor: '#00AEEF',
        borderRadius: 15,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 15,
    },
    applyFilterBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
    }
});
