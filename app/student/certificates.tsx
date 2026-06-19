import AppHeader from '@/components/sidebar/AppHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function StudentCertificates() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // No fake data as per user request
    const certificates: any[] = [];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader title="CERTIFICATIONS" showBack onBackPress={() => router.back()} role="student" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerSection}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusDot} />
                        <Text style={[styles.statusText, { color: isDark ? 'rgba(0, 174, 239, 0.8)' : 'rgba(0, 174, 239, 0.9)' }]}>VERIFICATION ENGINES ONLINE</Text>
                    </View>
                    <Text style={[styles.mainTitle, { color: colors.text }]}>OFFICIAL <Text style={{ color: '#00AEEF' }}>CERTIFICATIONS</Text></Text>
                    <Text style={[styles.subText, { color: colors.textSecondary }]}>SECURE REPOSITORY OF YOUR VALIDATED LEARNING RECORDS.</Text>
                </View>

                {certificates.length > 0 ? (
                    <View style={styles.gridContainer}>
                        {certificates.map((cert) => (
                            <View key={cert.id} style={[styles.glowTarget, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.certCard}>
                                    <View style={styles.cardHeader}>
                                        <View style={[styles.certGrade, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)', borderColor: isDark ? 'rgba(0, 174, 239, 0.2)' : 'rgba(0, 174, 239, 0.1)' }]}>
                                            <Text style={styles.gradeText}>{cert.grade || 'A'}</Text>
                                        </View>
                                        <Ionicons name="shield-checkmark" size={20} color="rgba(0, 174, 239, 0.6)" />
                                    </View>

                                    <View style={styles.cardBody}>
                                        <Text style={[styles.certName, { color: colors.text }]}>{cert.title}</Text>
                                        <View style={styles.metaRow}>
                                            <View>
                                                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>ISSUE_DATE</Text>
                                                <Text style={[styles.metaValue, { color: colors.text }]}>{cert.date}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>CERTIFICATE_ID</Text>
                                                <Text style={[styles.metaValue, { color: colors.text }]}>{cert.serial || 'MV-SECURE'}</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                                        <TouchableOpacity style={styles.actionButton}>
                                            <Ionicons name="share-social-outline" size={16} color="#00AEEF" />
                                            <Text style={styles.actionText}>SHARE</Text>
                                        </TouchableOpacity>
                                        <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
                                        <TouchableOpacity style={styles.actionButton}>
                                            <Ionicons name="download-outline" size={16} color="#00AEEF" />
                                            <Text style={styles.actionText}>DOWNLOAD</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={[styles.emptyVault, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.emptyCircle, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)', borderColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                            <Ionicons name="ribbon-outline" size={40} color="rgba(0, 174, 239, 0.3)" />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>NO CERTIFICATIONS</Text>
                        <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                            NO VALIDATED RECORDS DETECTED IN YOUR PROFILE.
                            COMPLETE COURSES AND ASSESSMENTS TO GENERATE OFFICIAL CERTIFICATES.
                        </Text>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => router.push('/student/explore')}
                        >
                            <Text style={styles.ctaText}>EXPLORE COURSES</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.systemInfo}>
                    <Text style={[styles.systemText, { color: colors.textSecondary, opacity: 0.5 }]}>• ALL CERTIFICATES ARE OFFICIALLY VERIFIED •</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 25,
        paddingTop: 30,
        paddingBottom: 50,
    },
    headerSection: {
        marginBottom: 35,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00AEEF',
    },
    statusText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    mainTitle: {
        fontSize: 26,
        fontWeight: '900',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subText: {
        fontSize: 10,
        marginTop: 8,
        fontWeight: '800',
        letterSpacing: 0.5,
        lineHeight: 18,
    },
    gridContainer: {
        gap: 20,
    },
    glowTarget: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    certCard: {
        padding: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    certGrade: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
    gradeText: {
        color: '#00AEEF',
        fontSize: 12,
        fontWeight: '900',
    },
    cardBody: {
        marginBottom: 25,
    },
    certName: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: 20,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metaLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    metaValue: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 20,
        alignItems: 'center',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        color: '#00AEEF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footerDivider: {
        width: 1,
        height: 15,
    },
    emptyVault: {
        padding: 40,
        borderRadius: 32,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: 20,
    },
    emptyCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 30,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 3,
        marginBottom: 15,
    },
    emptyDesc: {
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '800',
        marginBottom: 40,
    },
    ctaButton: {
        backgroundColor: '#00AEEF',
        paddingHorizontal: 30,
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ctaText: {
        color: '#000000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    systemInfo: {
        marginTop: 60,
        alignItems: 'center',
    },
    systemText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 2,
    }
});
