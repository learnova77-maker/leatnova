import { Colors } from '@/constants/theme';
import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { onChildAdded, onValue, push, ref, runTransaction, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Import Agora SDK directly
import {
    ChannelProfileType,
    ClientRoleType,
    createAgoraRtcEngine,
    IRtcEngine,
    RtcSurfaceView,
    VideoSourceType,
} from 'react-native-agora';

interface LiveSessionProps {
    appId: string;
    channelName: string;
    token: string;
    uid: number;
    sessionId: string;
    userName: string;
    role: 'publisher' | 'subscriber';
    onEnd: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ appId, channelName, token, uid, role, onEnd, sessionId, userName }) => {
    const engineRef = useRef<IRtcEngine | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [likesCount, setLikesCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const scrollViewRef = useRef<FlatList>(null);

    // Request permissions on Android
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);
                const allGranted = Object.values(granted).every(
                    (val) => val === PermissionsAndroid.RESULTS.GRANTED
                );
                if (!allGranted) {
                    setError('Camera and Microphone permissions are required for live streaming.');
                    return false;
                }
            } catch (err) {
                console.error('Permission error:', err);
                return false;
            }
        }
        return true;
    };

    useEffect(() => {
        const initEngine = async () => {
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;

            try {
                // Create Engine
                const engine = createAgoraRtcEngine();
                engineRef.current = engine;

                // Initialize Engine
                engine.initialize({
                    appId: appId,
                    channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
                });

                // Register Event Handlers
                engine.registerEventHandler({
                    onJoinChannelSuccess: (_connection, _elapsed) => {
                        console.log('Successfully joined channel');
                        setIsJoined(true);
                    },
                    onUserJoined: (_connection, remoteUserId, _elapsed) => {
                        console.log('Remote user joined:', remoteUserId);
                        setRemoteUid(remoteUserId);
                    },
                    onUserOffline: (_connection, remoteUserId, _reason) => {
                        console.log('Remote user left:', remoteUserId);
                        setRemoteUid(null);
                    },
                    onError: (_err, msg) => {
                        console.error('Agora Error:', _err, msg);
                    },
                });

                // Set role
                if (role === 'publisher') {
                    engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
                    engine.enableVideo();
                    engine.enableAudio();
                    engine.startPreview();
                } else {
                    engine.setClientRole(ClientRoleType.ClientRoleAudience);
                }

                // Join Channel
                engine.joinChannel(token, channelName, uid, {
                    clientRoleType: role === 'publisher'
                        ? ClientRoleType.ClientRoleBroadcaster
                        : ClientRoleType.ClientRoleAudience,
                    publishMicrophoneTrack: role === 'publisher',
                    publishCameraTrack: role === 'publisher',
                    autoSubscribeAudio: true,
                    autoSubscribeVideo: true,
                });

                // Listen for Removal
                let unsubRemoval: (() => void) | undefined;
                if (role === 'subscriber') {
                    const removalRef = ref(rtdb, `live_sessions/${sessionId}/removals/${uid}`);
                    unsubRemoval = onValue(removalRef, (snapshot) => {
                        if (snapshot.exists()) {
                            Alert.alert('Session Ended', 'The teacher has removed you from this session.');
                            handleEndCall();
                        }
                    });
                }

                // Listen for Chat
                const chatRef = ref(rtdb, `live_chats/${sessionId}`);
                const unsubChat = onChildAdded(chatRef, (snapshot) => {
                    const newMsg = { id: snapshot.key, ...snapshot.val() };
                    setMessages((prev) => {
                        // Prevent duplicate keys
                        if (prev.some(m => m.id === newMsg.id)) return prev;
                        return [...prev, newMsg];
                    });
                });

                // Listen for Likes
                const likesRef = ref(rtdb, `live_sessions/${sessionId}/likes`);
                const unsubLikes = onValue(likesRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setLikesCount(snapshot.val());
                    }
                });

                // --- VIEWER COUNT LOGIC ---
                const viewerRef = ref(rtdb, `live_sessions/${sessionId}/viewers`);

                // Increment on join (if subscriber)
                if (role === 'subscriber') {
                    await runTransaction(viewerRef, (current) => (current || 0) + 1);
                }

                // Listen for viewer count changes
                const unsubViewers = onValue(viewerRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setViewerCount(snapshot.val());
                    }
                });

                // Cleanup on leave
                return async () => {
                    // Detach Firebase listeners
                    if (unsubChat) unsubChat();
                    if (unsubLikes) unsubLikes();
                    if (unsubViewers) unsubViewers();
                    if (unsubRemoval) unsubRemoval();

                    const engine = engineRef.current;
                    if (engine) {
                        engine.leaveChannel();
                        engine.release();
                        engineRef.current = null;
                    }

                    // Decrement on leave (if subscriber)
                    if (role === 'subscriber') {
                        await runTransaction(viewerRef, (current) => (current && current > 0) ? current - 1 : 0);
                    }
                };

            } catch (err: any) {
                console.error('Engine init error:', err);
                setError(err.message || 'Failed to initialize live streaming engine.');
            }
        };

        initEngine();
    }, []);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isJoined) {
            interval = setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isJoined]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const h = Math.floor(m / 60);

        if (h > 0) {
            const hDisplay = h.toString().padStart(2, '0');
            const mDisplay = (m % 60).toString().padStart(2, '0');
            const sDisplay = s.toString().padStart(2, '0');
            return `${hDisplay}:${mDisplay}:${sDisplay}`;
        }

        const mDisplay = m.toString().padStart(2, '0');
        const sDisplay = s.toString().padStart(2, '0');
        return `${mDisplay}:${sDisplay}`;
    };

    const toggleUI = () => {
        setShowControls(!showControls);
    };

    const handleToggleMute = () => {
        const engine = engineRef.current;
        if (engine) {
            engine.muteLocalAudioStream(!isMuted);
            setIsMuted(!isMuted);
        }
    };

    const handleToggleCamera = () => {
        const engine = engineRef.current;
        if (engine) {
            engine.enableLocalVideo(isCameraOff); // Turns hardware on if currently off, and vice versa
            engine.muteLocalVideoStream(!isCameraOff);
            setIsCameraOff(!isCameraOff);

            // If screen sharing was active, we don't want to publish camera yet
            if (!isScreenSharing) {
                engine.updateChannelMediaOptions({
                    publishCameraTrack: isCameraOff,
                });
            }
        }
    };

    const handleToggleScreenShare = () => {
        const engine = engineRef.current;
        if (!engine) return;

        if (isScreenSharing) {
            engine.stopScreenCapture();
            engine.updateChannelMediaOptions({
                publishCameraTrack: !isCameraOff,
                publishScreenTrack: false,
            });
            setIsScreenSharing(false);
        } else {
            engine.startScreenCapture({
                captureVideo: true,
                captureAudio: false,
            });
            engine.updateChannelMediaOptions({
                publishCameraTrack: false,
                publishScreenTrack: true,
            });
            setIsScreenSharing(true);
        }
    };

    const handleEndCall = () => {
        const engine = engineRef.current;
        if (engine) {
            engine.leaveChannel();
            engine.release();
            engineRef.current = null;
        }
        onEnd();
    };

    const sendMessage = () => {
        if (!inputText.trim()) return;
        const chatRef = ref(rtdb, `live_chats/${sessionId}`);
        push(chatRef, {
            uid,
            userName,
            text: inputText.trim(),
            timestamp: Date.now(),
        });
        setInputText('');
    };

    const handleLike = async () => {
        const likesRef = ref(rtdb, `live_sessions/${sessionId}/likes`);

        if (isLiked) {
            setIsLiked(false);
            await runTransaction(likesRef, (current: any) => (current && current > 0) ? current - 1 : 0);
        } else {
            setIsLiked(true);
            await runTransaction(likesRef, (current: any) => (current || 0) + 1);
        }
    };

    const handleRemoveStudent = (studentUid: number, studentName: string) => {
        if (role !== 'publisher') return;
        Alert.alert(
            'Remove Student',
            `Are you sure you want to remove ${studentName} from the live class?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const removalRef = ref(rtdb, `live_sessions/${sessionId}/removals/${studentUid}`);
                        await set(removalRef, true);
                    }
                }
            ]
        );
    };

    // Error Screen
    if (error) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <Ionicons name="alert-circle" size={60} color="#FF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.goBackBtn} onPress={onEnd}>
                    <Text style={styles.goBackText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Loading Screen
    if (!isJoined) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <View style={styles.loadingDot} />
                <Text style={styles.loadingText}>Joining live session...</Text>
                <Text style={styles.loadingSub}>{channelName}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Background Video Layer (Completely Static) */}
            <Pressable style={StyleSheet.absoluteFill} onPress={toggleUI}>
                {role === 'publisher' ? (
                    isScreenSharing ? (
                        <RtcSurfaceView
                            style={styles.fullVideo}
                            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceScreen }}
                        />
                    ) : isCameraOff ? (
                        <View style={[styles.fullVideo, styles.centerContent, { backgroundColor: '#111' }]}>
                            <Ionicons name="videocam-off" size={60} color="#555" />
                            <Text style={styles.waitingText}>Camera is turned off</Text>
                        </View>
                    ) : (
                        <RtcSurfaceView
                            style={styles.fullVideo}
                            canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                        />
                    )
                ) : remoteUid ? (
                    <RtcSurfaceView
                        style={styles.fullVideo}
                        canvas={{ uid: remoteUid }}
                    />
                ) : (
                    <View style={[styles.fullVideo, styles.centerContent]}>
                        <Ionicons name="hourglass-outline" size={50} color="#FFF" />
                        <Text style={styles.waitingText}>Waiting for teacher to start streaming...</Text>
                    </View>
                )}

                {role === 'publisher' && remoteUid && (
                    <View style={styles.pipContainer}>
                        <RtcSurfaceView
                            style={styles.pipVideo}
                            canvas={{ uid: remoteUid }}
                        />
                    </View>
                )}
            </Pressable>

            {/* Foreground UI Layer (Pushed by Keyboard) */}
            {showControls && (
                <KeyboardAvoidingView
                    style={StyleSheet.absoluteFill}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    pointerEvents="box-none"
                >
                    <View style={styles.uiOverlay} pointerEvents="box-none">
                        {/* Top Header */}
                        <View style={styles.topBar}>
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveLabel}>LIVE</Text>
                            </View>
                            <View style={styles.viewerBadge}>
                                <Ionicons name="people" size={14} color="#FFF" />
                                <Text style={styles.viewerValue}>{viewerCount}</Text>
                            </View>
                            <View style={styles.viewerBadge}>
                                <Ionicons name="time-outline" size={14} color="#FFF" />
                                <Text style={styles.viewerValue}>{formatTime(elapsedSeconds)}</Text>
                            </View>
                            <Text style={styles.channelLabel} numberOfLines={1}>{channelName}</Text>
                        </View>

                        <View style={{ flex: 1 }} pointerEvents="none" />

                        {/* Bottom Controls */}
                        <View style={styles.bottomSection} pointerEvents="auto">
                            {/* Chat Display */}
                            <View style={styles.chatArea}>
                                <FlatList
                                    ref={scrollViewRef}
                                    data={messages}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onLongPress={() => handleRemoveStudent(item.uid, item.userName)}
                                            disabled={role !== 'publisher' || item.uid === uid}
                                        >
                                            <View style={styles.messageBubble}>
                                                <Text style={styles.messageUser}>{item.userName}</Text>
                                                <Text style={styles.messageText}>{item.text}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                                    showsVerticalScrollIndicator={false}
                                />
                            </View>

                            <View style={styles.controlsGroup}>
                                {/* Input Area */}
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.chatInput}
                                        placeholder="Say something..."
                                        placeholderTextColor="rgba(255,255,255,0.6)"
                                        value={inputText}
                                        onChangeText={setInputText}
                                        onSubmitEditing={sendMessage}
                                    />
                                    <TouchableOpacity style={styles.sendIcon} onPress={sendMessage}>
                                        <Ionicons name="send" size={24} color={Colors.primary} />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
                                        <Ionicons
                                            name={isLiked ? "heart" : "heart-outline"}
                                            size={28}
                                            color={isLiked ? "#FF4444" : "#FFF"}
                                        />
                                        {likesCount > 0 && <Text style={styles.likeCount}>{likesCount}</Text>}
                                    </TouchableOpacity>
                                </View>

                                {/* Controls Row */}
                                <View style={styles.bottomBar}>
                                    {role === 'publisher' && (
                                        <>
                                            <TouchableOpacity
                                                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                                                onPress={handleToggleMute}
                                            >
                                                <Ionicons
                                                    name={isMuted ? 'mic-off' : 'mic'}
                                                    size={22}
                                                    color="#FFF"
                                                />
                                                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                                                onPress={handleToggleCamera}
                                            >
                                                <Ionicons
                                                    name={isCameraOff ? 'videocam-off' : 'videocam'}
                                                    size={22}
                                                    color="#FFF"
                                                />
                                                <Text style={styles.controlLabel}>{isCameraOff ? 'Camera On' : 'Camera Off'}</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[styles.controlBtn, isScreenSharing && styles.controlBtnActive]}
                                                onPress={handleToggleScreenShare}
                                            >
                                                <Ionicons
                                                    name={isScreenSharing ? 'stop-circle-outline' : 'tv-outline'}
                                                    size={22}
                                                    color="#FFF"
                                                />
                                                <Text style={styles.controlLabel}>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}

                                    <TouchableOpacity
                                        style={styles.endBtn}
                                        onPress={handleEndCall}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    >
                                        <Ionicons name="call" size={28} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    uiOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
    },
    bottomSection: {
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    videoArea: {
        flex: 1,
    },
    fullVideo: {
        flex: 1,
        backgroundColor: '#1A1A2E',
    },
    pipContainer: {
        position: 'absolute',
        bottom: 100,
        right: 15,
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    pipVideo: {
        flex: 1,
    },
    topBar: {
        marginTop: Platform.OS === 'ios' ? 50 : 60, // Adjust for status bar
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 12,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
    },
    liveLabel: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    channelLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    bottomBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
        paddingHorizontal: 20,
        paddingBottom: 20, // Lifted buttons up
    },
    controlBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    controlBtnActive: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: '#FF4444',
    },
    controlLabel: {
        color: '#FFF',
        fontSize: 9,
        marginTop: 2,
    },
    endBtn: {
        backgroundColor: '#FF4444',
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '135deg' }],
        shadowColor: '#FF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    errorText: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 30,
    },
    goBackBtn: {
        marginTop: 25,
        backgroundColor: Colors.primary,
        paddingHorizontal: 30,
        paddingVertical: 14,
        borderRadius: 12,
    },
    goBackText: {
        color: Colors.secondary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF4444',
        marginBottom: 20,
    },
    loadingText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loadingSub: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        marginTop: 8,
    },
    waitingText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 15,
        paddingHorizontal: 30,
    },
    overlayContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: Platform.OS === 'ios' ? 50 : 40, // More space from bottom
    },
    controlsGroup: {
        width: '100%',
    },
    chatArea: {
        height: 180,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    messageBubble: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 16,
        marginBottom: 5,
        maxWidth: '80%',
    },
    messageUser: {
        color: Colors.primary,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    messageText: {
        color: '#FFF',
        fontSize: 14,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 12, // Space between input and buttons
    },
    chatInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.25)',
        height: 52,
        borderRadius: 26,
        paddingHorizontal: 20,
        color: '#FFF',
        fontSize: 15,
    },
    sendIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    likeBtn: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    likeCount: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: -5,
    },
    viewerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
    },
    viewerValue: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
});

export default LiveSession;
