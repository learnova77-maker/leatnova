import LiveSession from '@/components/live/LiveSession';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { liveApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function TeacherLive() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [isLive, setIsLive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Live Session Data
    const [liveData, setLiveData] = useState<{
        appId: string;
        token: string;
        channelName: string;
        uid: number;
        sessionId: string;
    } | null>(null);

    const handleGoLive = async () => {
        if (!roomName.trim()) {
            Alert.alert('Required', 'Please enter a room name for the class.');
            return;
        }

        setIsLoading(true);
        try {
            const userDataStr = await AsyncStorage.getItem('user');
            if (!userDataStr) throw new Error('User not logged in');
            const user = JSON.parse(userDataStr);
            const uid = Math.floor(Math.random() * 1000000); // Random integer UID

            // 1. Get Agora Token
            const tokenRes = await liveApi.getToken({
                channelName: roomName.trim(),
                uid,
                role: 'publisher'
            });

            if (!tokenRes.data.success) throw new Error('Token generation failed');

            const { token, appId } = tokenRes.data;

            // 2. Register session in DB
            const sessionRes = await liveApi.startSession({
                channelName: roomName.trim(),
                teacherId: user.uid,
                teacherName: user.fullName,
                title: roomName.trim()
            });

            if (!sessionRes.data.success) throw new Error('Session registration failed');

            setLiveData({
                appId,
                token,
                channelName: roomName.trim(),
                uid,
                sessionId: sessionRes.data.session.id
            });
            setIsLive(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to start live class.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndLive = async () => {
        if (liveData?.sessionId) {
            await liveApi.endSession(liveData.sessionId);
        }
        setIsLive(false);
        setLiveData(null);
    };

    if (isLive && liveData) {
        return (
            <LiveSession
                appId={liveData.appId}
                channelName={liveData.channelName}
                token={liveData.token}
                uid={liveData.uid}
                role="publisher"
                onEnd={handleEndLive}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Go Live" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.promoCard}>
                        <View style={styles.liveBadgeIcon}>
                            <Ionicons name="videocam" size={40} color={Colors.white} />
                        </View>
                        <Text style={styles.promoTitle}>Start Real-time Class</Text>
                        <Text style={styles.promoSub}>Live streaming with high-quality audio and video for up to 1,000 students.</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.label}>What's the class title?</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. English Grammar Session 1"
                            value={roomName}
                            onChangeText={setRoomName}
                            editable={!isLoading}
                        />

                        <TouchableOpacity
                            style={[styles.liveBtn, isLoading && { opacity: 0.7 }]}
                            onPress={handleGoLive}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.secondary} />
                            ) : (
                                <>
                                    <View style={styles.dot} />
                                    <Text style={styles.liveBtnText}>Go Live Now</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tipCard}>
                        <Ionicons name="people-circle" size={24} color={Colors.primary} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tipTitle}>How Students Join?</Text>
                            <Text style={styles.tipText}>Students open Learnova App → Live Classes → Your session will appear automatically → They tap "Join Now"</Text>
                        </View>
                    </View>

                    {roomName.trim() !== '' && (
                        <TouchableOpacity
                            style={styles.shareBtn}
                            onPress={async () => {
                                try {
                                    await Share.share({
                                        message: `🎓 Join my live class "${roomName}" on Learnova!\n\nOpen Learnova App → Live Classes → Tap "Join Now"`,
                                    });
                                } catch (err) {
                                    console.log(err);
                                }
                            }}
                        >
                            <Ionicons name="share-social" size={20} color={Colors.white} />
                            <Text style={styles.shareBtnText}>Share Class Invite</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.infoCard}>
                        <Ionicons name="information-circle" size={20} color={Colors.grey} />
                        <Text style={styles.infoText}>Students will see your live session and can join instantly from their app.</Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    content: { padding: 24, gap: 20 },
    promoCard: { backgroundColor: Colors.secondary, padding: 30, borderRadius: 28, alignItems: 'center' },
    liveBadgeIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    promoTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.white, marginBottom: 10 },
    promoSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 22 },
    formCard: { backgroundColor: '#FFF', padding: 25, borderRadius: 28, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 10 },
    label: { fontSize: 16, fontWeight: '600', color: Colors.secondary, marginBottom: 15 },
    input: { backgroundColor: '#F9FAFB', borderRadius: 16, height: 60, paddingHorizontal: 20, fontSize: 16, borderWidth: 1, borderColor: '#EEE', marginBottom: 25 },
    liveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, height: 65, borderRadius: 18, gap: 12 },
    liveBtnText: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary },
    dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444' },
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginTop: 10 },
    infoText: { fontSize: 12, color: Colors.grey, flex: 1 },
    tipCard: { flexDirection: 'row', backgroundColor: '#FFF', padding: 20, borderRadius: 20, gap: 15, alignItems: 'flex-start', borderWidth: 1, borderColor: '#F0F0F0' },
    tipTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.secondary, marginBottom: 4 },
    tipText: { fontSize: 12, color: Colors.grey, lineHeight: 18 },
    shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.secondary, height: 55, borderRadius: 16, gap: 10 },
    shareBtnText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
});
