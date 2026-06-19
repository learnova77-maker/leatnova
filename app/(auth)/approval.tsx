import { approvalApi, userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ApprovalScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = React.useRef<ScrollView>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showSubscription = Keyboard.addListener(showEvent, (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const hideSubscription = Keyboard.addListener(hideEvent, () => {
            setKeyboardHeight(0);
        });

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, []);

    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const rotate = useSharedValue(0);
    const pulse = useSharedValue(1);

    const userIdRef = React.useRef<string | null>(null);
    const userDataRef = React.useRef<any>(null);

    const fetchHistory = async (uid: string) => {
        try {
            const res = await approvalApi.getChatHistory(uid);
            if (res.data.success && res.data.messages) {
                const formatted = res.data.messages.map((m: any) => ({
                    ...m,
                    time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'
                }));
                setMessages(prev => {
                    const localSending = prev.filter(m => m.sending);
                    const filteredSending = localSending.filter(ls => !formatted.find((sm: any) => (sm.text && sm.text === ls.text) || (sm.mediaUri && sm.mediaUri === ls.mediaUri)));
                    return [...formatted, ...filteredSending];
                });
                const unreadSupport = formatted.some((m: any) => m.sender === 'support' && !m.read);
                if (unreadSupport) approvalApi.markMessagesRead(uid, 'support');
            }
        } catch (err) { }
    };

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12 });
        opacity.value = withDelay(200, withSpring(1));
        pulse.value = withRepeat(withSequence(withSpring(1.15, { damping: 10 }), withSpring(1, { damping: 10 })), -1, true);
        rotate.value = withRepeat(withSequence(withSpring(0.1, { damping: 10 }), withSpring(-0.1, { damping: 10 })), -1, true);

        const initializeChat = async () => {
            try {
                const userJSON = await AsyncStorage.getItem('user');
                if (userJSON) {
                    const user = JSON.parse(userJSON);
                    setUserData(user);
                    userIdRef.current = user.uid;
                    userDataRef.current = user;
                    await fetchHistory(user.uid);
                }
            } catch (err) {
                console.log('Error initializing chat:', err);
            } finally {
                setIsFetching(false);
            }
        };

        initializeChat();
    }, []);

    // Separate polling effect that uses the ref for stable UID access
    useEffect(() => {
        const pollInterval = setInterval(() => {
            if (userIdRef.current) {
                fetchHistory(userIdRef.current);
            }
        }, 5000);
        return () => clearInterval(pollInterval);
    }, []);

    const sendMessage = async () => {
        const user = userDataRef.current;
        if (message.trim().length === 0 || !user || isSending) return;
        const text = message.trim();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setIsSending(true);
        const tempId = Date.now().toString();
        setMessages(prev => [...prev, { id: tempId, text, sender: 'user', time, sending: true, read: false }]);
        setMessage('');

        try {
            await approvalApi.sendChatMessage({ userId: user.uid, userName: user.fullName, text: text, sender: 'user' });
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sending: false } : m));
            if (messages.length <= 1) {
                setTimeout(async () => {
                    await approvalApi.sendChatMessage({ userId: user.uid, userName: 'Support Team', text: "Welcome to MALTOVERSE! Our team is reviewing your application. You can ask anything here.", sender: 'support' });
                }, 1000);
            }
        } catch (err) {
            Alert.alert('Error', 'Message could not be sent. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    const pickAttachment = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
        if (!result.canceled && result.assets && result.assets[0]) await uploadPickedFile(result.assets[0]);
    };

    const uploadPickedFile = async (asset: any) => {
        const user = userDataRef.current;
        if (!user) return;
        const tempId = Date.now().toString();
        setIsSending(true);
        setMessages(prev => [...prev, { id: tempId, mediaUri: asset.uri, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sending: true, read: false }]);
        try {
            const formData = new FormData();
            const uriParts = asset.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            formData.append('file', { uri: asset.uri, name: `chat_${tempId}.${fileType}`, type: `image/${fileType}` } as any);
            formData.append('userId', user.uid);
            const res = await userApi.uploadFile(formData);
            if (res.data.success) {
                await approvalApi.sendChatMessage({ userId: user.uid, userName: user.fullName, mediaUri: res.data.url, mediaType: 'image', sender: 'user' });
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sending: false, mediaUri: res.data.url } : m));
            }
        } catch (err) {
            Alert.alert('Error', 'Image could not be uploaded. Please try again.');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <Animated.View style={[{ flex: 1, paddingBottom: keyboardHeight }]}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/login')}>
                            <Ionicons name="arrow-back-outline" size={24} color="#00AEEF" />
                        </TouchableOpacity>
                        <View style={styles.headerText}>
                            <Text style={styles.headerStatus}>• STATUS: CHECKING ACCOUNT</Text>
                            <Text style={[styles.headerTitle, { color: '#1A1A1A' }]}>Verification Support</Text>
                        </View>
                    </View>

                    <View style={styles.chatContainer}>
                        <View style={styles.chatHeader}>
                            <View style={styles.supportInfo}>
                                <View style={styles.onlineDot} />
                                <Text style={styles.supportLabel}>SUPPORT TEAM ONLINE</Text>
                            </View>
                        </View>

                        <ScrollView
                            ref={scrollRef}
                            style={styles.messageGrid}
                            contentContainerStyle={styles.messageContent}
                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                        >
                            {isFetching ? (
                                <View style={styles.loadingBox}>
                                    <ActivityIndicator color="#00AEEF" />
                                    <Text style={styles.loadingText}>LOADING MESSAGES...</Text>
                                </View>
                            ) : (
                                <>
                                    {messages.length === 0 && (
                                        <View style={styles.emptyGrid}>
                                            <Ionicons name="chatbubble-ellipses-outline" size={40} color="rgba(0,174,239,0.2)" />
                                            <Text style={styles.emptyText}>CHAT IS READY. SEND A MESSAGE TO START.</Text>
                                        </View>
                                    )}
                                    {messages.map((msg: any) => (
                                        <View key={msg.id} style={[styles.msgWrapper, msg.sender === 'user' ? styles.userRow : styles.supportRow]}>
                                            <View style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.supportBubble]}>
                                                {msg.mediaUri && (
                                                    <View style={styles.mediaFrame}>
                                                        <Image source={{ uri: msg.mediaUri }} style={styles.mediaImg} resizeMode="cover" />
                                                        {msg.sending && <View style={styles.mediaOverlay}><ActivityIndicator size="small" color="#FFF" /></View>}
                                                    </View>
                                                )}
                                                {msg.text && (
                                                    <Text style={[styles.msgText, msg.sender === 'user' ? { color: '#FFF' } : { color: '#1A1A1A' }]}>
                                                        {msg.text}
                                                    </Text>
                                                )}
                                                <View style={styles.msgMeta}>
                                                    <Text style={[styles.msgTime, msg.sender === 'user' ? { color: 'rgba(255,255,255,0.7)' } : { color: 'rgba(0,0,0,0.4)' }]}>{msg.time}</Text>
                                                    {msg.sender === 'user' && (
                                                        <Ionicons
                                                            name={msg.sending ? "time-outline" : ((msg.read === true || msg.read === 'true') ? "checkmark-done" : "checkmark")}
                                                            size={12}
                                                            color={(msg.read === true || msg.read === 'true') ? "#28A745" : "rgba(255,255,255,0.6)"}
                                                        />
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.inputDock}>
                            <TouchableOpacity style={styles.attachBtn} onPress={pickAttachment}>
                                <Ionicons name="attach-outline" size={24} color="#00AEEF" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.inputField}
                                placeholder="Type a message..."
                                placeholderTextColor="#AAA"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, (!message.trim() && !isSending) && { opacity: 0.5 }]}
                                onPress={sendMessage}
                                disabled={!message.trim() || isSending}
                            >
                                {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 10 : 30, paddingBottom: 15, gap: 16 },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0,174,239,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)' },
    headerText: { flex: 1 },
    headerStatus: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 1.5, marginBottom: 4 },
    headerTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
    chatContainer: { flex: 1, marginHorizontal: 20, marginBottom: 20, backgroundColor: '#F8F9FA', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
    chatHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,174,239,0.1)', backgroundColor: '#FFFFFF' },
    supportInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00AEEF' },
    supportLabel: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 1 },
    messageGrid: { flex: 1 },
    messageContent: { padding: 20, gap: 12 },
    loadingBox: { padding: 40, alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 9, fontWeight: '900', color: '#666', letterSpacing: 1 },
    emptyGrid: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
    emptyText: { fontSize: 9, fontWeight: '900', color: '#999', textAlign: 'center', lineHeight: 16, letterSpacing: 1 },
    msgWrapper: { flexDirection: 'row', marginBottom: 4 },
    userRow: { justifyContent: 'flex-end' },
    supportRow: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '85%', borderRadius: 16, padding: 12 },
    userBubble: { backgroundColor: '#00AEEF', borderBottomRightRadius: 4, elevation: 2, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
    supportBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
    msgText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
    msgMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4, marginTop: 4 },
    msgTime: { fontSize: 8, fontWeight: '900' },
    mediaFrame: { width: 220, height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: '#F0F0F0' },
    mediaImg: { width: '100%', height: '100%' },
    mediaOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    inputDock: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(0,174,239,0.1)', backgroundColor: '#FFFFFF' },
    attachBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    inputField: { flex: 1, minHeight: 48, maxHeight: 100, backgroundColor: '#F8F9FA', borderRadius: 24, paddingHorizontal: 20, fontSize: 13, color: '#1A1A1A', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00AEEF', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5 },
});
