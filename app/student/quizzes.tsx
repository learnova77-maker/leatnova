import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
    FlatList,
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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Quizzes" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>My Quizzes</Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Test your knowledge and track scores</Text>
                </View>
                <FlatList
                    data={quizzes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.listText}>
                                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.questions} Questions • {item.time}</Text>
                            </View>
                            <View style={[styles.scoreBox, { backgroundColor: colors.primary + '20' }]}>
                                <Text style={[styles.scoreText, { color: colors.text }]}>{item.score}</Text>
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
    listContent: {
        paddingBottom: 40,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 15,
        borderRadius: 16,
        marginBottom: 12,
    },
    listText: {
        flex: 1,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    itemSub: {
        fontSize: 12,
        color: Colors.grey,
    },
    scoreBox: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: Colors.primary + '20',
        borderRadius: 8,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
});
