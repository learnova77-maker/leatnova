import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import MarkdownText from '@/components/social/MarkdownText';
import { socialApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Comment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: number;
}

interface Post {
    id: string;
    userId: string;
    userName: string;
    text: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video' | 'document';
    fileName?: string;
    likesCount: number;
    commentsCount: number;
    createdAt: number;
    likes?: Record<string, boolean>;
    comments?: Record<string, Comment>;
}

export default function TeacherSocial() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);

    const [newPostText, setNewPostText] = useState('');
    const [newCommentText, setNewCommentText] = useState('');

    const [mediaUri, setMediaUri] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | 'document' | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) setCurrentUser(JSON.parse(userData));

            const response = await socialApi.getPosts();
            if (response.data.success) {
                setPosts(response.data.posts);
            }
        } catch (err) {
            console.error('Error loading social feed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const pickMedia = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'],
            allowsEditing: true,
            quality: 0.6,
            base64: true,
        });

        if (!result.canceled) {
            const isVideo = result.assets[0].type === 'video';
            const base64Prefix = isVideo ? 'data:video/mp4;base64,' : 'data:image/jpeg;base64,';

            const uriToSave = result.assets[0].base64 ? (base64Prefix + result.assets[0].base64) : result.assets[0].uri;

            setMediaUri(uriToSave);
            setMediaType(isVideo ? 'video' : 'image');
            setFileName(isVideo ? 'Attached Video' : 'Attached Image');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({});
            if (!result.canceled && result.assets.length > 0) {
                setMediaUri(result.assets[0].uri);
                setMediaType('document');
                setFileName(result.assets[0].name);
            }
        } catch (e) {
            console.log('Document picking failed', e);
        }
    };

    const handleAddPost = async () => {
        if ((!newPostText.trim() && !mediaUri) || !currentUser || isPosting) return;

        setIsPosting(true);
        try {
            const response = await socialApi.createPost({
                userId: currentUser.uid,
                userName: currentUser.fullName,
                text: newPostText.trim(),
                mediaUri: mediaUri || undefined,
                mediaType: mediaType || undefined,
                fileName: fileName || undefined
            });

            if (response.data.success) {
                setNewPostText('');
                setMediaUri(null);
                setMediaType(null);
                setFileName(null);
                setIsModalVisible(false);
                loadData(); // Refresh feed
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to share post.');
        } finally {
            setIsPosting(false);
        }
    };

    const handleDeletePost = (postId: string) => {
        Alert.alert(
            "Delete Post",
            "Are you sure you want to delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await socialApi.deletePost(postId);
                            if (response.data.success) {
                                loadData();
                            }
                        } catch (err) {
                            Alert.alert("Error", "Failed to delete post.");
                        }
                    }
                }
            ]
        );
    };

    const handleLikePost = async (postId: string) => {
        if (!currentUser) return;

        try {
            const response = await socialApi.likePost({
                postId,
                userId: currentUser.uid,
            });

            if (response.data.success) {
                loadData();
            }
        } catch (err) {
            console.error('Like error:', err);
        }
    };

    const handleAddComment = async () => {
        if (newCommentText.trim() === '' || !currentUser || !selectedPost) return;

        try {
            const response = await socialApi.commentPost({
                postId: selectedPost.id,
                userId: currentUser.uid,
                userName: currentUser.fullName,
                text: newCommentText.trim(),
            });

            if (response.data.success) {
                setNewCommentText('');
                const updatedResponse = await socialApi.getPosts();
                if (updatedResponse.data.success) {
                    setPosts(updatedResponse.data.posts);
                    const freshPost = updatedResponse.data.posts.find((p: Post) => p.id === selectedPost.id);
                    if (freshPost) setSelectedPost(freshPost);
                }
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to add comment.');
        }
    };

    const openComments = (post: Post) => {
        setSelectedPost(post);
        setIsCommentModalVisible(true);
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';

        const hours = Math.floor(mins / 60);
        if (hours < 1) return `${mins}m ago`;

        const days = Math.floor(hours / 24);
        if (days < 1) return `${hours}h ago`;

        if (days < 30) {
            return days === 1 ? '1 day ago' : `${days} days ago`;
        }

        const months = Math.floor(days / 30);
        if (months < 12) {
            return months === 1 ? '1 month ago' : `${months} months ago`;
        }

        const date = new Date(timestamp);
        return date.toLocaleDateString();
    };

    const renderPost = ({ item }: { item: Post }) => {
        const isLiked = item.likes && currentUser && item.likes[currentUser.uid];
        const isOwner = currentUser && item.userId === currentUser.uid;

        return (
            <Pressable
                onLongPress={() => isOwner && handleDeletePost(item.id)}
                style={({ pressed }) => [
                    styles.postCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }
                ]}
            >
                <View style={styles.postHeader}>
                    <View style={[styles.avatar, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                        <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
                        <Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                    {isOwner && <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />}
                </View>

                {item.text ? (
                    <MarkdownText content={item.text} textColor={colors.text} />
                ) : null}

                {item.mediaUri && item.mediaType === 'image' && (
                    <Image source={{ uri: item.mediaUri }} style={styles.postImage} />
                )}
                {item.mediaUri && (item.mediaType === 'video' || item.mediaType === 'document') && (
                    <View style={[styles.attachmentBox, { backgroundColor: isDark ? '#1A1A2E' : '#F0F9FF' }]}>
                        <Ionicons name={item.mediaType === 'video' ? 'videocam' : 'document-text'} size={24} color={Colors.primary} />
                        <Text style={[styles.attachmentText, { color: colors.text }]} numberOfLines={1}>
                            {item.fileName || 'Attached File'}
                        </Text>
                    </View>
                )}

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.postFooter}>
                    <TouchableOpacity
                        style={styles.footerAction}
                        onPress={() => handleLikePost(item.id)}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={20}
                            color={isLiked ? "#FF4444" : colors.textSecondary}
                        />
                        <Text style={[styles.footerText, { color: isLiked ? "#FF4444" : colors.textSecondary }]}>
                            {item.likesCount || 0}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.footerAction}
                        onPress={() => openComments(item)}
                    >
                        <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                            {item.commentsCount || 0}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Learnova"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showPost={true}
                onPostPress={() => setIsModalVisible(true)}
            />

            <View style={styles.screenContainer}>
                {isLoading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={posts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPost}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={<View style={{ height: 10 }} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContent}>
                                <Ionicons name="people-outline" size={60} color={colors.border} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No posts yet. Be the first to share!</Text>
                            </View>
                        }
                        refreshing={isLoading}
                        onRefresh={loadData}
                    />
                )}
            </View>

            <Modal visible={isModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => !isPosting && setIsModalVisible(false)}>
                                    <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>New Post</Text>
                                <TouchableOpacity
                                    style={[styles.shareBtn, ((!newPostText.trim() && !mediaUri) || isPosting) && { opacity: 0.5 }]}
                                    disabled={(!newPostText.trim() && !mediaUri) || isPosting}
                                    onPress={handleAddPost}
                                >
                                    {isPosting ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.shareBtnText}>Post</Text>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 200, minHeight: 100 }}>
                                <TextInput
                                    style={[styles.postInput, { color: colors.text }]}
                                    placeholder="What's on your mind?"
                                    placeholderTextColor={colors.textSecondary}
                                    multiline
                                    autoFocus
                                    value={newPostText}
                                    onChangeText={setNewPostText}
                                    editable={!isPosting}
                                />

                                {mediaUri && mediaType === 'image' && (
                                    <Image source={{ uri: mediaUri }} style={styles.previewImage} />
                                )}
                                {mediaUri && (mediaType === 'video' || mediaType === 'document') && (
                                    <View style={styles.previewBox}>
                                        <Ionicons name={mediaType === 'video' ? 'videocam' : 'document'} size={24} color={Colors.primary} />
                                        <Text style={{ marginLeft: 10, color: colors.text, flex: 1 }} numberOfLines={1}>{fileName}</Text>
                                        {!isPosting && (
                                            <TouchableOpacity onPress={() => { setMediaUri(null); setMediaType(null); setFileName(null); }}>
                                                <Ionicons name="close-circle" size={20} color="red" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            </ScrollView>

                            <View style={[styles.mediaToolsRow, { borderTopColor: colors.border }]}>
                                <TouchableOpacity style={styles.mediaBtn} onPress={pickMedia} disabled={isPosting}>
                                    <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold' }}>Attach Photo / Video</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.mediaBtn} onPress={pickDocument} disabled={isPosting}>
                                    <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold' }}>Attach Document</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={isCommentModalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%', flex: 1, justifyContent: 'flex-end' }}>
                        <View style={[styles.commentModalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setIsCommentModalVisible(false)}>
                                    <Ionicons name="chevron-down" size={28} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Comments</Text>
                                <View style={{ width: 28 }} />
                            </View>

                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                                {selectedPost?.comments ? (
                                    Object.keys(selectedPost.comments).map(cKey => {
                                        const comment = selectedPost.comments![cKey];
                                        return (
                                            <View key={cKey} style={styles.commentItem}>
                                                <View style={[styles.avatarSmall, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                                                    <Text style={styles.avatarTextSmall}>{comment.userName.charAt(0)}</Text>
                                                </View>
                                                <View style={styles.commentBody}>
                                                    <View style={styles.commentHeader}>
                                                        <Text style={[styles.commentUserName, { color: colors.text }]}>{comment.userName}</Text>
                                                        <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{formatTime(comment.createdAt)}</Text>
                                                    </View>
                                                    <Text style={[styles.commentText, { color: colors.textSecondary }]}>
                                                        {comment.text.split(' ').map((word, i) => (
                                                            word.startsWith('@') ? (
                                                                <Text key={i} style={{ color: Colors.primary, fontWeight: 'bold' }}>{word} </Text>
                                                            ) : (
                                                                word + ' '
                                                            )
                                                        ))}
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.emptyComments}>
                                        <Text style={{ color: colors.textSecondary }}>No comments yet.</Text>
                                    </View>
                                )}
                            </ScrollView>

                            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
                                <TextInput
                                    style={[styles.commentInput, { backgroundColor: isDark ? colors.background : '#F0F0F0', color: colors.text }]}
                                    placeholder="Add a comment... (use @ to mention)"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newCommentText}
                                    onChangeText={setNewCommentText}
                                />
                                <TouchableOpacity
                                    onPress={handleAddComment}
                                    disabled={!newCommentText.trim()}
                                >
                                    <Ionicons
                                        name="send"
                                        size={24}
                                        color={newCommentText.trim() ? Colors.primary : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    screenContainer: { flex: 1 },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 20 },
    welcomeBox: { marginBottom: 20 },
    screenTitle: { fontSize: 24, fontWeight: 'bold' },
    screenSub: { fontSize: 14, marginTop: 4, marginBottom: 15 },
    postButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderRadius: 16,
    },
    postButtonText: { fontSize: 15, fontWeight: '600', color: Colors.secondary },
    postCard: {
        padding: 15,
        borderRadius: 20,
        marginBottom: 15,
        borderWidth: 1,
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: Colors.primary },
    userName: { fontSize: 16, fontWeight: 'bold' },
    postTime: { fontSize: 12, marginTop: 2 },
    postText: { fontSize: 15, lineHeight: 22, marginBottom: 15 },
    postImage: { width: '100%', height: 200, borderRadius: 12, marginVertical: 10 },
    attachmentBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginVertical: 10 },
    attachmentText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
    divider: { height: 1, marginBottom: 12 },
    postFooter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 13, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', borderRadius: 24, padding: 20, paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: 'bold' },
    shareBtn: { backgroundColor: Colors.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, minWidth: 60, alignItems: 'center' },
    shareBtnText: { color: '#FFF', fontWeight: 'bold' },
    postInput: { fontSize: 18, lineHeight: 26, textAlignVertical: 'top' },
    previewImage: { width: '100%', height: 150, borderRadius: 12, marginTop: 15 },
    previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F9FF', padding: 12, borderRadius: 12, marginTop: 15 },
    mediaToolsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 15, marginTop: 10, borderTopWidth: 1, gap: 30 },
    mediaBtn: { padding: 8 },

    commentModalContent: { height: '80%', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    commentItem: { flexDirection: 'row', marginBottom: 15 },
    avatarSmall: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarTextSmall: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
    commentBody: { flex: 1 },
    commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    commentUserName: { fontSize: 13, fontWeight: 'bold' },
    commentTime: { fontSize: 11 },
    commentText: { fontSize: 14, lineHeight: 20 },
    commentInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 12,
        borderTopWidth: 1,
    },
    commentInput: {
        flex: 1,
        height: 45,
        borderRadius: 22,
        paddingHorizontal: 15,
        fontSize: 14,
    },
    emptyContent: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: 15, fontSize: 14 },
    emptyComments: { alignItems: 'center', padding: 30 },
});
