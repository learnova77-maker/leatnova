import AppHeader from '@/components/sidebar/AppHeader';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentCertificates() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // Placeholder certificates data
    const certificates = [
        // { id: '1', title: 'IELTS Foundation', date: '20 Oct 2023', score: '8.5' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppHeader title="My Certificates" showBack onBackPress={() => router.back()} role="student" />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerBox}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="ribbon" size={40} color={Colors.primary} />
                    </View>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Your Achievements</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Showcase your verified skills</Text>
                    </View>
                </View>

                {certificates.length > 0 ? (
                    certificates.map((cert) => (
                        <View key={cert.id} style={[styles.certCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.certIcon}>
                                <Ionicons name="document-text" size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.certInfo}>
                                <Text style={[styles.certTitle, { color: colors.text }]}>{cert.title}</Text>
                                <Text style={[styles.certDate, { color: colors.textSecondary }]}>Issued on {cert.date}</Text>
                            </View>
                            <TouchableOpacity style={styles.downloadBtn}>
                                <Ionicons name="download-outline" size={20} color={Colors.secondary} />
                            </TouchableOpacity>
                        </View>
                    ))
                ) : (
                    <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="sparkles-outline" size={60} color={colors.border} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Certificates Yet</Text>
                        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                            Complete courses and quizzes to earn officially verified certificates.
                        </Text>
                        <TouchableOpacity
                            style={styles.exploreBtn}
                            onPress={() => router.push('/student/explore')}
                        >
                            <Text style={styles.exploreBtnText}>Earn Your First Certificate</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    headerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        marginBottom: 30,
        marginTop: 10,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
    },
    certCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 15,
        elevation: 2,
    },
    certIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    certInfo: {
        flex: 1,
    },
    certTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    certDate: {
        fontSize: 12,
        marginTop: 2,
    },
    downloadBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyBox: {
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        marginTop: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 25,
    },
    exploreBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 14,
        borderRadius: 16,
    },
    exploreBtnText: {
        color: Colors.secondary,
        fontWeight: 'bold',
        fontSize: 14,
    },
});
