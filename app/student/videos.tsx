import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentVideos() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();

    const videos = [
        { id: '1', title: 'IELTS Speaking Basics', duration: '12:45', instructor: 'Prof. Wei Chen' },
        { id: '2', title: 'How to write Task 1', duration: '22:10', instructor: 'Dr. Sarah Smith' },
        { id: '3', title: 'Listening Tips & Tricks', duration: '15:30', instructor: 'Prof. Wei Chen' },
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Video Library" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>Video Library</Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Learn at your own pace</Text>
                </View>
                <FlatList
                    data={videos}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={[styles.listItem, { backgroundColor: colors.card }]}>
                            <View style={styles.videoIcon}>
                                <Ionicons name="play" size={20} color={Colors.secondary} />
                            </View>
                            <View style={styles.listText}>
                                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.instructor} • {item.duration}</Text>
                            </View>
                            <Ionicons name="cloud-download-outline" size={20} color={Colors.grey} />
                        </TouchableOpacity>
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
    videoIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.primary + '30',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listText: {
        flex: 1,
        marginLeft: 15,
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
});
