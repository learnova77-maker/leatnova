import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface AnalyticsData {
    totalStudents: number;
    totalHours: number | string;
    thumbnail?: string | null;
    coursePrice?: number;
    totalEarnings?: number;
    commissionPercent?: number;
    commissionAmount?: number;
    netEarnings?: number;
}

export default function CourseAnalytics() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [courseTitle, setCourseTitle] = useState('Course Stats');
    const [courseDetails, setCourseDetails] = useState<any>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        totalStudents: 0,
        totalHours: "0s",
    });

    useEffect(() => {
        if (!id) return;

        const loadData = async () => {
            try {
                // Fetch basic course info
                const cResponse = await courseApi.getCourseDetails(id as string);
                if (cResponse.data.success) {
                    setCourseDetails(cResponse.data.course);
                    setCourseTitle(cResponse.data.course.title || 'Analytics');
                }

                // Fetch analytics
                const aResponse = await courseApi.getCourseAnalytics(id as string);
                if (aResponse.data.success) {
                    setAnalytics(aResponse.data.analytics);
                }
            } catch (err: any) {
                console.error(err);
                Alert.alert('Error', 'Could not load analytics. Refresh again later.');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [id]);

    const basePrice = analytics.coursePrice ?? courseDetails?.price ?? 0;
    const totalEarnings = analytics.totalEarnings ?? 0;
    const commissionPercent = analytics.commissionPercent ?? 45;
    const commissionAmount = analytics.commissionAmount ?? 0;
    const netEarnings = analytics.netEarnings ?? 0;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                        {courseTitle}
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.textSecondary }]}>Live Stats & My Earnings</Text>
                </View>
                <View style={styles.backBtn} />
            </View>

            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Course Thumbnail */}
                    <View style={[styles.thumbnailContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Image
                            source={{ uri: analytics.thumbnail || courseDetails?.thumbnail || 'https://via.placeholder.com/400x200.png?text=Course+Thumbnail' }}
                            style={styles.thumbnailImg}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Key Metrics */}
                    <View style={styles.metricsRow}>
                        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#3B82F620' }]}>
                                <Ionicons name="people" size={24} color="#3B82F6" />
                            </View>
                            <Text style={[styles.metricValue, { color: colors.text }]}>{analytics.totalStudents}</Text>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Students</Text>
                        </View>
                        <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#10B98120' }]}>
                                <Ionicons name="cash" size={24} color="#10B981" />
                            </View>
                            <Text style={[styles.metricValue, { color: colors.text }]}>Rs {totalEarnings}</Text>
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Earning</Text>
                        </View>
                    </View>

                    {/* Financial Summary Area */}
                    <View style={[styles.chartContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.chartHeader}>
                            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Earning Details</Text>
                        </View>

                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Course Base Price</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]}>Rs {basePrice}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Sales</Text>
                            <Text style={[styles.summaryValue, { color: colors.text }]}>Rs {totalEarnings}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { color: colors.danger || '#EF4444' }]}>Learnova Commission ({commissionPercent}%)</Text>
                            <Text style={[styles.summaryValue, { color: colors.danger || '#EF4444' }]}>- Rs {commissionAmount}</Text>
                        </View>

                        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.summaryRow}>
                            <Text style={[styles.netLabel, { color: colors.text }]}>Your Earning</Text>
                            <Text style={[styles.netValue, { color: '#10B981' }]}>Rs {netEarnings}</Text>
                        </View>
                    </View>

                    {/* Reviews Section */}
                    {courseDetails?.reviews && Object.keys(courseDetails.reviews).length > 0 && (
                        <View style={styles.reviewsContainer}>
                            <Text style={[styles.reviewsHeader, { color: colors.text }]}>Student Reviews</Text>
                            {Object.keys(courseDetails.reviews).map(key => {
                                const review = courseDetails.reviews[key];
                                return (
                                    <View key={key} style={[styles.reviewItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <View style={styles.reviewItemHeader}>
                                            <Text style={[styles.reviewAuthor, { color: colors.text }]}>{review.studentName || 'Student'}</Text>
                                            <View style={{ flexDirection: 'row' }}>
                                                {[...Array(5)].map((_, i) => (
                                                    <Ionicons key={i} name={i < review.rating ? "star" : "star-outline"} size={14} color="#FBBF24" />
                                                ))}
                                            </View>
                                        </View>
                                        <Text style={[styles.reviewBody, { color: colors.textSecondary }]}>{review.text}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle" size={20} color={Colors.grey} />
                        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                            Stats are updated based on student enrollment and platform fee.
                        </Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 15 : 45,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerSub: {
        fontSize: 12,
        marginTop: 2,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricCard: {
        width: '48%',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    metricIconWrap: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 13,
    },
    chartContainer: {
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        gap: 10,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    thumbnailContainer: {
        width: '100%',
        height: 180,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
        overflow: 'hidden',
    },
    thumbnailImg: {
        width: '100%',
        height: '100%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    summaryDivider: {
        height: 1,
        width: '100%',
        marginVertical: 10,
    },
    netLabel: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    netValue: {
        fontSize: 18,
        fontWeight: '900',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
    },
    reviewsContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    reviewsHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        marginLeft: 5,
    },
    reviewItem: {
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 10,
    },
    reviewItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewAuthor: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    reviewBody: {
        fontSize: 13,
        lineHeight: 20,
    }
});
