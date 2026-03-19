import { Colors } from '@/constants/theme';
import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { get, onChildAdded, onValue, push, ref, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
                if (role === 'subscriber') {
                    const removalRef = ref(rtdb, `live_sessions/${sessionId}/removals/${uid}`);
                    const unsubRemoval = onValue(removalRef, (snapshot) => {
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
                    setMessages((prev) => [...prev, newMsg]);
                });

                // Listen for Likes
                const likesRef = ref(rtdb, `live_sessions/${sessionId}/likes`);
                const unsubLikes = onValue(likesRef, (snapshot) => {
                    if (snapshot.exists()) {
                        setLikesCount(snapshot.val());
                    }
                });

            } catch (err: any) {
                console.error('Engine init error:', err);
                setError(err.message || 'Failed to initialize live streaming engine.');
            }
        };

        initEngine();

        // Firebase cleanup
        return () => {
            const engine = engineRef.current;
            if (engine) {
                engine.leaveChannel();
                engine.release();
                engineRef.current = null;
            }
            // Detach listeners
            const chatRef = ref(rtdb, `live_chats/${sessionId}`);
            const likesRef = ref(rtdb, `live_sessions/${sessionId}/likes`);
            const removalRef = ref(rtdb, `live_sessions/${sessionId}/removals/${uid}`);
            // Note: off() is for older SDK, in v9 we use the return from onValue/onChildAdded
        };
    }, []);

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
            engine.muteLocalVideoStream(!isCameraOff);
            setIsCameraOff(!isCameraOff);
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
        if (isLiked) return;
        setIsLiked(true);
        const likesRef = ref(rtdb, `live_sessions/${sessionId}/likes`);
        const snapshot = await get(likesRef);
        const currentLikes = snapshot.exists() ? snapshot.val() : 0;
        await set(likesRef, currentLikes + 1);
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
            {/* Main Video Area */}
            <View style={styles.videoArea}>
                {role === 'publisher' ? (
                    // Teacher sees their own camera
                    <RtcSurfaceView
                        style={styles.fullVideo}
                        canvas={{ uid: 0, sourceType: VideoSourceType.VideoSourceCamera }}
                    />
                ) : remoteUid ? (
                    // Student sees teacher's stream
                    <RtcSurfaceView
                        style={styles.fullVideo}
                        canvas={{ uid: remoteUid }}
                    />
                ) : (
                    // Student waiting for teacher
                    <View style={[styles.fullVideo, styles.centerContent]}>
                        <Ionicons name="hourglass-outline" size={50} color="#FFF" />
                        <Text style={styles.waitingText}>Waiting for teacher to start streaming...</Text>
                    </View>
                )}

                {/* Small preview for teacher (picture-in-picture) */}
                {role === 'publisher' && remoteUid && (
                    <View style={styles.pipContainer}>
                        <RtcSurfaceView
                            style={styles.pipVideo}
                            canvas={{ uid: remoteUid }}
                        />
                    </View>
                )}
            </View>

            {/* Top Header */}
            <View style={styles.topBar}>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveLabel}>LIVE</Text>
                </View>
                <Text style={styles.channelLabel}>{channelName}</Text>
            </View>

            {/* Bottom Controls */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.overlayContainer}
            >
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
                            </>
                        )}

                        <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
                            <Ionicons name="call" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
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
        marginTop: 10,
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
        backgroundColor: 'rgba(255,68,68,0.7)',
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
        paddingBottom: 30,
    },
    controlsGroup: {
        width: '100%',
    },
    chatArea: {
        height: 200,
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    messageBubble: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        marginBottom: 5,
        maxWidth: '80%',
    },
    messageUser: {
        color: Colors.primary,
        fontSize: 11,
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
        marginBottom: 5,
    },
    chatInput: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 20,
        color: '#FFF',
        fontSize: 14,
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
});

export default LiveSession;
