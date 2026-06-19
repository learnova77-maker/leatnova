import NoInternet from '@/components/NoInternet';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { paymentApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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
    const [isOffline, setIsOffline] = useState(false);

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

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        loadData();
        return () => unsubscribe();
    }, []);

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

    const formatDate = (timestamp: number) => {
        if (!timestamp) return '--';
        const d = new Date(timestamp);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        if (status === 'paid') return '#10B981';
        if (status === 'failed') return '#EB5757';
        if (status === 'available') return '#00AEEF';
        return '#F59E0B'; // processing
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#00AEEF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Learnova" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="teacher" />

            {isOffline ? (
                <NoInternet />
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={[styles.pageTitle, { color: colors.text }]}>Finance & <Text style={{ color: '#00AEEF' }}>Earnings</Text></Text>
                    <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>Track your revenue and payouts</Text>

                    {/* Wallet Balance Card */}
                    <View style={[styles.bankCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={[styles.bankIconBg, { backgroundColor: 'rgba(0, 174, 239, 0.1)' }]}>
                                <Ionicons name="wallet-outline" size={24} color="#00AEEF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.bankTitle, { color: colors.text }]}>LEARNOVA WALLET</Text>
                                <Text style={[styles.bankDesc, { color: colors.textSecondary }]}>
                                    Your share (55%) is automatically added here after each sale.
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.connectBtn, { backgroundColor: '#00AEEF', marginTop: 15 }]}
                            onPress={() => {
                                Alert.alert(
                                    "Request Payout",
                                    `You have $${earnings.pendingAmount.toFixed(2)} available. Send request to Admin?`,
                                    [
                                        { text: "Cancel" },
                                        { text: "Send Request", onPress: () => Alert.alert("Success", "Payout request sent to Admin! They will contact you for details.") }
                                    ]
                                );
                            }}
                            disabled={earnings.pendingAmount <= 0}
                        >
                            <Text style={styles.connectBtnText}>REQUEST PAYOUT</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Earnings Overview */}
                    <View style={styles.earningsRow}>
                        <View style={[styles.earningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="wallet-outline" size={24} color="#00AEEF" />
                            <Text style={[styles.earningAmount, { color: colors.text }]}>${earnings.totalEarned.toFixed(2)}</Text>
                            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>TOTAL EARNED</Text>
                        </View>
                        <View style={[styles.earningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="checkmark-done-outline" size={24} color="#10B981" />
                            <Text style={[styles.earningAmount, { color: colors.text }]}>${earnings.paidAmount.toFixed(2)}</Text>
                            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>PAID OUT</Text>
                        </View>
                        <View style={[styles.earningCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="time-outline" size={24} color="#F59E0B" />
                            <Text style={[styles.earningAmount, { color: colors.text }]}>${earnings.pendingAmount.toFixed(2)}</Text>
                            <Text style={[styles.earningLabel, { color: colors.textSecondary }]}>PENDING</Text>
                        </View>
                    </View>

                    {/* Payout History */}
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>PAYOUT <Text style={{ color: '#00AEEF' }}>HISTORY</Text></Text>
                    </View>

                    {earnings.payouts.length > 0 ? (
                        earnings.payouts.map((payout) => (
                            <View key={payout.id} style={[styles.payoutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[styles.payoutIcon, { backgroundColor: 'rgba(0, 174, 239, 0.05)' }]}>
                                        <Ionicons
                                            name={payout.status === 'paid' ? "checkmark-circle" : "time"}
                                            size={20}
                                            color="#00AEEF"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.payoutCourse, { color: colors.text }]} numberOfLines={1}>{payout.courseTitle.toUpperCase()}</Text>
                                        <Text style={[styles.payoutStudent, { color: colors.textSecondary }]}>BY {payout.studentName ? payout.studentName.toUpperCase() : 'STUDENT'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.payoutAmount, { color: '#00AEEF' }]}>+${payout.teacherAmount.toFixed(2)}</Text>
                                        <Text style={[styles.payoutDate, { color: getStatusColor(payout.status), fontSize: 8, fontWeight: '900' }]}>
                                            {payout.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Ionicons name="receipt-outline" size={50} color={colors.textSecondary} />
                            <Text style={[styles.emptyTitle, { color: colors.text }]}>NO TRANSACTIONS YET</Text>
                            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                                When students purchase your courses, earnings will appear here.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 25, paddingBottom: 40 },
    pageTitle: { fontSize: 24, fontWeight: '900', letterSpacing: 1 },
    pageSubtitle: { fontSize: 10, marginTop: 4, marginBottom: 25, fontWeight: '700', letterSpacing: 0.5 },

    // Bank card
    bankCard: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 20 },
    bankIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    bankTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    bankDesc: { fontSize: 9, marginTop: 2, fontWeight: '700' },
    connectBtn: { marginTop: 15, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    connectBtnText: { color: '#F0FFFF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },

    // Earnings cards
    earningsRow: { flexDirection: 'row', gap: 10, marginBottom: 30 },
    earningCard: { flex: 1, borderRadius: 16, padding: 15, alignItems: 'center', borderWidth: 1, gap: 5 },
    earningAmount: { fontSize: 16, fontWeight: '900' },
    earningLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },

    // Payout section
    sectionHeader: { marginBottom: 15 },
    sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },

    // Payout card
    payoutCard: { borderRadius: 16, padding: 15, borderWidth: 1, marginBottom: 10 },
    payoutIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    payoutCourse: { fontSize: 12, fontWeight: '900' },
    payoutStudent: { fontSize: 8, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 },
    payoutAmount: { fontSize: 14, fontWeight: '900' },
    payoutDate: { fontSize: 8, marginTop: 2 },

    // Empty state
    emptyState: { borderRadius: 20, borderWidth: 1, padding: 50, alignItems: 'center' },
    emptyTitle: { fontSize: 12, fontWeight: '900', marginTop: 15, letterSpacing: 1 },
    emptyDesc: { fontSize: 9, textAlign: 'center', marginTop: 5, fontWeight: '700', letterSpacing: 0.5 },
});
