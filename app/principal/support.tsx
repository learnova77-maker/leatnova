import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { liveSupportApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { rtdb } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import { ref as dbRef, onValue } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web' || width > 768;

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'support';
    userName: string;
    createdAt: number;
    read: boolean;
}

interface ChatSession {
    userId: string;
    userName: string;
    lastMessage: string;
    lastTimestamp: number;
    unreadCount: number;
}

export default function PrincipalSupport() {
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    // Load available chat sessions
    useEffect(() => {
        const sessionsRef = dbRef(rtdb, 'support_chats');

        const unsubscribe = onValue(sessionsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const sessionList: ChatSession[] = Object.keys(data).map(uid => {
                    const userMessages = Object.values(data[uid]) as any[];
                    userMessages.sort((a, b) => b.createdAt - a.createdAt);

                    const lastMsg = userMessages[0];
                    const unreadCount = userMessages.filter(m => m.sender === 'user' && !m.read).length;

                    return {
                        userId: uid,
                        userName: lastMsg.userName || 'Unknown User',
                        lastMessage: lastMsg.text || 'Media Message',
                        lastTimestamp: lastMsg.createdAt,
                        unreadCount
                    };
                }).sort((a, b) => b.lastTimestamp - a.lastTimestamp);

                setSessions(sessionList);
            } else {
                setSessions([]);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Load messages for selected user
    useEffect(() => {
        if (!selectedUserId) return;

        const chatReference = dbRef(rtdb, `support_chats/${selectedUserId}`);
        const unsubscribe = onValue(chatReference, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const msgList = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                })).sort((a, b) => a.createdAt - b.createdAt);
                setMessages(msgList);

                // Mark as read by support
                liveSupportApi.markMessagesRead(selectedUserId, 'user');
            }
        });

        return () => unsubscribe();
    }, [selectedUserId]);

    const sendMessage = async () => {
        if (!inputText.trim() || !selectedUserId || isSending) return;

        setIsSending(true);
        try {
            await liveSupportApi.sendChatMessage({
                userId: selectedUserId,
                userName: 'Learnova Support',
                text: inputText.trim(),
                sender: 'support'
            });
            setInputText('');
        } catch (error) {
            console.error('Send Error:', error);
        } finally {
            setIsSending(false);
        }
    };

    const renderSessionItem = ({ item }: { item: ChatSession }) => {
        const isSelected = selectedUserId === item.userId;
        const lastTime = new Date(item.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                style={[
                    styles.sessionItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: isDark ? 'rgba(0,174,239,0.1)' : 'rgba(0,174,239,0.05)' }
                ]}
                onPress={() => setSelectedUserId(item.userId)}
            >
                <View style={[styles.sessionAvatar, { backgroundColor: isDark ? '#333' : '#EEE' }]}>
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{item.userName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.sessionHeaderRow}>
                        <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>{item.userName}</Text>
                        <Text style={[styles.sessionTime, { color: colors.textSecondary }]}>{lastTime}</Text>
                    </View>
                    <Text style={[styles.sessionMsg, { color: colors.textSecondary }]} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                {item.unreadCount > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.unreadText}>{item.unreadCount}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isSupport = item.sender === 'support';
        return (
            <View style={[styles.messageWrapper, isSupport ? styles.userWrapper : styles.supportWrapper]}>
                <View style={[
                    styles.messageBubble,
                    isSupport ?
                        [styles.userBubble, { backgroundColor: colors.primary }] :
                        [styles.supportBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F0' }]
                ]}>
                    <Text style={[styles.messageText, { color: isSupport ? '#FFF' : colors.text }]}>{item.text}</Text>
                    <Text style={[styles.messageTime, { color: isSupport ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <AppSidebar role="school" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(false)} />
            <View style={styles.mainContent}>
                <AppHeader toggleSidebar={() => setIsSidebarOpen(true)} title="Support Inbox" role="school" />

                <View style={[styles.dashboardContainer, IS_WEB && styles.webDashboard]}>
                    {/* Inbox Sidebar (Users List) */}
                    {(!selectedUserId || IS_WEB) && (
                        <View style={[styles.inboxSidebar, IS_WEB && styles.webSidebar, { borderRightColor: colors.border }]}>
                            <View style={styles.inboxHeader}>
                                <Text style={[styles.inboxTitle, { color: colors.text }]}>MESSAGES</Text>
                            </View>
                            {isLoading ? (
                                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                            ) : (
                                <FlatList
                                    data={sessions}
                                    keyExtractor={item => item.userId}
                                    renderItem={renderSessionItem}
                                    ListEmptyComponent={
                                        <View style={styles.center}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>NO ACTIVE CHATS</Text>
                                        </View>
                                    }
                                />
                            )}
                        </View>
                    )}

                    {/* Chat Area */}
                    {(selectedUserId || IS_WEB) && (
                        <View style={styles.chatArea}>
                            {selectedUserId ? (
                                <KeyboardAvoidingView
                                    style={{ flex: 1 }}
                                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                                >
                                    <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
                                        {!IS_WEB && (
                                            <TouchableOpacity onPress={() => setSelectedUserId(null)} style={{ marginRight: 15 }}>
                                                <Ionicons name="arrow-back" size={24} color={colors.text} />
                                            </TouchableOpacity>
                                        )}
                                        <Text style={[styles.activeChatName, { color: colors.text }]}>
                                            {sessions.find(s => s.userId === selectedUserId)?.userName || 'Chat'}
                                        </Text>
                                    </View>

                                    <FlatList
                                        ref={flatListRef}
                                        data={messages}
                                        keyExtractor={item => item.id}
                                        renderItem={renderMessage}
                                        contentContainerStyle={styles.listContent}
                                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                                    />

                                    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9F9F9' }]}
                                            placeholder="Write a reply..."
                                            placeholderTextColor={colors.textSecondary}
                                            value={inputText}
                                            onChangeText={setInputText}
                                            multiline
                                        />
                                        <TouchableOpacity
                                            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.primary : 'rgba(0,174,239,0.3)' }]}
                                            onPress={sendMessage}
                                            disabled={!inputText.trim() || isSending}
                                        >
                                            <Ionicons name="send" size={20} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                </KeyboardAvoidingView>
                            ) : (
                                <View style={styles.center}>
                                    <Ionicons name="chatbubbles-outline" size={80} color={isDark ? 'rgba(255,255,255,0.05)' : '#EEE'} />
                                    <Text style={{ color: colors.textSecondary, marginTop: 15, fontWeight: 'bold' }}>SELECT A CONVERSATION TO START SERVICE</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mainContent: { flex: 1 },
    dashboardContainer: { flex: 1, flexDirection: 'row' },
    webDashboard: { paddingHorizontal: 20, paddingBottom: 20 },
    inboxSidebar: { flex: 1, backgroundColor: 'transparent' },
    webSidebar: { maxWidth: 350, borderRightWidth: 1 },
    inboxHeader: { padding: 20, borderBottomWidth: 0 },
    inboxTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    sessionItem: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1 },
    sessionAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    sessionName: { fontWeight: 'bold', fontSize: 15, flex: 1 },
    sessionTime: { fontSize: 10, marginLeft: 10 },
    sessionMsg: { fontSize: 13 },
    unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10, paddingHorizontal: 6 },
    unreadText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
    chatArea: { flex: 2 },
    chatHeader: { padding: 15, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
    activeChatName: { fontWeight: 'bold', fontSize: 18 },
    listContent: { padding: 20 },
    messageWrapper: { marginBottom: 15, maxWidth: '80%' },
    userWrapper: { alignSelf: 'flex-end' },
    supportWrapper: { alignSelf: 'flex-start' },
    messageBubble: { padding: 12, borderRadius: 18 },
    userBubble: { borderBottomRightRadius: 4 },
    supportBubble: { borderBottomLeftRadius: 4 },
    messageText: { fontSize: 14, lineHeight: 20 },
    messageTime: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, borderTopWidth: 1 },
    input: { flex: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});
