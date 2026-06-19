import CustomVideoPlayer from '@/components/social/CustomVideoPlayer';
import MarkdownText from '@/components/social/MarkdownText';
import { socialApi, userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { storage } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
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

export default function UserProfileScreen() {
    const { userId } = useLocalSearchParams<{ userId: string }>();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const isFocused = useIsFocused();

    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState<any>({ followers: 0, following: 0, posts: 0 });
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isFollowingAction, setIsFollowingAction] = useState(false);

    // Add additional states for interactivity
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [inlineCommentState, setInlineCommentState] = useState<Record<string, string>>({});
    const [followingIds, setFollowingIds] = useState<string[]>([]);
    const [visiblePostId, setVisiblePostId] = useState<string | null>(null);

    // Edit Profile States
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [newPhoto, setNewPhoto] = useState<any>(null);
    const [newBanner, setNewBanner] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadProfileData();
    }, [userId]);

    const loadProfileData = async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            const currentUser = userData ? JSON.parse(userData) : null;
            setCurrentUser(currentUser);

            // Fetch profile and stats
            const profileResp = await socialApi.getUserProfile(userId);
            if (profileResp.data.success) {
                setProfile(profileResp.data.user);
                setStats(profileResp.data.stats);
            }

            // Fetch posts
            const postsResp = await socialApi.getUserPosts(userId);
            if (postsResp.data.success) {
                setUserPosts(postsResp.data.posts);
            }

            // Check follow status
            if (currentUser && currentUser.uid !== userId) {
                const followResp = await socialApi.checkFollowStatus(currentUser.uid, userId);
                setIsFollowing(followResp.data.isFollowing);

                const myFollowing = await socialApi.getFollowingIds(currentUser.uid);
                if (myFollowing.data.success) {
                    setFollowingIds(myFollowing.data.followingIds);
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser || isFollowingAction) return;
        setIsFollowingAction(true);
        try {
            const resp = await socialApi.followUser({
                followerId: currentUser.uid,
                followingId: userId!,
                followerName: currentUser.fullName
            });
            if (resp.data.success) {
                setIsFollowing(resp.data.followed);
                // Update stats locally
                setStats((prev: any) => ({
                    ...prev,
                    followers: resp.data.followed ? prev.followers + 1 : prev.followers - 1
                }));
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to update follow status');
        } finally {
            setIsFollowingAction(false);
        }
    };

    const handleLikePost = async (postId: string) => {
        if (!currentUser) return;
        try {
            const resp = await socialApi.likePost({ postId, userId: currentUser.uid, userName: currentUser.fullName });
            if (resp.data.success) {
                setUserPosts(prev => prev.map(p => {
                    if (p.id === postId) {
                        const likes = { ...(p.likes || {}) };
                        if (resp.data.liked) {
                            likes[currentUser.uid] = true;
                            return { ...p, likes, likesCount: p.likesCount + 1 };
                        } else {
                            delete likes[currentUser.uid];
                            return { ...p, likes, likesCount: p.likesCount - 1 };
                        }
                    }
                    return p;
                }));
            }
        } catch (e) { }
    };

    const handleInlineComment = async (postId: string) => {
        const text = inlineCommentState[postId];
        if (!text || !currentUser) return;
        try {
            const resp = await socialApi.commentPost({ postId, userId: currentUser.uid, userName: currentUser.fullName, text });
            if (resp.data.success) {
                setInlineCommentState({ ...inlineCommentState, [postId]: '' });
                setUserPosts(prev => prev.map(p => p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p));
                Alert.alert('Success', 'Comment posted!');
            }
        } catch (e) { }
    };

    const handleSharePost = async (post: any) => {
        try {
            await Share.share({
                message: post.text || 'Check out this post on Learnova!',
                url: post.mediaUri || undefined
            });
        } catch (e) { }
    };

    const formatTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const pickImage = async (type: 'photo' | 'banner') => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: type === 'banner' ? [2, 1] : [1, 1],
                quality: 0.5,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                if (type === 'photo') setNewPhoto(result.assets[0]);
                else setNewBanner(result.assets[0]);
            }
        } catch (err) {
            console.error('ImagePicker Error', err);
        }
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            let photoUrl = profile?.photoUrl || null;
            let bannerUrl = profile?.bannerUrl || null;

            const uploadToFirebase = async (uri: string, path: string) => {
                const resp = await fetch(uri);
                const blob = await resp.blob();
                const fileRef = storageRef(storage, path);
                await uploadBytes(fileRef, blob);
                return await getDownloadURL(fileRef);
            };

            if (newPhoto) {
                if (newPhoto.uri === 'remove') photoUrl = null;
                else photoUrl = await uploadToFirebase(newPhoto.uri, `profiles/${currentUser.uid}/photo_${Date.now()}`);
            }
            if (newBanner) {
                if (newBanner.uri === 'remove') bannerUrl = null;
                else bannerUrl = await uploadToFirebase(newBanner.uri, `profiles/${currentUser.uid}/banner_${Date.now()}`);
            }

            const updateData = { fullName: editName, bio: editBio, photoUrl, bannerUrl };
            const resp = await userApi.updateProfile(currentUser.uid, updateData);

            if (resp.data.success) {
                // Update local profile view
                setProfile({ ...profile, ...updateData });

                // Update AsyncStorage currentUser
                const updatedUser = { ...currentUser, ...updateData };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                setCurrentUser(updatedUser);

                Alert.alert('Success', 'Profile updated successfully!');
                setIsEditModalVisible(false);
            }
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderHeader = () => (
        <View style={{ backgroundColor: colors.background }}>
            {/* Cover Photo */}
            <View style={[styles.coverContainer, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                {/* Fixed Back Button here instead of topNav for FB feel */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtnFloating, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                {profile?.bannerUrl ? (
                    <Image
                        source={{ uri: profile.bannerUrl }}
                        style={styles.coverImg}
                        contentFit="cover"
                    />
                ) : (
                    <View style={styles.coverImg} />
                )}
            </View>

            {/* Profile Info Overlay */}
            <View style={styles.profileInfoContainer}>
                <View style={[styles.avatarBorder, { borderColor: colors.background }]}>
                    <View style={[styles.avatarLarge, { backgroundColor: Colors.primary }]}>
                        {profile?.photoUrl ? (
                            <Image source={{ uri: profile.photoUrl }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarTextLarge}>{profile?.fullName?.charAt(0)}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.userDetails}>
                    <Text style={[styles.nameTextLarge, { color: colors.text }]}>{profile?.fullName}</Text>
                    <Text style={[styles.roleTextFB, { color: colors.textSecondary }]}>{profile?.role?.toUpperCase() || 'LEARNOVA MEMBER'}</Text>
                    {profile?.bio ? <Text style={[styles.bioText, { color: colors.textSecondary }]}>{profile.bio}</Text> : null}
                </View>

                <View style={styles.statsRowFB}>
                    <View style={styles.statItemFB}>
                        <Text style={[styles.statValueFB, { color: colors.text }]}>{stats.followers}</Text>
                        <Text style={[styles.statLabelFB, { color: colors.textSecondary }]}>Followers</Text>
                    </View>
                    <View style={styles.statItemFB}>
                        <Text style={[styles.statValueFB, { color: colors.text }]}>{stats.following}</Text>
                        <Text style={[styles.statLabelFB, { color: colors.textSecondary }]}>Following</Text>
                    </View>
                    <View style={styles.statItemFB}>
                        <Text style={[styles.statValueFB, { color: colors.text }]}>{stats.posts}</Text>
                        <Text style={[styles.statLabelFB, { color: colors.textSecondary }]}>Posts</Text>
                    </View>
                </View>

                {currentUser?.uid !== userId && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[
                                styles.followBtnFB,
                                { backgroundColor: isFollowing ? colors.border : Colors.primary }
                            ]}
                            onPress={handleFollow}
                            disabled={isFollowingAction}
                        >
                            {isFollowingAction ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={isFollowing ? "checkmark" : "person-add"}
                                        size={18}
                                        color={isFollowing ? colors.text : '#FFF'}
                                        style={{ marginRight: 8 }}
                                    />
                                    <Text style={[styles.followBtnTextFB, { color: isFollowing ? colors.text : '#FFF' }]}>
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.msgBtnFB, { backgroundColor: colors.border }]}
                            onPress={() => router.push(`/chat/${userId}?name=${encodeURIComponent(profile?.fullName || 'User')}` as any)}
                        >
                            <Ionicons name="chatbubble-outline" size={18} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                )}

                {currentUser?.uid === userId && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.followBtnFB, { backgroundColor: isDark ? colors.border : '#E0E0E0' }]}
                            onPress={() => {
                                setEditName(profile?.fullName || '');
                                setEditBio(profile?.bio || '');
                                setNewPhoto(null);
                                setNewBanner(null);
                                setIsEditModalVisible(true);
                            }}
                        >
                            <Ionicons name="pencil" size={18} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={[styles.followBtnTextFB, { color: colors.text }]}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Posts</Text>
        </View>
    );

    const renderPostItem = ({ item }: { item: any }) => {
        const isLiked = item.likes && currentUser && item.likes[currentUser.uid];
        const isFollowingPost = followingIds.includes(item.userId);
        const isOwnPost = currentUser?.uid === item.userId;

        return (
            <View style={[styles.fullScreenPost, { backgroundColor: colors.card, marginBottom: 10 }]}>
                <View style={styles.postHeader}>
                    <View style={[styles.avatarSmall, { backgroundColor: Colors.primary }]}>
                        {profile?.photoUrl ? (
                            <Image source={{ uri: profile.photoUrl }} style={styles.avatarImg} />
                        ) : (
                            <Text style={styles.avatarTextSmall}>{profile?.fullName?.charAt(0)}</Text>
                        )}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.userNamePost, { color: colors.text }]}>{profile?.fullName}</Text>
                        <Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatTime(item.createdAt)}</Text>
                    </View>
                </View>

                <View style={styles.postContent}>
                    {item.text ? (
                        <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>
                            <MarkdownText content={item.text} textColor={colors.text} />
                        </View>
                    ) : null}

                    {item.mediaUri && item.mediaType === 'image' && (
                        <Image
                            source={{ uri: item.mediaUri }}
                            style={styles.fullWidthPostImage}
                            resizeMode="cover"
                        />
                    )}

                    {item.mediaUri && item.mediaType === 'video' && (
                        <CustomVideoPlayer uri={item.mediaUri} shouldPlay={isFocused && visiblePostId === item.id} />
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                <View style={styles.postFooter}>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleLikePost(item.id)}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#FF4444" : colors.text} />
                        <Text style={[styles.footerText, { color: isLiked ? "#FF4444" : colors.text }]}>{item.likesCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => { setSelectedPost(item); setIsCommentModalVisible(true); }}>
                        <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
                        <Text style={[styles.footerText, { color: colors.text }]}>{item.commentsCount || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.footerAction} onPress={() => handleSharePost(item)}>
                        <Ionicons name="share-social-outline" size={20} color={colors.text} />
                        <Text style={[styles.footerText, { color: colors.text }]}>Share</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.inlineCommentRow, { borderTopColor: colors.border }]}>
                    <View style={[styles.tinyAvatar, { backgroundColor: isDark ? '#1A2744' : '#F0F9FF' }]}>
                        <Text style={[styles.tinyAvatarText, { color: Colors.primary }]}>{currentUser?.fullName?.charAt(0)}</Text>
                    </View>
                    <TextInput
                        style={[styles.inlineInput, { backgroundColor: isDark ? colors.background : '#F0F2F5', color: colors.text }]}
                        placeholder="Write a comment..."
                        placeholderTextColor={colors.textSecondary}
                        value={inlineCommentState[item.id] || ''}
                        onChangeText={(txt) => setInlineCommentState({ ...inlineCommentState, [item.id]: txt })}
                        onSubmitEditing={() => handleInlineComment(item.id)}
                    />
                    <TouchableOpacity onPress={() => handleInlineComment(item.id)} style={[styles.sendBtn, { backgroundColor: Colors.primary }]}>
                        <Ionicons name="send" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

            <FlatList
                data={userPosts}
                renderItem={renderPostItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                onViewableItemsChanged={({ viewableItems }) => {
                    const firstVisible = viewableItems.find((v: any) => v.item && v.item.id);
                    if (firstVisible) {
                        setVisiblePostId(firstVisible.item.id);
                    } else {
                        setVisiblePostId(null);
                    }
                }}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            />

            {/* Comments Modal */}
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
                                        <View style={[styles.tinyAvatarPopup, { backgroundColor: Colors.primary }]}>
                                            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>{c.userName.charAt(0)}</Text>
                                        </View>
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

            {/* Edit Profile Modal */}
            <Modal visible={isEditModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsEditModalVisible(false)} />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={[styles.editModalFull, { backgroundColor: colors.card }]}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 250 }}>
                            {/* Banner Edit */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.labelStyles, { color: colors.textSecondary }]}>Banner Image</Text>
                                {(newBanner?.uri !== 'remove') && (profile?.bannerUrl || (newBanner && newBanner.uri)) && (
                                    <TouchableOpacity onPress={() => setNewBanner({ uri: 'remove' })}>
                                        <Text style={{ color: colors.danger, fontSize: 13, fontWeight: 'bold' }}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => pickImage('banner')} style={[styles.bannerEditBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                {newBanner && newBanner.uri !== 'remove' ? (
                                    <Image source={{ uri: newBanner.uri }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                                ) : (profile?.bannerUrl && (!newBanner || newBanner.uri !== 'remove')) ? (
                                    <Image source={{ uri: profile.bannerUrl }} style={{ width: '100%', height: '100%', borderRadius: 10 }} />
                                ) : (
                                    <Ionicons name="camera-outline" size={30} color={colors.textSecondary} />
                                )}
                            </TouchableOpacity>

                            {/* Photo Edit */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 }}>
                                <Text style={[styles.labelStyles, { color: colors.textSecondary, marginTop: 0 }]}>Profile Picture</Text>
                                {(newPhoto?.uri !== 'remove') && (profile?.photoUrl || (newPhoto && newPhoto.uri)) && (
                                    <TouchableOpacity onPress={() => setNewPhoto({ uri: 'remove' })}>
                                        <Text style={{ color: colors.danger, fontSize: 13, fontWeight: 'bold' }}>Remove</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => pickImage('photo')} style={[styles.photoEditBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                {newPhoto && newPhoto.uri !== 'remove' ? (
                                    <Image source={{ uri: newPhoto.uri }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                                ) : (profile?.photoUrl && (!newPhoto || newPhoto.uri !== 'remove')) ? (
                                    <Image source={{ uri: profile.photoUrl }} style={{ width: '100%', height: '100%', borderRadius: 50 }} />
                                ) : (
                                    <Ionicons name="person-outline" size={30} color={colors.textSecondary} />
                                )}
                            </TouchableOpacity>

                            {/* Name Edit */}
                            <Text style={[styles.labelStyles, { color: colors.textSecondary }]}>Full Name</Text>
                            <TextInput
                                style={[styles.inputEdit, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter your full name"
                                placeholderTextColor={colors.textSecondary}
                            />

                            {/* Bio Edit */}
                            <Text style={[styles.labelStyles, { color: colors.textSecondary }]}>Bio</Text>
                            <TextInput
                                style={[styles.inputEdit, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 80, textAlignVertical: 'top' }]}
                                value={editBio}
                                onChangeText={setEditBio}
                                multiline
                                placeholder="Write something about yourself"
                                placeholderTextColor={colors.textSecondary}
                            />

                            {/* Update Button */}
                            <TouchableOpacity
                                style={[styles.saveProfileBtn, { backgroundColor: Colors.primary }]}
                                onPress={handleSaveProfile}
                                disabled={isSaving}
                            >
                                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveProfileBtnText}>Save Profile</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    coverContainer: { height: 220, width: '100%', position: 'relative' },
    coverImg: { width: '100%', height: '100%' },
    backBtnFloating: { position: 'absolute', top: 50, left: 15, zIndex: 10, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    profileInfoContainer: { paddingHorizontal: 15, marginTop: -60, alignItems: 'center' },
    avatarBorder: { borderWidth: 4, borderRadius: 84 },
    avatarLarge: { width: 150, height: 150, borderRadius: 75, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarTextLarge: { color: '#FFF', fontSize: 60, fontWeight: 'bold' },
    userDetails: { alignItems: 'center', marginTop: 10 },
    nameTextLarge: { fontSize: 24, fontWeight: 'bold' },
    roleTextFB: { fontSize: 14, marginTop: 4, fontWeight: '500' },
    statsRowFB: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 30, marginTop: 20 },
    statItemFB: { alignItems: 'center' },
    statValueFB: { fontSize: 18, fontWeight: 'bold' },
    statLabelFB: { fontSize: 12 },
    actionRow: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 25, paddingHorizontal: 10 },
    followBtnFB: { flex: 1, height: 40, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    msgBtnFB: { width: 45, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    followBtnTextFB: { fontWeight: 'bold', fontSize: 15 },
    sectionDivider: { height: 8, marginTop: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', padding: 15 },

    // Post Styles (Synced with Social Feed)
    fullScreenPost: { width: width, borderBottomWidth: 0.5 },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
    avatarSmall: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarTextSmall: { color: '#FFF', fontWeight: 'bold' },
    userNamePost: { fontWeight: 'bold', fontSize: 15 },
    postTime: { fontSize: 12, marginTop: 2 },
    postContent: { width: '100%' },
    fullWidthPostImage: { width: width, height: 300, backgroundColor: '#000' },
    divider: { height: 0.5, marginHorizontal: 15 },
    postFooter: { flexDirection: 'row', padding: 15, justifyContent: 'space-between', alignItems: 'center' },
    footerAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 14, fontWeight: '500' },
    inlineCommentRow: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingHorizontal: 15, gap: 10, borderTopWidth: 0.5 },
    tinyAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tinyAvatarText: { fontSize: 12, fontWeight: 'bold' },
    inlineInput: { flex: 1, height: 36, borderRadius: 18, paddingHorizontal: 15, fontSize: 14 },
    sendBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    commentModalFull: { height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    commentItem: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    tinyAvatarPopup: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    commentBubble: { flex: 1, padding: 10, borderRadius: 15 },
    commentName: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
    bioText: { marginTop: 10, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },

    // Edit Modal Styles
    editModalFull: { width: '100%', height: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    labelStyles: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, marginTop: 15 },
    bannerEditBox: { width: '100%', height: 120, borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    photoEditBox: { width: 100, height: 100, borderWidth: 1, borderStyle: 'dashed', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 10, alignSelf: 'center' },
    inputEdit: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15 },
    saveProfileBtn: { marginTop: 30, padding: 15, borderRadius: 10, alignItems: 'center' },
    saveProfileBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
