import AppHeader from '@/components/sidebar/AppHeader';
import { paymentApi, userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { endConnection, fetchProducts, finishTransaction, initConnection, purchaseErrorListener, purchaseUpdatedListener, requestPurchase } from 'react-native-iap';

const { width } = Dimensions.get('window');

const COIN_BUNDLES = [
    { id: 'coins_100', coins: 100, price: 'Rs 100', icon: 'star', color: ['#FCD34D', '#F59E0B'] },
    { id: 'coins_200', coins: 200, price: 'Rs 200', icon: 'flash', color: ['#93C5FD', '#3B82F6'] },
    { id: 'coins_500', coins: 500, price: 'Rs 500', icon: 'diamond', color: ['#A78BFA', '#8B5CF6'] },
    { id: 'coins_1000', coins: 1000, price: 'Rs 1000', icon: 'flame', color: ['#FCA5A5', '#EF4444'] },
    { id: 'coins_3500', coins: 3500, price: 'Rs 3500', icon: 'planet', color: ['#6EE7B7', '#10B981'] },
];

export default function WalletScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const loadUserData = async () => {
        try {
            const saved = await AsyncStorage.getItem('user');
            if (saved) {
                const user = JSON.parse(saved);
                setCurrentUser(user);

                // Fetch latest balance from backend
                const profileRes = await userApi.getProfile(user.uid);
                if (profileRes.data?.success && profileRes.data?.user?.coins) {
                    setBalance(parseInt(profileRes.data.user.coins) || 0);
                }
            }
        } catch (e) { }
    };

    useEffect(() => {
        loadUserData();

        // Setup Google Play Connection
        const setupIAP = async () => {
            try {
                await initConnection();
            } catch (err) {
                console.log('IAP Init Error:', err);
            }
        };
        setupIAP();

        const purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: any) => {
            if (purchase) {
                try {
                    // Consume the product so it can be bought again!
                    await finishTransaction({ purchase, isConsumable: true });

                    // Find which bundle was bought by string matching ID (e.g. coins_500)
                    const sku = purchase.productId || '';
                    const addedCoins = parseInt(sku.replace('coins_', '')) || 0;

                    let syncUser = currentUser;
                    if (!syncUser) {
                        const saved = await AsyncStorage.getItem('user');
                        if (saved) syncUser = JSON.parse(saved);
                    }

                    if (syncUser && addedCoins > 0) {
                        // Hit backend to add coins to database
                        const res = await paymentApi.buyCoins({
                            studentId: syncUser.uid,
                            coins: addedCoins,
                            transactionId: purchase.transactionReceipt || purchase.purchaseToken
                        });

                        if (res.data?.success) {
                            setBalance(res.data.newBalance);
                            setIsLoading(false);
                            Alert.alert(
                                'Purchase Successful! 🎉',
                                `${addedCoins} coins have been added successfully.`
                            );
                        } else {
                            throw new Error(res.data?.message || 'Failed to add coins to DB');
                        }
                    } else {
                        setIsLoading(false);
                        Alert.alert('Session Error', 'User not found. Please relogin to sync wallet.');
                    }
                } catch (err: any) {
                    setIsLoading(false);
                    Alert.alert('Sync Error', 'Payment succeeded via Google Play, but syncing failed: ' + (err?.message || 'Unknown'));
                }
            }
        });

        const purchaseErrorSubscription = purchaseErrorListener((error) => {
            setIsLoading(false);
            if (error.code !== 'E_USER_CANCELLED') {
                Alert.alert('Payment Cancelled', error.message);
            }
        });

        return () => {
            purchaseUpdateSubscription.remove();
            purchaseErrorSubscription.remove();
            endConnection();
        };
    }, []);

    const handleBuyCoins = async (bundle: any) => {
        setIsLoading(true);
        try {
            // First we fetch the product to make sure Google knows it
            await fetchProducts({ skus: [bundle.id], type: 'in-app' });

            // Then trigger purchase
            await requestPurchase({
                request: {
                    apple: { sku: bundle.id },
                    google: { skus: [bundle.id] }
                },
                type: 'in-app'
            });

        } catch (err: any) {
            setIsLoading(false);
            if (err.code !== 'E_USER_CANCELLED') {
                Alert.alert('Google Play Error', 'Failed to initialized payment link: ' + err.message);
            }
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <AppHeader title="MY WALLET" showBack onBackPress={() => router.back()} role="student" />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Balance Card */}
                <LinearGradient
                    colors={isDark ? ['#1e293b', '#0f172a'] : ['#3b82f6', '#2563eb']}
                    style={styles.balanceCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.balanceHeader}>
                        <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
                        <Ionicons name="sparkles" size={20} color="#FBBF24" />
                    </View>
                    <Text style={styles.balanceValue}>{balance} <Text style={styles.balanceUnit}>Coins</Text></Text>
                    <Text style={styles.balanceSubtitle}>Use coins to instantly unlock premium courses.</Text>
                </LinearGradient>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Buy Coin Bundles</Text>

                <View style={styles.grid}>
                    {COIN_BUNDLES.map((bundle, index) => (
                        <TouchableOpacity
                            key={bundle.id}
                            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                            activeOpacity={0.8}
                            onPress={() => handleBuyCoins(bundle)}
                        >
                            <LinearGradient
                                colors={bundle.color as any}
                                style={styles.iconWrapper}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name={bundle.icon as any} size={28} color="#FFF" />
                            </LinearGradient>

                            <Text style={[styles.coinAmount, { color: colors.text }]}>{bundle.coins}</Text>
                            <Text style={styles.coinLabel}>COINS</Text>

                            <View style={[styles.priceTag, { backgroundColor: isDark ? 'rgba(0,174,239,0.1)' : '#E0F2FE' }]}>
                                <Text style={[styles.priceText, { color: '#00AEEF' }]}>{bundle.price}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={[styles.loadingBox, { backgroundColor: colors.surface }]}>
                        <ActivityIndicator size="large" color="#00AEEF" />
                        <Text style={[styles.loadingText, { color: colors.text }]}>Processing Payment...</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 100,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        shadowColor: '#00AEEF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    balanceValue: {
        color: '#FFF',
        fontSize: 48,
        fontWeight: '900',
    },
    balanceUnit: {
        fontSize: 20,
        fontWeight: '500',
        color: '#FBBF24',
    },
    balanceSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 15,
    },
    card: {
        width: (width - 55) / 2, // 2 columns with gap
        borderWidth: 1,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginBottom: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconWrapper: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    coinAmount: {
        fontSize: 28,
        fontWeight: '900',
    },
    coinLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 15,
    },
    priceTag: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    priceText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    loadingBox: {
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 15,
        fontWeight: 'bold',
    }
});
