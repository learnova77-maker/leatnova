import { liveSupportApi, userApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { ref as dbRef, onValue } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'support';
    userName: string;
    mediaUri?: string;
    mediaType?: string;
    createdAt: number;
    read: boolean;
}

export default function SupportChat() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);
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

    useEffect(() => {
        const init = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const u = JSON.parse(userData);
                setUser(u);

                // Real-time listener for support chat
                const chatPath = `support_chats/${u.uid}`;
                const chatReference = dbRef(rtdb, chatPath);

                onValue(chatReference, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        const msgList = Object.keys(data).map(key => ({
                            id: key,
                            ...data[key]
                        })).sort((a, b) => a.createdAt - b.createdAt);
                        setMessages(msgList);

                        // Mark as read after a short delay
                        liveSupportApi.markMessagesRead(u.uid, 'support');
                    }
                    setIsLoading(false);
                });
            }
        };
        init();
    }, []);

    const sendMessage = async (mediaUri?: string, mediaType?: string) => {
        if ((!inputText.trim() && !mediaUri) || !user || isSending) return;

        setIsSending(true);
        try {
            await liveSupportApi.sendChatMessage({
                userId: user.uid,
                userName: user.fullName || 'User',
                text: inputText.trim(),
                sender: 'user',
                mediaUri,
                mediaType
            });
            setInputText('');
        } catch (error) {
            console.error('Send Error:', error);
        } finally {
            setIsSending(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0].uri) {
            // In a real app, you'd upload this to Firebase Storage first
            // For now, we'll try to use the userApi.uploadFile if available
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: result.assets[0].uri,
                    name: 'support_media.jpg',
                    type: 'image/jpeg'
                } as any);
                formData.append('userId', user.uid);

                const uploadResp = await userApi.uploadFile(formData);
                if (uploadResp.data.success) {
                    sendMessage(uploadResp.data.url, 'image');
                }
            } catch (e) {
                console.error('Upload error', e);
            }
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageWrapper, isUser ? styles.userWrapper : styles.supportWrapper]}>
                {!isUser && (
                    <View style={styles.supportAvatar}>
                        <Ionicons name="headset" size={14} color="#00AEEF" />
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isUser ?
                        [styles.userBubble, { backgroundColor: '#00AEEF' }] :
                        [styles.supportBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]
                ]}>
                    {item.mediaUri && (
                        <Image source={{ uri: item.mediaUri }} style={styles.mediaImage} resizeMode="cover" />
                    )}
                    {item.text ? <Text style={[styles.messageText, { color: isUser ? '#000' : colors.text }]}>{item.text}</Text> : null}
                    <Text style={[styles.messageTime, { color: isUser ? 'rgba(0,0,0,0.5)' : colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Animated.View style={[{ flex: 1, backgroundColor: colors.background, paddingBottom: keyboardHeight }]}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>LIVE SUPPORT</Text>
                        <View style={styles.statusRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.statusText}>TEAM ONLINE</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.headerAction}>
                        <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                    {isLoading ? (
                        <View style={styles.center}>
                            <ActivityIndicator size="large" color="#00AEEF" />
                            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>CONNECTING...</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id}
                            renderItem={renderMessage}
                            contentContainerStyle={styles.listContent}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="chatbubbles-outline" size={80} color={isDark ? 'rgba(0,174,239,0.1)' : '#EEE'} />
                                    <Text style={[styles.emptyTitle, { color: colors.text }]}>How can we assist you?</Text>
                                    <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Our support team typically responds in minutes during active hours.</Text>
                                </View>
                            }
                        />
                    )}

                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                        <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
                            <Ionicons name="add-circle-outline" size={28} color="#00AEEF" />
                        </TouchableOpacity>
                        <TextInput
                            style={[styles.input, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9' }]}
                            placeholder="Type a message..."
                            placeholderTextColor={colors.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#00AEEF' : 'rgba(0,174,239,0.3)' }]}
                            onPress={() => sendMessage()}
                            disabled={!inputText.trim() || isSending}
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#000" />
                            ) : (
                                <Ionicons name="send" size={20} color="#000" />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    backBtn: { padding: 4 },
    headerInfo: { flex: 1, marginLeft: 15 },
    headerTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80', marginRight: 6 },
    statusText: { fontSize: 9, color: '#4ADE80', fontWeight: 'bold', letterSpacing: 0.5 },
    headerAction: { padding: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    listContent: { padding: 20, paddingBottom: 10 },
    messageWrapper: { marginBottom: 15, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end' },
    userWrapper: { alignSelf: 'flex-end' },
    supportWrapper: { alignSelf: 'flex-start' },
    supportAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,174,239,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
    messageBubble: { padding: 12, borderRadius: 18 },
    userBubble: { borderBottomRightRadius: 4 },
    supportBubble: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 20 },
    messageTime: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end', fontWeight: 'bold' },
    mediaImage: { width: 200, height: 200, borderRadius: 12, marginBottom: 8 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 15 : 12, borderTopWidth: 1 },
    attachBtn: { marginRight: 10 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 20 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 10, paddingHorizontal: 40, opacity: 0.7 },
});
