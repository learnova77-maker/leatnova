import NoInternet from '@/components/NoInternet';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import CustomVideoPlayer from '@/components/social/CustomVideoPlayer';
import MarkdownText from '@/components/social/MarkdownText';
import { socialApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { storage } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
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
interface Story { id?: string; userId: string; userName: string; userAvatar?: string; mediaUri?: string; mediaType: 'image' | 'video' | 'text'; text?: string; backgroundColor?: string; createdAt: number; }
interface GroupedStory { userId: string; userName: string; avatar?: string; stories: Story[]; hasActiveStory: boolean; isUser: boolean; }
interface Post { id: string; userId: string; userName: string; text: string; mediaUri?: string; mediaType?: 'image' | 'video' | 'document'; fileName?: string; likesCount: number; commentsCount: number; createdAt: number; likes?: Record<string, boolean>; comments?: Record<string, Comment>; }
interface Notification { id: string; type: 'like' | 'comment'; postId: string; senderId: string; senderName: string; text?: string; createdAt: number; read: boolean; }

// stories fetched from backend

const STORY_DURATION = 5000;

export default function TeacherSocial() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const isFocused = useIsFocused();
    const router = useRouter();
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
    const [followingIds, setFollowingIds] = useState<string[]>([]);
    const [groupedStories, setGroupedStories] = useState<GroupedStory[]>([]);
    const [isCreatingStory, setIsCreatingStory] = useState(false);
    const [isStoryTypeModalVisible, setIsStoryTypeModalVisible] = useState(false);
    const [isTextStoryModalVisible, setIsTextStoryModalVisible] = useState(false);
    const [textStoryContent, setTextStoryContent] = useState('');
    const [textStoryColor, setTextStoryColor] = useState('#8A2BE2');

    const [newPostText, setNewPostText] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [inlineCommentState, setInlineCommentState] = useState<Record<string, string>>({});
    const [sendingCommentPostId, setSendingCommentPostId] = useState<string | null>(null);
    const [commentLimit, setCommentLimit] = useState(10);
    const [reportType, setReportType] = useState('Spam');
    const [reportDesc, setReportDesc] = useState('');
    const [isOffline, setIsOffline] = useState(false);

    // Story viewer state
    const [isStoryViewerVisible, setIsStoryViewerVisible] = useState(false);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const storyProgress = useRef(new Animated.Value(0)).current;
    const storyTimer = useRef<any>(null);

    // Auto-play tracking
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setVisiblePostId(viewableItems[0].item.id);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        loadData();
        return () => unsubscribe();
    }, []);

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
            const userResp = await AsyncStorage.getItem('user');
            let u: any = null;
            let currentFollowing: string[] = [];

            if (userResp) {
                u = JSON.parse(userResp);
                setCurrentUser(u);
                // Load following list
                const followResp = await socialApi.getFollowingIds(u.uid);
                if (followResp.data.success) {
                    setFollowingIds(followResp.data.followingIds);
                    currentFollowing = followResp.data.followingIds;
                }
                loadNotifications(u.uid);
            }

            const response = await socialApi.getPosts();
            if (response.data.success) setPosts(response.data.posts);

            if (u) {
                const storyResp = await socialApi.getStories({ userId: u.uid, followingIds: currentFollowing });
                if (storyResp.data.success) {
                    groupStories(storyResp.data.stories, u.uid);
                }
            }
        } catch (err) { console.error('Error:', err); } finally { setIsLoading(false); }
    };

    const groupStories = (rawStories: Story[], curUserUid?: string) => {
        const groups: Record<string, GroupedStory> = {};
        const userIdForGroup = curUserUid || currentUser?.uid;

        rawStories.forEach(s => {
            if (!groups[s.userId]) {
                groups[s.userId] = {
                    userId: s.userId,
                    userName: s.userName,
                    avatar: s.userAvatar,
                    stories: [],
                    hasActiveStory: true,
                    isUser: s.userId === userIdForGroup
                };
            }
            groups[s.userId].stories.push(s);
        });

        const sorted = Object.values(groups).sort((a, b) => {
            if (a.isUser) return -1;
            if (b.isUser) return 1;
            return 0;
        });

        if (userIdForGroup && !sorted.find(s => s.isUser)) {
            sorted.unshift({
                userId: userIdForGroup,
                userName: 'Your Story',
                avatar: currentUser?.photoUrl,
                stories: [],
                hasActiveStory: false,
                isUser: true
            });
        }
        setGroupedStories(sorted);
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
        let finalMediaUri: string | undefined = undefined;

        try {
            // 1. Upload media if exists
            if (selectedMedia) {
                const response = await fetch(selectedMedia.uri);
                const blob = await response.blob();
                const fileExtension = selectedMedia.type === 'video' ? 'mp4' : 'jpg';
                const fileName = `social/${currentUser.uid}/${Date.now()}.${fileExtension}`;
                const fileRef = storageRef(storage, fileName);

                await uploadBytes(fileRef, blob);
                finalMediaUri = await getDownloadURL(fileRef);
            }

            // 2. Create post with final URL
            const response = await socialApi.createPost({
                userId: currentUser.uid,
                userName: currentUser.fullName,
                text: newPostText.trim(),
                mediaUri: finalMediaUri,
                mediaType: selectedMedia?.type
            });

            if (response.data.success) {
                setNewPostText('');
                setSelectedMedia(null);
                setIsModalVisible(false);
                loadData();
            }
        } catch (err) {
            console.error('Teacher Post creation error:', err);
            Alert.alert('Error', 'Failed to share post. Please try again.');
        } finally {
            setIsPosting(false);
        }
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
            if (resp.data.success) { setIsReportModalVisible(false); setReportDesc(''); }
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
        if (!text?.trim() || !currentUser || sendingCommentPostId === postId) return;

        setSendingCommentPostId(postId);
        try {
            const resp = await socialApi.commentPost({ postId, userId: currentUser.uid, userName: currentUser.fullName, text: text.trim() });
            if (resp.data.success) {
                const newId = resp.data.id || Date.now().toString();
                const newCommentObj = { id: newId, userId: currentUser.uid, userName: currentUser.fullName, text: text.trim(), createdAt: Date.now() };

                // Instantly update selectedPost if modal is open
                if (selectedPost && selectedPost.id === postId) {
                    setSelectedPost({
                        ...selectedPost,
                        commentsCount: (selectedPost.commentsCount || 0) + 1,
                        comments: { ...(selectedPost.comments || {}), [newId]: newCommentObj }
                    });
                }

                // Instantly update posts list
                setPosts(prevPosts => prevPosts.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            commentsCount: (p.commentsCount || 0) + 1,
                            comments: { ...(p.comments || {}), [newId]: newCommentObj }
                        };
                    }
                    return p;
                }));

                setInlineCommentState({ ...inlineCommentState, [postId]: '' });
                // Fetch in background to silently sync other missing things
                socialApi.getPosts().then(r => { if (r.data.success) setPosts(r.data.posts); });
            }
        } catch (e) { Alert.alert("Error", "Failed to send comment."); } finally { setSendingCommentPostId(null); }
    };

    const handleMarkAllRead = async () => {
        if (!currentUser) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await socialApi.markNotificationsRead(currentUser.uid);
            // the background refetch is optional as local state is already synced
        } catch (e) { }
    };

    const handleDeleteNotification = async (notifId: string) => {
        if (!currentUser) return;
        try {
            await socialApi.deleteNotification(currentUser.uid, notifId);
            loadData();
        } catch (e) { }
    };

    const handleFollowFromFeed = async (userId: string, userName: string) => {
        if (!currentUser) return;
        try {
            const resp = await socialApi.followUser({
                followerId: currentUser.uid,
                followingId: userId,
                followerName: currentUser.fullName
            });
            if (resp.data.success) {
                if (resp.data.followed) {
                    setFollowingIds(prev => [...prev, userId]);
                } else {
                    setFollowingIds(prev => prev.filter(id => id !== userId));
                }
            }
        } catch (e) { }
    };

    const handleCreateStory = async () => {
        if (!currentUser) return;
        setIsStoryTypeModalVisible(true);
    };

    const handlePickImageStory = async () => {
        setIsStoryTypeModalVisible(false);
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.7,
            });

            if (!result.canceled) {
                setIsCreatingStory(true);
                const asset = result.assets[0];
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                const fileName = `story_${Date.now()}.jpg`;
                const fileRef = storageRef(storage, `stories/${currentUser.uid}/${fileName}`);
                await uploadBytes(fileRef, blob);
                const downloadURL = await getDownloadURL(fileRef);

                await socialApi.createStory({
                    userId: currentUser.uid,
                    userName: currentUser.fullName,
                    userAvatar: currentUser.photoUrl,
                    mediaUri: downloadURL,
                    mediaType: 'image'
                });
                loadData();
            }
        } catch (e) { Alert.alert('Error', 'Failed to upload story'); } finally { setIsCreatingStory(false); }
    };

    const handleCreateTextStory = async () => {
        if (!textStoryContent.trim()) return;
        setIsCreatingStory(true);
        try {
            await socialApi.createStory({
                userId: currentUser?.uid!,
                userName: currentUser?.fullName!,
                userAvatar: currentUser?.photoUrl,
                mediaType: 'text',
                text: textStoryContent.trim(),
                backgroundColor: textStoryColor
            });
            setIsTextStoryModalVisible(false);
            setTextStoryContent('');
            loadData();
        } catch (e) { Alert.alert('Error', 'Failed to add story'); } finally { setIsCreatingStory(false); }
    };

    // ---- Story Viewer Logic ----
    const openStory = (index: number) => {
        const story = groupedStories[index];
        if (story.isUser && story.stories.length === 0) {
            handleCreateStory();
            return;
        }
        if (!story.hasActiveStory) return;
        setActiveStoryIndex(index);
        setActiveImageIndex(0);
        setIsStoryViewerVisible(true);
    };

    const startStoryTimer = () => {
        storyProgress.setValue(0);
        if (storyTimer.current) clearTimeout(storyTimer.current);
        Animated.timing(storyProgress, {
            toValue: 1,
            duration: STORY_DURATION,
            useNativeDriver: false,
        }).start();
        storyTimer.current = setTimeout(() => {
            goToNextStoryImage();
        }, STORY_DURATION);
    };

    const stopStoryTimer = () => {
        storyProgress.stopAnimation();
        if (storyTimer.current) clearTimeout(storyTimer.current);
    };

    const goToNextStoryImage = () => {
        const story = groupedStories[activeStoryIndex];
        if (activeImageIndex < story.stories.length - 1) {
            setActiveImageIndex(prev => prev + 1);
        } else {
            // Move to next person's story
            const nextIdx = activeStoryIndex + 1;
            if (nextIdx < groupedStories.length && groupedStories[nextIdx].hasActiveStory) {
                setActiveStoryIndex(nextIdx);
                setActiveImageIndex(0);
            } else {
                closeStoryViewer();
            }
        }
    };

    const goToPrevStoryImage = () => {
        if (activeImageIndex > 0) {
            setActiveImageIndex(prev => prev - 1);
        } else {
            // Move to previous person's story
            const prevIdx = activeStoryIndex - 1;
            if (prevIdx >= 0 && groupedStories[prevIdx].hasActiveStory) {
                setActiveStoryIndex(prevIdx);
                setActiveImageIndex(groupedStories[prevIdx].stories.length - 1);
            }
        }
    };

    const closeStoryViewer = () => {
        stopStoryTimer();
        setIsStoryViewerVisible(false);
    };

    const handleDeleteStory = async () => {
        const story = groupedStories[activeStoryIndex];
        const storyId = story.stories[activeImageIndex]?.id;
        if (!storyId) return;

        Alert.alert('Delete Story', 'Are you sure you want to delete this story?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await socialApi.deleteStory(storyId);
                        if (story.stories.length <= 1) {
                            closeStoryViewer();
                        } else {
                            goToNextStoryImage();
                        }
                        loadData();
                    } catch (e) { Alert.alert('Error', 'Failed to delete story'); }
                }
            }
        ]);
    };

    useEffect(() => {
        if (isStoryViewerVisible) {
            startStoryTimer();
        }
        return () => stopStoryTimer();
    }, [isStoryViewerVisible, activeStoryIndex, activeImageIndex]);

    const renderStories = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.storiesContainer, { borderBottomColor: colors.border }]}>
            {groupedStories.map((story, idx) => {
                const displayName = story.isUser ? 'Your Story' : story.userName.split(' ')[0];
                const showAdd = story.isUser && story.stories.length === 0;

                return (
                    <TouchableOpacity
                        key={idx}
                        style={styles.storyItem}
                        onPress={() => openStory(idx)}
                        onLongPress={() => story.isUser && handleCreateStory()}
                    >
                        <View style={[styles.storyAvatarRing, story.hasActiveStory && !showAdd ? { borderColor: Colors.primary } : { borderColor: 'transparent' }]}>
                            <View style={[styles.storyAvatar, { backgroundColor: story.isUser ? '#888' : Colors.primary }]}>
                                {story.isUser && currentUser ? (
                                    currentUser.photoUrl ? (
                                        <Image source={{ uri: currentUser.photoUrl }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{currentUser.fullName?.charAt(0) || 'Y'}</Text>
                                    )
                                ) : (
                                    story.avatar && story.avatar.startsWith('http') ? (
                                        <Image source={{ uri: story.avatar }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{story.avatar || story.userName.charAt(0)}</Text>
                                    )
                                )}
                                {story.isUser && (
                                    <View style={[styles.addStoryBtn, { backgroundColor: Colors.primary, borderColor: colors.background }]}>
                                        <Ionicons name="add" size={12} color={colors.background} />
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={[styles.storyName, { color: colors.text }]} numberOfLines={1}>
                            {displayName}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );

    const renderListHeader = () => (
        <View style={{ marginBottom: 10 }}>
            {renderStories()}
        </View>
    );

    const renderPost = ({ item }: { item: Post }) => {
        const isLiked = item.likes && currentUser && item.likes[currentUser.uid];
        const isFollowing = followingIds.includes(item.userId);
        const isOwnPost = currentUser?.uid === item.userId;

        return (
            <View style={[styles.fullScreenPost, { backgroundColor: colors.card }]}>
                <View style={styles.postHeader}>
                    <TouchableOpacity
                        style={[styles.avatar, { backgroundColor: Colors.primary }]}
                        onPress={() => router.push({ pathname: '/social/profile', params: { userId: item.userId } })}
                    >
                        <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TouchableOpacity onPress={() => router.push({ pathname: '/social/profile', params: { userId: item.userId } })}>
                                <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
                            </TouchableOpacity>
                            {!isOwnPost && (
                                <TouchableOpacity onPress={() => handleFollowFromFeed(item.userId, item.userName)}>
                                    <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                                        • {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatPostDate(item.createdAt)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setSelectedPost(item); setIsOptionsMenuVisible(true); }}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></TouchableOpacity>
                </View>
                <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>{item.text ? <MarkdownText content={item.text} textColor={colors.text} /> : null}</View>
                {item.mediaUri && item.mediaType === 'image' && <Image source={{ uri: item.mediaUri }} style={styles.fullWidthPostImage} resizeMode="contain" />}
                {item.mediaUri && item.mediaType === 'video' && (
                    <CustomVideoPlayer uri={item.mediaUri} shouldPlay={isFocused && visiblePostId === item.id} />
                )}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.postFooter}>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleLikePost(item.id)}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#FF4444" : colors.text} /><Text style={[styles.footerText, { color: isLiked ? "#FF4444" : colors.text }]}>{item.likesCount || 0}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => { setSelectedPost(item); setCommentLimit(10); setIsCommentModalVisible(true); }}><Ionicons name="chatbubble-outline" size={20} color={colors.text} /><Text style={[styles.footerText, { color: colors.text }]}>{item.commentsCount || 0}</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleSharePost(item)}><Ionicons name="share-social-outline" size={20} color={colors.text} /><Text style={[styles.footerText, { color: colors.text }]}>Share</Text></TouchableOpacity>
                </View>
                <View style={[styles.inlineCommentRow, { borderTopColor: colors.border }]}>
                    <TextInput style={[styles.inlineInput, { backgroundColor: isDark ? colors.background : '#F0F2F5', color: colors.text }]} placeholder="Write a comment..." placeholderTextColor={colors.textSecondary} value={inlineCommentState[item.id] || ''} onChangeText={(txt) => setInlineCommentState({ ...inlineCommentState, [item.id]: txt })} onSubmitEditing={() => handleInlineComment(item.id)} />
                    <TouchableOpacity onPress={() => handleInlineComment(item.id)} style={[styles.sendBtn, { backgroundColor: Colors.primary }]} disabled={sendingCommentPostId === item.id}>
                        {sendingCommentPostId === item.id ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={16} color="#FFF" />}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="Learnova" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} showPost={true} onPostPress={() => setIsModalVisible(true)} showSearch={true} onAvatarPress={() => router.push(`/social/profile?userId=${currentUser?.uid}`)} notificationCount={notifications.filter(n => !n.read).length} onNotificationsPress={() => setIsNotifModalVisible(true)} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
                {isOffline ? (
                    <NoInternet />
                ) : (
                    <>
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
                            ListHeaderComponent={!filterByMe ? renderListHeader : undefined}
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                        />
                    </>
                )}
            </KeyboardAvoidingView>

            {/* Create Post Modal */}
            <Modal visible={isModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsModalVisible(false)} />
                    <View style={[styles.modalContent, { backgroundColor: colors.card, alignSelf: 'center', width: '90%', minHeight: 400, borderRadius: 25 }]}>
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
                </View>
            </Modal>

            {/* Choose Story Type Modal */}
            <Modal visible={isStoryTypeModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsStoryTypeModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsStoryTypeModalVisible(false)} />
                    <View style={[styles.menuContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { marginVertical: 15, textAlign: 'center', color: colors.text }]}>Share to Story</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={handlePickImageStory}>
                            <View style={[styles.tinyAvatar, { backgroundColor: '#4CAF50' }]}><Ionicons name="image" size={18} color="#FFF" /></View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Upload Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => { setIsStoryTypeModalVisible(false); setIsTextStoryModalVisible(true); }}>
                            <View style={[styles.tinyAvatar, { backgroundColor: '#8A2BE2' }]}><Ionicons name="text" size={18} color="#FFF" /></View>
                            <Text style={[styles.menuText, { color: colors.text }]}>Write Text</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.menuItem, { marginTop: 10 }]} onPress={() => setIsStoryTypeModalVisible(false)}>
                            <Text style={{ color: colors.textSecondary, width: '100%', textAlign: 'center' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Create Text Story Modal */}
            <Modal visible={isTextStoryModalVisible} animationType="slide" onRequestClose={() => setIsTextStoryModalVisible(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: textStoryColor }}>
                    <View style={[styles.modalHeader, { marginTop: 15 }]}>
                        <TouchableOpacity style={{ padding: 15 }} onPress={() => setIsTextStoryModalVisible(false)}><Ionicons name="close" size={30} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity style={{ padding: 15 }} onPress={handleCreateTextStory} disabled={isCreatingStory}>
                            {isCreatingStory ? <ActivityIndicator color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 18 }}>Write Story</Text>}
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <TextInput
                            style={{ color: '#FFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center', width: '100%' }}
                            placeholder="Type something..."
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            multiline
                            autoFocus
                            value={textStoryContent}
                            onChangeText={setTextStoryContent}
                        />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 5, paddingHorizontal: 20, flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                        {['#8A2BE2', '#FF4500', '#2E8B57', '#4169E1', '#C71585', '#FF8C00', '#008080', '#D2691E', '#4B0082', '#000000', '#FFD700', '#FF1493', '#00FA9A', '#1E90FF'].map(c => (
                            <TouchableOpacity
                                key={c}
                                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c, borderWidth: textStoryColor === c ? 3 : 0, borderColor: '#FFF' }}
                                onPress={() => setTextStoryColor(c)}
                            />
                        ))}
                    </ScrollView>
                </SafeAreaView>
            </Modal >

            {/* Comments List Modal */}
            < Modal visible={isCommentModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsCommentModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCommentModalVisible(false)} />
                        <View style={[styles.commentModalFull, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setIsCommentModalVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>All Comments</Text>
                                <View style={{ width: 24 }} />
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {selectedPost?.comments && Object.keys(selectedPost.comments).length > 0 ? (
                                    (() => {
                                        const allComments = Object.values(selectedPost.comments).sort((a: any, b: any) => b.createdAt - a.createdAt);
                                        const displayedComments = allComments.slice(0, commentLimit);
                                        return (
                                            <>
                                                {displayedComments.map((c: any) => (
                                                    <View key={c.id || c.createdAt.toString()} style={styles.commentItem}>
                                                        <View style={[styles.tinyAvatar, { backgroundColor: Colors.primary }]}>
                                                            <Text style={[styles.tinyAvatarText, { color: '#FFF' }]}>{c.userName.charAt(0)}</Text>
                                                        </View>
                                                        <View style={[styles.commentBubble, { backgroundColor: isDark ? '#333' : '#F0F2F5' }]}>
                                                            <Text style={[styles.commentName, { color: colors.text }]}>{c.userName}</Text>
                                                            <Text style={{ color: colors.text }}>{c.text}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                                {allComments.length > commentLimit && (
                                                    <TouchableOpacity style={{ alignSelf: 'center', padding: 15 }} onPress={() => setCommentLimit(prev => prev + 10)}>
                                                        <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Load earlier comments</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </>
                                        );
                                    })()
                                ) : (
                                    <View style={{ alignItems: 'center', padding: 20 }}>
                                        <Ionicons name="chatbubbles-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 10 }} />
                                        <Text style={{ color: colors.textSecondary }}>No comments yet.</Text>
                                    </View>
                                )}
                            </ScrollView>

                            {selectedPost && (
                                <View style={[styles.inlineCommentRow, { borderTopColor: colors.border, paddingHorizontal: 0, marginTop: 10 }]}>
                                    <View style={[styles.tinyAvatar, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                                        <Text style={[styles.tinyAvatarText, { color: Colors.primary }]}>{currentUser?.fullName?.charAt(0)}</Text>
                                    </View>
                                    <TextInput
                                        style={[styles.inlineInput, { backgroundColor: isDark ? '#333' : '#F5F5F5', color: colors.text }]}
                                        placeholder="Add a comment..."
                                        placeholderTextColor={colors.textSecondary}
                                        value={inlineCommentState[selectedPost.id] || ''}
                                        onChangeText={(txt) => setInlineCommentState({ ...inlineCommentState, [selectedPost.id]: txt })}
                                        onSubmitEditing={() => handleInlineComment(selectedPost.id)}
                                    />
                                    <TouchableOpacity
                                        onPress={() => handleInlineComment(selectedPost.id)}
                                        style={[styles.sendBtn, { backgroundColor: Colors.primary }]}
                                        disabled={sendingCommentPostId === selectedPost.id}
                                    >
                                        {sendingCommentPostId === selectedPost.id ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={14} color="#FFF" />}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView >
            </Modal >

            <Modal visible={isOptionsMenuVisible} animationType="fade" transparent={true} onRequestClose={() => setIsOptionsMenuVisible(false)}><Pressable style={[styles.modalOverlay, { width: '100%' }]} onPress={() => setIsOptionsMenuVisible(false)}><View style={[styles.menuContent, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}><TouchableOpacity style={styles.menuItem} onPress={() => { setIsOptionsMenuVisible(false); setIsReportModalVisible(true); }}><Ionicons name="flag-outline" size={24} color={colors.text} /><Text style={[styles.menuText, { color: colors.text }]}>Report Post</Text></TouchableOpacity>{selectedPost && currentUser && selectedPost.userId === currentUser.uid && <TouchableOpacity style={styles.menuItem} onPress={() => handleDeletePost(selectedPost.id)}><Ionicons name="trash-outline" size={24} color="#FF4444" /><Text style={[styles.menuText, { color: '#FF4444' }]}>Delete Post</Text></TouchableOpacity>}</View></Pressable></Modal>
            <Modal visible={isReportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsReportModalVisible(false)}><Pressable style={styles.modalOverlay} onPress={() => setIsReportModalVisible(false)}><View style={[styles.reportContent, { backgroundColor: colors.card }]} onStartShouldSetResponder={() => true}><Text style={[styles.modalTitle, { color: colors.text, marginBottom: 20 }]}>Report</Text><View style={styles.reportTypes}>{['Spam', 'Harassment', 'False Info', 'Inappropriate'].map(type => (<TouchableOpacity key={type} style={[styles.typeBtn, reportType === type && { backgroundColor: Colors.primary }]} onPress={() => setReportType(type)}><Text style={[styles.typeText, { color: reportType === type ? '#FFF' : colors.text }]}>{type}</Text></TouchableOpacity>))}</View><TextInput style={[styles.reportInput, { backgroundColor: isDark ? '#333' : '#F5F5F5', color: colors.text }]} placeholder="Reason..." multiline value={reportDesc} onChangeText={setReportDesc} /><View style={styles.modalFooter}><TouchableOpacity onPress={() => setIsReportModalVisible(false)}><Text style={{ color: colors.textSecondary }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.submitBtn, { backgroundColor: Colors.primary }]} onPress={handleReportPost}><Text style={{ color: '#FFF' }}>Submit</Text></TouchableOpacity></View></View></Pressable></Modal>

            {/* Notifications Modal */}
            <Modal visible={isNotifModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsNotifModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsNotifModalVisible(false)} />
                    <View style={[styles.commentModalFull, { backgroundColor: colors.card, height: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setIsNotifModalVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Notifications</Text>
                            <TouchableOpacity onPress={handleMarkAllRead}><Ionicons name="checkmark-done" size={26} color={Colors.primary} /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                </View>
            </Modal>

            {/* Story Viewer Modal */}
            <Modal visible={isStoryViewerVisible} animationType="fade" transparent={false} onRequestClose={closeStoryViewer}>
                <View style={storyStyles.container}>
                    <StatusBar barStyle="light-content" backgroundColor="#000" />
                    {/* Progress bars */}
                    <View style={storyStyles.progressContainer}>
                        {groupedStories[activeStoryIndex]?.stories.map((_: any, idx: number) => (
                            <View key={idx} style={[storyStyles.progressBarBg, { flex: 1, marginHorizontal: 2 }]}>
                                {idx < activeImageIndex ? (
                                    <View style={[storyStyles.progressBarFill, { width: '100%' }]} />
                                ) : idx === activeImageIndex ? (
                                    <Animated.View style={[storyStyles.progressBarFill, { width: storyProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                                ) : null}
                            </View>
                        ))}
                    </View>

                    {/* Header */}
                    <View style={storyStyles.header}>
                        <View style={storyStyles.headerLeft}>
                            <View style={storyStyles.headerAvatar}>
                                {groupedStories[activeStoryIndex]?.avatar ? (
                                    <Image source={{ uri: groupedStories[activeStoryIndex].avatar! }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{groupedStories[activeStoryIndex]?.userName?.charAt(0)}</Text>
                                )}
                            </View>
                            <Text style={storyStyles.headerName}>{groupedStories[activeStoryIndex]?.userName}</Text>
                            <Text style={storyStyles.headerTime}>Active Now</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {groupedStories[activeStoryIndex]?.isUser && (
                                <TouchableOpacity onPress={handleDeleteStory} style={{ padding: 8, marginRight: 5 }}>
                                    <Ionicons name="trash-outline" size={24} color="#FF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={closeStoryViewer} style={{ padding: 8 }}>
                                <Ionicons name="close" size={28} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Story Content */}
                    {groupedStories[activeStoryIndex]?.stories[activeImageIndex]?.mediaType === 'text' ? (
                        <View style={[storyStyles.textStoryContainer, { backgroundColor: groupedStories[activeStoryIndex].stories[activeImageIndex].backgroundColor || Colors.primary }]}>
                            <Text style={storyStyles.textStoryContent}>
                                {groupedStories[activeStoryIndex].stories[activeImageIndex].text}
                            </Text>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: groupedStories[activeStoryIndex]?.stories[activeImageIndex]?.mediaUri }}
                            style={storyStyles.storyImage}
                            resizeMode="cover"
                        />
                    )}

                    {/* Tap zones */}
                    <View style={storyStyles.tapZones}>
                        <Pressable style={storyStyles.tapLeft} onPress={goToPrevStoryImage} />
                        <Pressable style={storyStyles.tapRight} onPress={goToNextStoryImage} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView >
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
    commentName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
    storiesContainer: { paddingHorizontal: 10, paddingVertical: 15, borderBottomWidth: 1, backgroundColor: 'transparent' },
    storyItem: { alignItems: 'center', marginRight: 15, width: 70 },
    storyAvatarRing: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    storyAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    storyName: { fontSize: 11, marginTop: 5, textAlign: 'center' },
    addStoryBtn: { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        marginBottom: 8,
    },
    statusAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    statusInputFake: {
        flex: 1,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        paddingHorizontal: 15,
        marginRight: 12,
    },
});

const storyStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    progressContainer: { flexDirection: 'row', position: 'absolute', top: 50, left: 10, right: 10, zIndex: 10 },
    progressBarBg: { height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
    progressBarFill: { height: 2, backgroundColor: '#FFF', borderRadius: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: 65, left: 0, right: 0, paddingHorizontal: 20, zIndex: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    headerName: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    headerTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
    storyImage: { width: width, height: '100%' },
    textStoryContainer: { flex: 1, width: width, justifyContent: 'center', alignItems: 'center', padding: 30 },
    textStoryContent: { color: '#FFF', fontSize: 30, fontWeight: 'bold', textAlign: 'center' },
    tapZones: { position: 'absolute', top: 120, bottom: 0, left: 0, right: 0, flexDirection: 'row', zIndex: 5 },
    tapLeft: { flex: 1 },
    tapRight: { flex: 2 }
});
