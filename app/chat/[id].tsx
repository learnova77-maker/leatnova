import { chatApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { off, onValue, ref } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
    const { id: targetId, name: targetName } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isTargetOnline, setIsTargetOnline] = useState(false);

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
        let chatRef: any = null;

        const setup = async () => {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setCurrentUser(user);

                // Mark messages as read upon entering chat
                try {
                    await chatApi.markMessagesRead(user.uid, targetId as string);
                } catch (e) { }

                const chatId = [user.uid, targetId].sort().join('_');
                chatRef = ref(rtdb, `chats/${chatId}/messages`);

                onValue(chatRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.val();
                        // Put newest messages first for inverted list
                        const msgs = Object.keys(data).map(key => ({ id: key, ...data[key] }))
                            .sort((a, b) => b.createdAt - a.createdAt);
                        setMessages(msgs);

                        // Also mark newly arrived messages as read implicitly while active
                        try {
                            chatApi.markMessagesRead(user.uid, targetId as string);
                        } catch (e) { }
                    } else {
                        setMessages([]);
                    }
                });
            }
        };

        setup();

        // Listen for target user presence
        const presenceRef = ref(rtdb, `presence/${targetId}`);
        const unsubPresence = onValue(presenceRef, (snap) => {
            setIsTargetOnline(!!snap.val());
        });

        return () => {
            if (chatRef) {
                off(chatRef);
            }
            off(presenceRef);
        };
    }, [targetId]);

    const handleSend = async () => {
        if (!text.trim() || !currentUser) return;
        const msgText = text.trim();
        setText('');
        try {
            await chatApi.sendMessage({
                senderId: currentUser.uid,
                senderName: currentUser.fullName,
                receiverId: targetId as string,
                receiverName: targetName as string || 'User',
                text: msgText
            });
        } catch (e) {
            console.error('Error sending message:', e);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isMe = item.senderId === currentUser?.uid;
        return (
            <View style={[styles.messageWrapper, isMe ? styles.userWrapper : styles.supportWrapper]}>
                {!isMe && (
                    <View style={styles.supportAvatar}>
                        <Text style={{ color: '#00AEEF', fontWeight: 'bold', fontSize: 10 }}>{String(item.senderName || 'U').charAt(0)}</Text>
                    </View>
                )}
                <View style={[
                    styles.messageBubble,
                    isMe ?
                        [styles.userBubble, { backgroundColor: '#00AEEF' }] :
                        [styles.supportBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]
                ]}>
                    <Text style={[styles.messageText, { color: isMe ? '#000' : colors.text }]}>{item.text}</Text>
                    <View style={styles.timeSeenRow}>
                        <Text style={[styles.messageTime, { color: isMe ? 'rgba(0,0,0,0.5)' : colors.textSecondary }]}>
                            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        {isMe && (
                            <Ionicons
                                name={item.read ? 'checkmark-done' : 'checkmark'}
                                size={14}
                                color={item.read ? '#0066FF' : 'rgba(0,0,0,0.4)'}
                                style={{ marginLeft: 4 }}
                            />
                        )}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <Animated.View style={[{ flex: 1, backgroundColor: colors.background, paddingBottom: keyboardHeight }]}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>{targetName?.toString().toUpperCase() || 'USER'}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerAction}
                        onPress={() => router.push(`/social/profile?userId=${targetId}` as any)}
                    >
                        <Ionicons name="person-circle-outline" size={28} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    inverted
                    contentContainerStyle={styles.listContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                />

                {/* Input Area */}
                <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => { }}>
                        <Ionicons name="add-circle-outline" size={28} color="#00AEEF" />
                    </TouchableOpacity>
                    <TextInput
                        style={[styles.input, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9' }]}
                        placeholder="Type a message..."
                        placeholderTextColor={colors.textSecondary}
                        value={text}
                        onChangeText={setText}
                        onSubmitEditing={handleSend}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { backgroundColor: text.trim() ? '#00AEEF' : 'rgba(0,174,239,0.3)' }]}
                        onPress={handleSend}
                        disabled={!text.trim()}
                    >
                        <Ionicons name="send" size={20} color="#000" />
                    </TouchableOpacity>
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
    headerAction: { padding: 4 },
    listContent: { padding: 20, paddingBottom: 10 },
    messageWrapper: { marginBottom: 15, maxWidth: '85%', flexDirection: 'row', alignItems: 'flex-end' },
    userWrapper: { alignSelf: 'flex-end' },
    supportWrapper: { alignSelf: 'flex-start' },
    supportAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,174,239,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
    messageBubble: { padding: 12, borderRadius: 18 },
    userBubble: { borderBottomRightRadius: 4 },
    supportBubble: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, lineHeight: 20 },
    timeSeenRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4 },
    messageTime: { fontSize: 9, fontWeight: 'bold' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 15 : 12, borderTopWidth: 1 },
    attachBtn: { marginRight: 10 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, maxHeight: 100, fontSize: 15 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
