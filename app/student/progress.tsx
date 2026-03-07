import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function StudentProgress() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Progress" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={styles.screenTitle}>My Progress</Text>
                    <Text style={styles.screenSub}>See how far you've come</Text>
                </View>
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>Overall Completion</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '68%' }]} />
                    </View>
                    <Text style={styles.progressPercent}>68% Finished</Text>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.smallStat}>
                        <Text style={styles.smallStatVal}>24</Text>
                        <Text style={styles.smallStatLabel}>Videos Watched</Text>
                    </View>
                    <View style={styles.smallStat}>
                        <Text style={styles.smallStatVal}>08</Text>
                        <Text style={styles.smallStatLabel}>Quizzes Passed</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    screenContainer: {
        flex: 1,
        padding: 20,
    },
    screenHeader: {
        marginBottom: 20,
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    screenSub: {
        fontSize: 14,
        color: Colors.grey,
        marginTop: 4,
    },
    progressCard: {
        backgroundColor: Colors.white,
        padding: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
        marginBottom: 10,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#F3F4F6',
        borderRadius: 5,
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 5,
    },
    progressPercent: {
        fontSize: 12,
        color: Colors.grey,
        textAlign: 'right',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
    },
    smallStat: {
        flex: 1,
        backgroundColor: Colors.white,
        padding: 15,
        borderRadius: 16,
        alignItems: 'center',
    },
    smallStatVal: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    smallStatLabel: {
        fontSize: 11,
        color: Colors.grey,
        marginTop: 4,
    }
});
