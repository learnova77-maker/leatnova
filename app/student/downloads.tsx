import AppHeader from '@/components/sidebar/AppHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface DownloadedVideo {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
    thumbnail: string;
    localUri: string;
    downloadedAt: number;
}

export default function StudentDownloads() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [downloads, setDownloads] = useState<DownloadedVideo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    const loadDownloads = async () => {
        setIsLoading(true);
        try {
            const data = await AsyncStorage.getItem('downloaded_videos');
            if (data) {
                const parsed = JSON.parse(data) as DownloadedVideo[];

                // Verify if files still exist locally
                const validDownloads = [];
                for (const item of parsed) {
                    const fileInfo = await FileSystem.getInfoAsync(item.localUri);
                    if (fileInfo.exists) {
                        validDownloads.push(item);
                    }
                }

                // Save back the verified list if mismatches found
                if (validDownloads.length !== parsed.length) {
                    await AsyncStorage.setItem('downloaded_videos', JSON.stringify(validDownloads));
                }

                setDownloads(validDownloads);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDownloads();
    }, []);

    const handleDelete = async (id: string, title: string, uri: string) => {
        Alert.alert('Delete Video', `Are you sure you want to remove '${title}' from your device?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await FileSystem.deleteAsync(uri, { idempotent: true });
                        const updated = downloads.filter(d => d.id !== id);
                        await AsyncStorage.setItem('downloaded_videos', JSON.stringify(updated));
                        setDownloads(updated);
                        Alert.alert('Deleted', 'Video has been successfully removed.');
                    } catch (e) {
                        Alert.alert('Error', 'Could not delete the video.');
                    }
                }
            }
        ]);
    };

    const player = useVideoPlayer(selectedVideo as string, p => {
        if (selectedVideo) {
            p.loop = false;
            p.play();
        }
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppHeader
                title="OFFLINE VIDEOS"
                showBack={true}
                onBackPress={() => router.back()}
                role="student"
            />

            {isLoading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#00AEEF" />
                </View>
            ) : downloads.length === 0 ? (
                <View style={styles.centerContent}>
                    <Ionicons name="cloud-offline-outline" size={80} color={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>NO OFFLINE VIDEOS</Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Download recorded lessons to watch them anytime without internet connection.</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.headerBox}>
                        <Text style={[styles.title, { color: colors.text }]}>DOWNLOADED VIDEOS</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>These lessons are saved on your device and can be viewed fully offline.</Text>
                    </View>

                    {downloads.map((video) => (
                        <TouchableOpacity
                            key={video.id}
                            style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => setSelectedVideo(video.localUri)}
                        >
                            <View style={styles.thumbnailContainer}>
                                {video.thumbnail ? (
                                    <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
                                ) : (
                                    <View style={[styles.thumbnail, { backgroundColor: isDark ? '#222' : '#E5E5E5', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="videocam" size={24} color="#00AEEF" />
                                    </View>
                                )}
                                <View style={styles.playOverlay}>
                                    <View style={styles.playIconContainer}>
                                        <Ionicons name="play" size={16} color="#FFF" />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.videoInfo}>
                                <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>{video.title}</Text>
                                <Text style={[styles.courseTitle, { color: colors.textSecondary }]} numberOfLines={1}>{video.courseTitle}</Text>
                                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                    Saved {new Date(video.downloadedAt).toLocaleDateString()}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.deleteBtn}
                                onPress={() => handleDelete(video.id, video.title, video.localUri)}
                            >
                                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    ))}
                    <View style={{ height: 100 }} />
                </ScrollView>
            )}

            {/* Video Player Modal */}
            <Modal visible={!!selectedVideo} animationType="fade" transparent={true}>
                <View style={styles.videoModalContainer}>
                    <TouchableOpacity style={styles.videoOverlay} activeOpacity={1} onPress={() => setSelectedVideo(null)} />
                    <View style={[styles.videoFullBox, { backgroundColor: '#000' }]}>
                        <View style={styles.videoTopHeader}>
                            <Text style={styles.videoHeaderTitle}>OFFLINE PLAYER</Text>
                            <TouchableOpacity style={styles.closeVideoBtn} onPress={() => {
                                setSelectedVideo(null);
                                player?.pause();
                            }}>
                                <Ionicons name="close" size={24} color="#00AEEF" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.videoContainer}>
                            {selectedVideo && (
                                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                    <VideoView
                                        player={player}
                                        style={styles.playerStyle}
                                        allowsFullscreen
                                        allowsPictureInPicture
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '900', marginTop: 20, letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    emptySub: { fontSize: 12, textAlign: 'center', marginTop: 10, fontWeight: '600', letterSpacing: 0.5, lineHeight: 20 },
    content: { padding: 25 },
    headerBox: { marginBottom: 25 },
    title: { fontSize: 22, fontWeight: '900', letterSpacing: 1.5, fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    subtitle: { fontSize: 12, marginTop: 8, fontWeight: '600', lineHeight: 18 },
    videoCard: { flexDirection: 'row', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, alignItems: 'center' },
    thumbnailContainer: { width: 100, height: 70, borderRadius: 12, overflow: 'hidden', marginRight: 15 },
    thumbnail: { width: '100%', height: '100%' },
    playOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    playIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 174, 239, 0.8)', justifyContent: 'center', alignItems: 'center', paddingLeft: 2 },
    videoInfo: { flex: 1, justifyContent: 'center' },
    videoTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    courseTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 5 },
    dateText: { fontSize: 10, fontWeight: '600' },
    deleteBtn: { padding: 10, marginLeft: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 },
    videoModalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
    videoOverlay: { ...StyleSheet.absoluteFillObject },
    videoFullBox: { width: '100%' },
    videoTopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32 },
    videoHeaderTitle: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    closeVideoBtn: { padding: 5 },
    videoContainer: { width: '100%', aspectRatio: 16 / 9 },
    playerStyle: { width: '100%', height: '100%' }
});
