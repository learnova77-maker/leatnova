import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { paymentApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface Payout {
    id: string;
    courseTitle: string;
    studentName: string;
    totalAmount: number;
    teacherAmount: number;
    platformAmount: number;
    status: 'available' | 'processing' | 'paid' | 'failed';
    createdAt: number;
    paidAt: number | null;
}

export default function TeacherFinance() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isConnecting, setIsConnecting] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [onboardStatus, setOnboardStatus] = useState({
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
    });

    const [earnings, setEarnings] = useState({
        totalEarned: 0,
        pendingAmount: 0,
        paidAmount: 0,
        payouts: [] as Payout[],
    });

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);

                // Load onboard status
                const statusRes = await paymentApi.getOnboardStatus(parsed.uid);
                if (statusRes.data.success) {
                    setOnboardStatus(statusRes.data);
                }

                // Load earnings
                const earningsRes = await paymentApi.getTeacherEarnings(parsed.uid);
                if (earningsRes.data.success) {
                    setEarnings(earningsRes.data.earnings);
                }
            }
        } catch (e) {
            console.error('Finance load error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnectBank = async () => {
        if (!user) return;
        setIsConnecting(true);
        try {
            const res = await paymentApi.onboardTeacher({
                teacherId: user.uid,
                email: user.email,
                teacherName: user.fullName,
            });
            if (res.data.success && res.data.url) {
                // Open Stripe onboarding in browser
                await Linking.openURL(res.data.url);
            } else {
                Alert.alert('Error', 'Could not generate onboarding link.');
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to connect bank account.');
        } finally {
            setIsConnecting(false);
        }
    };

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '--';
        const d = new Date(timestamp);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const daysUntilPayout = (scheduledDate: number) => {
        const diff = scheduledDate - Date.now();
        if (diff <= 0) return 'Processing...';
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return `${days} day${days > 1 ? 's' : ''} left`;
    };

    const getStatusColor = (status: string) => {
        if (status === 'paid') return '#27AE60';
        if (status === 'failed') return '#EB5757';
        if (status === 'available') return Colors.primary;
        return '#F2994A'; // processing
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Learnova" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="teacher" />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.pageTitle, { color: colors.text }]}>Finance & Earnings</Text>
                <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Track your revenue and payouts</Text>

                {/* Wallet Balance Card */}
                <View style={[styles.bankCard, { backgroundColor: isDark ? '#1F2937' : '#F0F9FF', borderColor: Colors.primary }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.bankIconBg, { backgroundColor: Colors.primary }]}>
                            <Ionicons name="wallet-outline" size={24} color="#FFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.bankTitle, { color: colors.text }]}>Learnova Wallet</Text>
                            <Text style={[styles.bankDesc, { color: colors.textSecondary }]}>
                                Your share (55%) is automatically added here after each sale.
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.connectBtn, { backgroundColor: Colors.primary, marginTop: 15 }]}
                        onPress={() => {
                            Alert.alert(
                                "Request Payout",
                                `You have $${earnings.pendingAmount.toFixed(2)} available. Send request to Admin?`,
                                [
                                    { text: "Cancel" },
                                    { text: "Send Request", onPress: () => Alert.alert("Success", "Payout request sent to Admin! They will contact you for bank/Payoneer details.") }
                                ]
                            );
                        }}
                        disabled={earnings.pendingAmount <= 0}
                    >
                        <Text style={styles.connectBtnText}>Request Payout</Text>
                    </TouchableOpacity>
                </View>

                {/* Earnings Overview */}
                <View style={styles.earningsRow}>
                    <View style={[styles.earningCard, { backgroundColor: isDark ? '#0D2847' : '#EBF4FF', borderColor: Colors.primary + '30' }]}>
                        <Ionicons name="wallet-outline" size={28} color={Colors.primary} />
                        <Text style={[styles.earningAmount, { color: Colors.primary }]}>${earnings.totalEarned.toFixed(2)}</Text>
                        <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Total Earned</Text>
                    </View>
                    <View style={[styles.earningCard, { backgroundColor: isDark ? '#1A2E1A' : '#ECFDF5', borderColor: '#27AE6030' }]}>
                        <Ionicons name="checkmark-done-outline" size={28} color="#27AE60" />
                        <Text style={[styles.earningAmount, { color: '#27AE60' }]}>${earnings.paidAmount.toFixed(2)}</Text>
                        <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Paid Out</Text>
                    </View>
                    <View style={[styles.earningCard, { backgroundColor: isDark ? '#2E2A1A' : '#FFFBEB', borderColor: '#F2994A30' }]}>
                        <Ionicons name="time-outline" size={28} color="#F2994A" />
                        <Text style={[styles.earningAmount, { color: '#F2994A' }]}>${earnings.pendingAmount.toFixed(2)}</Text>
                        <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>Pending</Text>
                    </View>
                </View>

                {/* Payout History */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Payout History</Text>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{earnings.payouts.length} transactions</Text>
                </View>

                {earnings.payouts.length > 0 ? earnings.payouts.map((payout) => (
                    <View key={payout.id} style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.payoutIcon, { backgroundColor: getStatusColor(payout.status) + '20' }]}>
                                <Ionicons
                                    name={payout.status === 'paid' ? "checkmark-circle" : payout.status === 'failed' ? "close-circle" : "time"}
                                    size={22}
                                    color={getStatusColor(payout.status)}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.payoutCourse, { color: colors.text }]} numberOfLines={1}>{payout.courseTitle}</Text>
                                <Text style={[styles.payoutStudent, { color: colors.textSecondary }]}>by {payout.studentName || 'Student'}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={[styles.payoutAmount, { color: getStatusColor(payout.status) }]}>+${payout.teacherAmount.toFixed(2)}</Text>
                                <Text style={[styles.payoutDate, { color: colors.textSecondary }]}>
                                    {formatDate(payout.paidAt || payout.createdAt)}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.payoutStatusBadge, { backgroundColor: getStatusColor(payout.status) + '15' }]}>
                            <Text style={[styles.payoutStatusText, { color: getStatusColor(payout.status) }]}>
                                {payout.status === 'available' ? 'In Wallet (Ready)' : payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                            </Text>
                        </View>
                    </View>
                )) : (
                    <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="receipt-outline" size={60} color={colors.border} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Transactions Yet</Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            When students purchase your courses, earnings will appear here.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    pageTitle: { fontSize: 26, fontWeight: 'bold' },
    pageSubtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },

    // Bank card
    bankCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
    bankIconBg: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    bankTitle: { fontSize: 15, fontWeight: 'bold' },
    bankDesc: { fontSize: 12, marginTop: 2 },
    connectBtn: { marginTop: 15, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    connectBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

    // Earnings cards
    earningsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    earningCard: { flex: 1, borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, gap: 6 },
    earningAmount: { fontSize: 18, fontWeight: 'bold' },
    earningLabel: { fontSize: 11 },

    // Info card
    infoCard: { borderRadius: 16, padding: 18, borderWidth: 1, marginBottom: 20 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    infoLabel: { fontSize: 14 },
    infoValue: { fontSize: 14, fontWeight: 'bold' },
    infoDivider: { height: 1 },

    // Payout section
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold' },
    sectionCount: { fontSize: 12 },

    // Payout card
    payoutCard: { borderRadius: 16, padding: 15, borderWidth: 1, marginBottom: 10 },
    payoutIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    payoutCourse: { fontSize: 14, fontWeight: '600' },
    payoutStudent: { fontSize: 11, marginTop: 2 },
    payoutAmount: { fontSize: 16, fontWeight: 'bold' },
    payoutDate: { fontSize: 10, marginTop: 2 },
    payoutStatusBadge: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, alignSelf: 'flex-start' },
    payoutStatusText: { fontSize: 11, fontWeight: '600' },

    // Empty state
    emptyState: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
    emptyDesc: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
