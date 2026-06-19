import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function StudentQuizzes() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();

    const quizzes = [
        { id: '1', title: 'Reading Mock Test #4', questions: '40', time: '60 mins', score: '--' },
        { id: '2', title: 'Grammar Quiz: Tenses', questions: '15', time: '10 mins', score: '85%' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="MY QUIZZES" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>MY <Text style={{ color: '#00AEEF' }}>TESTS</Text></Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Check your results and track your scores.</Text>
                </View>
                <FlatList
                    data={quizzes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.listText}>
                                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.questions} QUESTIONS • {item.time.toUpperCase()}</Text>
                            </View>
                            <View style={[styles.scoreBox, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)', borderColor: isDark ? 'rgba(0, 174, 239, 0.2)' : 'rgba(0, 174, 239, 0.1)' }]}>
                                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>SCORE</Text>
                                <Text style={styles.scoreText}>{item.score}</Text>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                />
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
    listContent: {
        paddingBottom: 100,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
    },
    listText: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    itemSub: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scoreBox: {
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        minWidth: 75,
    },
    scoreLabel: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#00AEEF',
    },
});
