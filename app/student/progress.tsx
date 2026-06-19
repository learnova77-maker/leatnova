import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function StudentProgress() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="MY PROGRESS" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>YOUR <Text style={{ color: '#00AEEF' }}>STATS</Text></Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Track your learning and see your growth.</Text>
                </View>
                <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(0, 174, 239, 0.15)' : 'rgba(0, 174, 239, 0.1)' }]}>
                    <Text style={[styles.progressTitle, { color: colors.text }]}>OVERALL COMPLETION</Text>
                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                        <View style={styles.progressBarFill} />
                    </View>
                    <Text style={styles.progressPercent}>68% COMPLETED</Text>
                </View>
                <View style={styles.statsGrid}>
                    <View style={[styles.smallStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.smallStatVal}>24</Text>
                        <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>POSTS VIEWED</Text>
                    </View>
                    <View style={[styles.smallStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={styles.smallStatVal}>08</Text>
                        <Text style={[styles.smallStatLabel, { color: colors.textSecondary }]}>TESTS PASSED</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContainer: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 40,
    },
    screenHeader: {
        marginBottom: 35,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    screenSub: {
        fontSize: 10,
        marginTop: 8,
        lineHeight: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    progressCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 20,
        borderWidth: 1,
    },
    progressTitle: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 15,
        letterSpacing: 1,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        marginBottom: 15,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00AEEF',
        width: '68%',
    },
    progressPercent: {
        fontSize: 12,
        fontWeight: '900',
        color: '#00AEEF',
        textAlign: 'right',
        letterSpacing: 1,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    smallStat: {
        flex: 1,
        borderWidth: 1,
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
    },
    smallStatVal: {
        fontSize: 24,
        fontWeight: '900',
        color: '#00AEEF',
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    smallStatLabel: {
        fontSize: 8,
        marginTop: 8,
        fontWeight: '900',
        letterSpacing: 1,
    }
});
