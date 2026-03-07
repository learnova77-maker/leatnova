import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    role: 'publisher' | 'subscriber';
    onEnd: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ appId, channelName, token, uid, role, onEnd }) => {
    const engineRef = useRef<IRtcEngine | null>(null);
    const [isJoined, setIsJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            } catch (err: any) {
                console.error('Engine init error:', err);
                setError(err.message || 'Failed to initialize live streaming engine.');
            }
        };

        initEngine();

        // Cleanup on unmount
        return () => {
            const engine = engineRef.current;
            if (engine) {
                engine.leaveChannel();
                engine.release();
                engineRef.current = null;
            }
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
            <View style={styles.bottomBar}>
                {role === 'publisher' && (
                    <>
                        <TouchableOpacity
                            style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                            onPress={handleToggleMute}
                        >
                            <Ionicons
                                name={isMuted ? 'mic-off' : 'mic'}
                                size={24}
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
                                size={24}
                                color="#FFF"
                            />
                            <Text style={styles.controlLabel}>{isCameraOff ? 'Camera On' : 'Camera Off'}</Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
                    <Ionicons name="call" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>
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
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        paddingHorizontal: 20,
    },
    controlBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlBtnActive: {
        backgroundColor: 'rgba(255,68,68,0.6)',
    },
    controlLabel: {
        color: '#FFF',
        fontSize: 9,
        marginTop: 2,
    },
    endBtn: {
        backgroundColor: '#FF4444',
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: '135deg' }],
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
});

export default LiveSession;
