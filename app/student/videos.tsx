import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentVideos() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [videos, setVideos] = useState<any[]>([]);

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        try {
            const data = await AsyncStorage.getItem('downloaded_videos');
            if (data) {
                setVideos(JSON.parse(data));
            }
        } catch (e) {
            console.error('Error loading offline videos:', e);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="MY VIDEOS" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>MY <Text style={{ color: '#00AEEF' }}>VIDEOS</Text></Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Watch your recorded course videos and lessons.</Text>
                </View>
                <FlatList
                    data={videos}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                            activeOpacity={0.8}
                            onPress={() => router.push(`/student/courses/${item.courseId}`)}
                        >
                            <View style={[styles.videoIcon, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                <Ionicons name="play-outline" size={18} color="#00AEEF" />
                            </View>
                            <View style={styles.listText}>
                                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                                    {item.courseTitle?.toUpperCase() || 'OFFLINE'}
                                </Text>
                            </View>
                            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 100 }}>
                            <Ionicons name="cloud-offline-outline" size={60} color={colors.textSecondary} />
                            <Text style={{ color: colors.textSecondary, marginTop: 20, fontWeight: '700' }}>NO SAVED VIDEOS YET</Text>
                        </View>
                    }
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
    videoIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
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
        marginBottom: 4,
    },
    itemSub: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
