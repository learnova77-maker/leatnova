import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import CustomVideoPlayer from '@/components/social/CustomVideoPlayer';
import MarkdownText from '@/components/social/MarkdownText';
import { socialApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface Comment { id: string; userId: string; userName: string; text: string; createdAt: number; }
interface Post { id: string; userId: string; userName: string; text: string; mediaUri?: string; mediaType?: 'image' | 'video' | 'document'; fileName?: string; likesCount: number; commentsCount: number; createdAt: number; likes?: Record<string, boolean>; comments?: Record<string, Comment>; }
interface Notification { id: string; type: 'like' | 'comment'; postId: string; senderId: string; senderName: string; text?: string; createdAt: number; read: boolean; }

export default function TeacherSocial() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);

    const [posts, setPosts] = useState<Post[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [filterByMe, setFilterByMe] = useState(false);

    const [newPostText, setNewPostText] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [inlineCommentState, setInlineCommentState] = useState<Record<string, string>>({});
    const [reportType, setReportType] = useState('Spam');
    const [reportDesc, setReportDesc] = useState('');

    // Auto-play tracking
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setVisiblePostId(viewableItems[0].item.id);
        }
    }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    useEffect(() => { loadData(); }, []);

    const formatPostDate = (timestamp: number) => {
        if (!timestamp) return 'Recently';
        const now = Date.now();
        const diffInHours = (now - timestamp) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            if (diffInHours < 1) return 'Just now';
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            const d = new Date(timestamp);
            return d.toLocaleDateString();
        }
    };

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setCurrentUser(parsed);
                loadNotifications(parsed.uid);
            }
            const response = await socialApi.getPosts();
            if (response.data.success) setPosts(response.data.posts);
        } catch (err) { console.error('Error:', err); } finally { setIsLoading(false); }
    };

    const loadNotifications = async (userId: string) => {
        try {
            const response = await socialApi.getNotifications(userId);
            if (response.data.success) setNotifications(response.data.notifications);
        } catch (err) { }
    };

    const pickMedia = async (type: 'image' | 'video') => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return Alert.alert('Permission Denied', 'Gallery access is required.');

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            quality: 1,
        });

        if (!result.canceled) {
            setSelectedMedia({ uri: result.assets[0].uri, type });
        }
    };

    const handleAddPost = async () => {
        if (!newPostText.trim() && !selectedMedia) return;
        if (!currentUser || isPosting) return;
        setIsPosting(true);
        try {
            const response = await socialApi.createPost({
                userId: currentUser.uid,
                userName: currentUser.fullName,
                text: newPostText.trim(),
                mediaUri: selectedMedia?.uri,
                mediaType: selectedMedia?.type
            });
            if (response.data.success) {
                setNewPostText('');
                setSelectedMedia(null);
                setIsModalVisible(false);
                loadData();
            }
        } catch (err) { Alert.alert('Error', 'Failed to share.'); } finally { setIsPosting(false); }
    };

    const handleDeletePost = (postId: string) => {
        setIsOptionsMenuVisible(false);
        Alert.alert("Delete Post", "Are you sure?", [
            { text: "Cancel" },
            { text: "Delete", style: "destructive", onPress: async () => { try { await socialApi.deletePost(postId); loadData(); } catch (e) { Alert.alert("Error", "Failed to delete."); } } }
        ]);
    };

    const handleReportPost = async () => {
        if (!selectedPost || !currentUser) return;
        try {
            const resp = await socialApi.reportPost({ postId: selectedPost.id, userId: currentUser.uid, userName: currentUser.fullName, reportType, description: reportDesc });
            if (resp.data.success) { Alert.alert("Success", "Report submitted."); setIsReportModalVisible(false); setReportDesc(''); }
        } catch (e) { Alert.alert("Error", "Failed to report."); }
    };

    const handleSharePost = async (post: Post) => {
        try {
            const message = `${post.userName} on Learnova:\n\n${post.text || 'Look at this!'}`;
            await Share.share({ message });
        } catch (e) { }
    };

    const handleLikePost = async (postId: string) => {
        if (!currentUser) return;
        try { const resp = await socialApi.likePost({ postId, userId: currentUser.uid, userName: currentUser.fullName }); if (resp.data.success) loadData(); } catch (e) { }
    };

    const handleInlineComment = async (postId: string) => {
        const text = inlineCommentState[postId];
        if (!text?.trim() || !currentUser) return;
        try {
            const resp = await socialApi.commentPost({ postId, userId: currentUser.uid, userName: currentUser.fullName, text: text.trim() });
            if (resp.data.success) { setInlineCommentState({ ...inlineCommentState, [postId]: '' }); loadData(); }
        } catch (e) { }
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        try {
            await socialApi.markNotificationsRead(currentUser.uid);
            loadData();
        } catch (e) { }
    };

    const handleDeleteNotification = async (notifId: string) => {
        if (!currentUser) return;
        try {
            await socialApi.deleteNotification(currentUser.uid, notifId);
            loadData();
        } catch (e) { }
    };

    const renderPost = ({ item }: { item: Post }) => {
        const isLiked = item.likes && currentUser && item.likes[currentUser.uid];
        return (
            <View style={[styles.fullScreenPost, { backgroundColor: colors.card }]}>
                <View style={styles.postHeader}>
                    <View style={[styles.avatar, { backgroundColor: Colors.primary }]}><Text style={styles.avatarText}>{item.userName.charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}><Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text><Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatPostDate(item.createdAt)}</Text></View>
                    <TouchableOpacity onPress={() => { setSelectedPost(item); setIsOptionsMenuVisible(true); }}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>{item.text ? <MarkdownText content={item.text} textColor={colors.text} /> : null}</View>
                {item.mediaUri && item.mediaType === 'image' && <Image source={{ uri: item.mediaUri }} style={styles.fullWidthPostImage} resizeMode="contain" />}
                {item.mediaUri && item.mediaType === 'video' && (
                    <CustomVideoPlayer uri={item.mediaUri} shouldPlay={visiblePostId === item.id} />
                )}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.postFooter}>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleLikePost(item.id)}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#FF4444" : colors.text} /><Text style={[styles.footerText, { color: isLiked ? "#FF4444" : colors.text }]}>{item.likesCount || 0}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => { setSelectedPost(item); setIsCommentModalVisible(true); }}><Ionicons name="chatbubble-outline" size={20} color={colors.text} /><Text style={[styles.footerText, { color: colors.text }]}>{item.commentsCount || 0}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleSharePost(item)}><Ionicons name="share-social-outline" size={20} color={colors.text} /><Text style={[styles.footerText, { color: colors.text }]}>Share</Text></TouchableOpacity>
                </View>
                <View style={[styles.inlineCommentRow, { borderTopColor: colors.border }]}>
                    <TextInput style={[styles.inlineInput, { backgroundColor: isDark ? colors.background : '#F0F2F5', color: colors.text }]} placeholder="Write a comment..." placeholderTextColor={colors.textSecondary} value={inlineCommentState[item.id] || ''} onChangeText={(txt) => setInlineCommentState({ ...inlineCommentState, [item.id]: txt })} onSubmitEditing={() => handleInlineComment(item.id)} />
                    <TouchableOpacity onPress={() => handleInlineComment(item.id)} style={[styles.sendBtn, { backgroundColor: Colors.primary }]}>
                        <Ionicons name="send" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Learnova" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} showPost={true} onPostPress={() => setIsModalVisible(true)} onAvatarPress={() => setFilterByMe(!filterByMe)} notificationCount={notifications.length} onNotificationsPress={() => setIsNotifModalVisible(true)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                {filterByMe && (
                    <View style={[styles.profileFilterHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}><Ionicons name="person-circle-outline" size={24} color={Colors.primary} /><Text style={[styles.profileFilterTitle, { color: colors.text }]}>My Profile Activity</Text></View>
                )}
                <FlatList
                    data={filterByMe ? posts.filter(p => p.userId === currentUser?.uid) : posts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderPost}
                    showsVerticalScrollIndicator={false}
                    refreshing={isLoading}
                    onRefresh={loadData}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                />
            </KeyboardAvoidingView>

            {/* Create Post Modal */}
            <Modal visible={isModalVisible} animationType="fade" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card, alignSelf: 'center', width: '90%', minHeight: 400, borderRadius: 25 }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => { setIsModalVisible(false); setSelectedMedia(null); }}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Post</Text>
                            <TouchableOpacity onPress={handleAddPost} disabled={isPosting}>
                                {isPosting ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Post</Text>}
                            </TouchableOpacity>
                        </View>
                        <TextInput style={[styles.postInput, { color: colors.text, flex: 1 }]} placeholder="What's update?" placeholderTextColor={colors.textSecondary} multiline value={newPostText} onChangeText={setNewPostText} />
                        {selectedMedia && (
                            <View style={styles.previewContainer}>
                                {selectedMedia.type === 'image' ? <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} /> : <View style={[styles.mediaPreview, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="videocam" size={40} color="#FFF" /></View>}
                                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setSelectedMedia(null)}><Ionicons name="close-circle" size={24} color="#FF4444" /></TouchableOpacity>
                            </View>
                        )}
                        <View style={[styles.mediaOptionsRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                            <TouchableOpacity style={styles.mediaOptBtn} onPress={() => pickMedia('image')}><Ionicons name="image-outline" size={26} color="#4CAF50" /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Photo</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.mediaOptBtn} onPress={() => pickMedia('video')}><Ionicons name="videocam-outline" size={26} color="#F44336" /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Video</Text></TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            {/* Comments List Modal */}
            <Modal visible={isCommentModalVisible} animationType="slide" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsCommentModalVisible(false)}>
                    <View style={[styles.commentModalFull, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsCommentModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>All Comments</Text>
                            <View style={{ width: 24 }} />
                        </View>
                        <ScrollView>
                            {selectedPost?.comments ? Object.keys(selectedPost.comments).map(k => {
                                const c = selectedPost.comments![k];
                                return (
                                    <View key={k} style={styles.commentItem}>
                                        <View style={[styles.tinyAvatar, { backgroundColor: Colors.primary }]}><Text style={[styles.tinyAvatarText, { color: '#FFF' }]}>{c.userName.charAt(0)}</Text></View>
                                        <View style={[styles.commentBubble, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
                                            <Text style={[styles.commentName, { color: colors.text }]}>{c.userName}</Text>
                                            <Text style={{ color: colors.text }}>{c.text}</Text>
                                        </View>
                                    </View>
                                );
                            }) : <View style={{ alignItems: 'center', padding: 20 }}><Text style={{ color: colors.textSecondary }}>No comments yet.</Text></View>}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>

            <Modal visible={isOptionsMenuVisible} animationType="fade" transparent={true}><Pressable style={[styles.modalOverlay, { width: '100%' }]} onPress={() => setIsOptionsMenuVisible(false)}><View style={[styles.menuContent, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}><TouchableOpacity style={styles.menuItem} onPress={() => { setIsOptionsMenuVisible(false); setIsReportModalVisible(true); }}><Ionicons name="flag-outline" size={24} color={colors.text} /><Text style={[styles.menuText, { color: colors.text }]}>Report Post</Text></TouchableOpacity>{selectedPost && currentUser && selectedPost.userId === currentUser.uid && <TouchableOpacity style={styles.menuItem} onPress={() => handleDeletePost(selectedPost.id)}><Ionicons name="trash-outline" size={24} color="#FF4444" /><Text style={[styles.menuText, { color: '#FF4444' }]}>Delete Post</Text></TouchableOpacity>}</View></Pressable></Modal>
            <Modal visible={isReportModalVisible} animationType="slide" transparent={true}><Pressable style={styles.modalOverlay} onPress={() => setIsReportModalVisible(false)}><View style={[styles.reportContent, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}><Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>Report</Text><View style={styles.reportTypes}>{['Spam', 'Harassment', 'False Info', 'Inappropriate'].map(type => (<TouchableOpacity key={type} style={[styles.typeBtn, reportType === type && { backgroundColor: Colors.primary }]} onPress={() => setReportType(type)}><Text style={[styles.typeText, { color: reportType === type ? '#FFF' : colors.text }]}>{type}</Text></TouchableOpacity>))}</View><TextInput style={[styles.reportInput, { backgroundColor: isDark ? '#333' : '#F5F5F5', color: colors.text }]} placeholder="Reason..." multiline value={reportDesc} onChangeText={setReportDesc} /><View style={styles.modalFooter}><TouchableOpacity onPress={() => setIsReportModalVisible(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.submitBtn, { backgroundColor: Colors.primary }]} onPress={handleReportPost}><Text style={{ color: '#FFF' }}>Submit</Text></TouchableOpacity></View></View></Pressable></Modal>

            {/* Notifications Modal */}
            <Modal visible={isNotifModalVisible} animationType="fade" transparent={true}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsNotifModalVisible(false)}>
                    <View style={[styles.commentModalFull, { backgroundColor: colors.card, height: '60%' }]} onStartShouldSetResponder={() => true}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
                            <TouchableOpacity onPress={handleMarkAllRead}><Ionicons name="checkmark-done" size={26} color={Colors.primary} /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {notifications.length > 0 ? notifications.map(notif => {
                                const isLike = notif.type === 'like';
                                return (
                                    <TouchableOpacity
                                        key={notif.id}
                                        style={[styles.commentItem, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: notif.read ? 0.6 : 1 }]}
                                        onPress={() => {
                                            setIsNotifModalVisible(false);
                                            const targetPost = posts.find(p => p.id === notif.postId);
                                            if (targetPost) {
                                                setSelectedPost(targetPost);
                                                setIsCommentModalVisible(true);
                                            }
                                        }}
                                    >
                                        <View style={[styles.tinyAvatar, { backgroundColor: isLike ? '#FF4444' : Colors.primary }]}>
                                            <Ionicons name={isLike ? "heart" : "chatbubble"} size={14} color="#FFF" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={[{ color: colors.text, fontSize: 13 }]}>
                                                <Text style={{ fontWeight: 'bold' }}>{notif.senderName || 'Someone'}</Text>
                                                {isLike ? ' liked your post.' : ` commented: "${notif.text || '...'}"`}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>{formatPostDate(notif.createdAt)}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleDeleteNotification(notif.id)} style={{ padding: 10 }}>
                                            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                )
                            }) : <View style={{ alignItems: 'center', padding: 40 }}><Ionicons name="notifications-outline" size={80} color={colors.border} /><Text style={{ color: colors.textSecondary, marginTop: 15, fontSize: 16, fontWeight: 'bold' }}>All caught up!</Text><Text style={{ color: colors.textSecondary, marginTop: 5 }}>No new notifications.</Text></View>}
                        </ScrollView>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    fullScreenPost: { width: width, marginBottom: 10 },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#FFF', fontWeight: 'bold' },
    userName: { fontWeight: 'bold', fontSize: 15 },
    postTime: { fontSize: 12 },
    fullWidthPostImage: { width: width, height: width, backgroundColor: '#000' },
    divider: { height: 1, marginHorizontal: 15 },
    postFooter: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12 },
    footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontWeight: '600', fontSize: 13 },
    inlineCommentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderTopWidth: 1, gap: 10 },
    inlineInput: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 18, fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    menuContent: { width: '80%', alignSelf: 'center', borderRadius: 25, padding: 25 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
    menuText: { fontSize: 16, fontWeight: '600' },
    reportContent: { width: '85%', alignSelf: 'center', borderRadius: 25, padding: 25 },
    reportTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#DDD' },
    typeText: { fontSize: 12, fontWeight: '600' },
    reportInput: { height: 100, borderRadius: 15, padding: 15, textAlignVertical: 'top' },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 15 },
    submitBtn: { paddingHorizontal: 20, height: 40, borderRadius: 10, justifyContent: 'center' },
    modalContent: { alignSelf: 'center', width: '100%', padding: 20, borderRadius: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    postInput: { fontSize: 18, textAlignVertical: 'top' },
    profileFilterHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 10, borderBottomWidth: 1 },
    profileFilterTitle: { fontSize: 18, fontWeight: 'bold' },
    previewContainer: { height: 150, width: '100%', marginBottom: 15, position: 'relative' },
    mediaPreview: { width: '100%', height: '100%', borderRadius: 12 },
    removeMediaBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FFF', borderRadius: 12 },
    mediaOptionsRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 15, gap: 40, borderTopWidth: 1 },
    mediaOptBtn: { alignItems: 'center', gap: 4 },
    commentModalFull: { width: '95%', height: '80%', alignSelf: 'center', borderRadius: 25, padding: 20 },
    commentItem: { flexDirection: 'row', gap: 10, marginBottom: 15, alignItems: 'center' },
    sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
    tinyAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tinyAvatarText: { fontSize: 12, fontWeight: 'bold' },
    commentBubble: { flex: 1, padding: 10, borderRadius: 15 },
    commentName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 }
});
