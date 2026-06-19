import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
    uri: string;
    shouldPlay: boolean;
}

export default function CustomVideoPlayer({ uri, shouldPlay }: Props) {
    const videoRef = useRef<Video>(null);
    const [status, setStatus] = useState<any>({});
    const [showControls, setShowControls] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [lastTap, setLastTap] = useState(0);
    const controlsOpacity = useRef(new Animated.Value(0)).current;
    const hideTimeout = useRef<any>(null);

    useEffect(() => {
        if (showControls) {
            Animated.timing(controlsOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            if (hideTimeout.current) clearTimeout(hideTimeout.current);
            hideTimeout.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        } else {
            Animated.timing(controlsOpacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
        return () => { if (hideTimeout.current) clearTimeout(hideTimeout.current); };
    }, [showControls]);

    useEffect(() => {
        if (!videoRef.current) return;
        if (shouldPlay) {
            videoRef.current.playAsync().catch(err => console.log('Auto-play error:', err));
        } else {
            videoRef.current.pauseAsync().catch(err => console.log('Auto-pause error:', err));
        }
    }, [shouldPlay]);

    const skipBackward = async () => {
        if (status.positionMillis !== undefined) {
            await videoRef.current?.setPositionAsync(Math.max(0, status.positionMillis - 10000));
        }
    };

    const skipForward = async () => {
        if (status.positionMillis !== undefined && status.durationMillis !== undefined) {
            await videoRef.current?.setPositionAsync(Math.min(status.durationMillis, status.positionMillis + 10000));
        }
    };

    const handleTap = (evt: any) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        const xPos = evt.nativeEvent.locationX;
        const midPoint = SCREEN_WIDTH * 0.45; // Approximately middle of the component

        if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
            // Double tap detected
            if (xPos < midPoint) {
                skipBackward();
            } else {
                skipForward();
            }
            setShowControls(true);
        } else {
            setShowControls(prev => !prev);
        }
        setLastTap(now);
    };

    const togglePlayPause = async () => {
        if (!videoRef.current) return;
        try {
            if (status.isPlaying) {
                await videoRef.current.pauseAsync();
            } else {
                await videoRef.current.playAsync();
            }
        } catch (err) {
            console.error('Toggle play error:', err);
        }
    };

    const toggleMute = () => setIsMuted(prev => !prev);

    const formatTime = (millis: number) => {
        if (!millis) return "0:00";
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <View style={styles.container}>
            <Pressable style={styles.videoBox} onPress={handleTap}>
                <Video
                    ref={videoRef}
                    source={{ uri }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={shouldPlay}
                    isLooping
                    isMuted={isMuted}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={s => setStatus(s)}
                    onError={(err) => console.error('Video error:', err)}
                />

                {!status.isLoaded && (
                    <View style={[styles.controlsOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                        <ActivityIndicator size="large" color="#00AEEF" />
                    </View>
                )}

                <Animated.View style={[styles.controlsOverlay, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
                    <View style={styles.centerRow}>
                        <TouchableOpacity onPress={skipBackward} style={styles.controlBtn}>
                            <View style={styles.skipIconBag}><Ionicons name="play-back" size={24} color="#FFF" /></View>
                            <Text style={styles.skipText}>-10s</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={togglePlayPause} style={styles.mainPlayBtn}>
                            <Ionicons name={status.isPlaying ? "pause" : "play"} size={42} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={skipForward} style={styles.controlBtn}>
                            <View style={styles.skipIconBag}><Ionicons name="play-forward" size={24} color="#FFF" /></View>
                            <Text style={styles.skipText}>+10s</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomBar}>
                        <Text style={styles.timeText}>{formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}</Text>
                        <TouchableOpacity onPress={toggleMute} style={styles.muteBtn}>
                            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {!showControls && !status.isPlaying && status.isLoaded && (
                    <View style={styles.floatingPlay}>
                        <Ionicons name="play" size={30} color="#FFF" />
                    </View>
                )}
            </Pressable>

            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(status.durationMillis && status.positionMillis) ? (status.positionMillis / status.durationMillis) * 100 : 0}%` }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { width: '100%', marginBottom: 5 },
    videoBox: { width: '100%', aspectRatio: 1, backgroundColor: '#000', borderRadius: 15, overflow: 'hidden' },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    centerRow: { flexDirection: 'row', alignItems: 'center', gap: 30 },
    controlBtn: { alignItems: 'center' },
    skipIconBag: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    skipText: { color: '#FFF', fontSize: 10, marginTop: 4, fontWeight: 'bold' },
    mainPlayBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    timeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
    muteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    progressContainer: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', width: '100%', borderBottomLeftRadius: 15, borderBottomRightRadius: 15, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: Colors.primary },
    floatingPlay: {
        position: 'absolute',
        bottom: 15,
        right: 15,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8
    }
});
