import MarkdownText from '@/components/social/MarkdownText';
import { paymentApi, socialApi, userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Linking,
    Modal,
    Pressable,
    SafeAreaView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface Comment { id: string; userId: string; userName: string; text: string; createdAt: number; }
interface Post { id: string; userId: string; userName: string; text: string; mediaUri?: string; mediaType?: 'image' | 'video' | 'document'; fileName?: string; likesCount: number; commentsCount: number; createdAt: number; likes?: Record<string, boolean>; comments?: Record<string, Comment>; }

export default function ProfileScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [user, setUser] = useState<any>(null);
    const [myPosts, setMyPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPosting, setIsPosting] = useState(false);

    // Modals
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isPostModalVisible, setIsPostModalVisible] = useState(false);
    const [isCommentModalVisible, setIsCommentModalVisible] = useState(false);
    const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [bankConnected, setBankConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Form states
    const [newPostText, setNewPostText] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
    const [inlineCommentState, setInlineCommentState] = useState<Record<string, string>>({});
    const [reportType, setReportType] = useState('Spam');
    const [reportDesc, setReportDesc] = useState('');

    useEffect(() => { loadProfileAndPosts(); }, []);

    const loadProfileAndPosts = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                const profRes = await userApi.getProfile(parsed.uid);
                if (profRes.data.success) setUser(profRes.data.user);
                const postsRes = await socialApi.getPosts();
                if (postsRes.data.success) setMyPosts(postsRes.data.posts.filter((p: any) => p.userId === parsed.uid));
                // Check bank status for teachers
                if (parsed.role === 'teacher') {
                    try {
                        const statusRes = await paymentApi.getOnboardStatus(parsed.uid);
                        if (statusRes.data.success) setBankConnected(statusRes.data.onboarded);
                    } catch (e) { }
                }
            }
        } catch (e) { } finally { setIsLoading(false); }
    };

    const handleConnectBank = async () => {
        if (!user) return;
        setIsConnecting(true);
        try {
            const res = await paymentApi.onboardTeacher({ teacherId: user.uid, email: user.email, teacherName: user.fullName });
            if (res.data.success && res.data.url) {
                await Linking.openURL(res.data.url);
            }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to connect.');
        } finally { setIsConnecting(false); }
    };

    const pickMedia = async (type: 'image' | 'video') => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) return Alert.alert('Denied', 'Allow gallery access.');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos, allowsEditing: true, quality: 1 });
        if (!result.canceled) setSelectedMedia({ uri: result.assets[0].uri, type });
    };

    const handleAddPost = async () => {
        if (!newPostText.trim() && !selectedMedia) return;
        setIsPosting(true);
        try {
            const resp = await socialApi.createPost({ userId: user.uid, userName: user.fullName, text: newPostText.trim(), mediaUri: selectedMedia?.uri, mediaType: selectedMedia?.type });
            if (resp.data.success) { setNewPostText(''); setSelectedMedia(null); setIsPostModalVisible(false); loadProfileAndPosts(); }
        } catch (e) { } finally { setIsPosting(false); }
    };

    const handleSharePost = async (post: Post) => {
        try { await Share.share({ message: `${post.userName} shared on Learnova.` }); } catch (e) { }
    };

    const handleLikePost = async (postId: string) => {
        if (!user) return;
        try { await socialApi.likePost({ postId, userId: user.uid }); loadProfileAndPosts(); } catch (e) { }
    };

    const handleInlineComment = async (postId: string) => {
        const text = inlineCommentState[postId];
        if (!text?.trim() || !user) return;
        try { await socialApi.commentPost({ postId, userId: user.uid, userName: user.fullName, text: text.trim() }); setInlineCommentState({ ...inlineCommentState, [postId]: '' }); loadProfileAndPosts(); } catch (e) { }
    };

    const renderPost = ({ item }: { item: Post }) => {
        const isLiked = item.likes && user && item.likes[user.uid];
        return (
            <View style={[styles.fullScreenPostCard, { backgroundColor: colors.card }]}>
                <View style={styles.postHeader}><View style={[styles.smallAvatar, { backgroundColor: colors.primary }]}><Text style={styles.smallAvatarText}>{item.userName.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={[styles.postUserName, { color: colors.text }]}>{item.userName}</Text><Text style={[styles.postTime, { color: colors.textSecondary }]}>Recently</Text></View><TouchableOpacity onPress={() => { setSelectedPost(item); setIsOptionsMenuVisible(true); }}><Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} /></TouchableOpacity></View>
                <View style={{ paddingHorizontal: 15, paddingBottom: 10 }}>{item.text ? <MarkdownText content={item.text} textColor={colors.text} /> : null}</View>
                {item.mediaUri && item.mediaType === 'image' && <Image source={{ uri: item.mediaUri }} style={styles.postFullImage} resizeMode="contain" />}
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.postActions}><TouchableOpacity style={styles.postActionItem} onPress={() => handleLikePost(item.id)}><Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#FF4444" : colors.text} /><Text style={[styles.postActionText, { color: isLiked ? "#FF4444" : colors.text }]}>{item.likesCount || 0}</Text></TouchableOpacity><TouchableOpacity style={styles.postActionItem} onPress={() => { setSelectedPost(item); setIsCommentModalVisible(true); }}><Ionicons name="chatbubble-outline" size={20} color={colors.text} /><Text style={[styles.postActionText, { color: colors.text }]}>{item.commentsCount || 0}</Text></TouchableOpacity><TouchableOpacity style={styles.postActionItem} onPress={() => handleSharePost(item)}><Ionicons name="share-social-outline" size={20} color={colors.text} /><Text style={[styles.postActionText, { color: colors.text }]}>Share</Text></TouchableOpacity></View>
                <View style={[styles.inlineCommentBox, { borderTopColor: colors.border }]}><TextInput style={[styles.inlineCommentInput, { backgroundColor: isDark ? colors.background : '#F0F2F5', color: colors.text }]} placeholder="Add comment..." placeholderTextColor={colors.textSecondary} value={inlineCommentState[item.id] || ''} onChangeText={(t) => setInlineCommentState({ ...inlineCommentState, [item.id]: t })} onSubmitEditing={() => handleInlineComment(item.id)} /></View>
            </View>
        );
    };

    const renderHeader = () => (
        <View>
            <View style={[styles.pageTitleHeader, { backgroundColor: colors.background }]}><Text style={[styles.pageTitle, { color: colors.text }]}>My Profile Overview</Text></View>
            <View style={[styles.coverContainer, { backgroundColor: isDark ? '#1A1A2E' : '#E0E7FF' }]}><Image source={{ uri: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80' }} style={styles.coverPhoto} /></View>
            <View style={[styles.profileTop, { backgroundColor: colors.card }]}><View style={styles.avatarMainOuter}><View style={[styles.avatarMain, { borderColor: colors.card, backgroundColor: colors.primary }]}><Text style={styles.avatarMainText}>{user?.fullName?.charAt(0)}</Text></View></View><View style={styles.nameContainer}><Text style={[styles.profileName, { color: colors.text }]}>{user?.fullName}</Text><Text style={[styles.profileBio, { color: colors.textSecondary }]}>Learnova Member</Text></View><View style={styles.actionRow}><TouchableOpacity style={[styles.mainActionBtn, { backgroundColor: colors.primary }]} onPress={() => setIsPostModalVisible(true)}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>What's on your mind?</Text></TouchableOpacity><TouchableOpacity style={[styles.secondaryActionBtn, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} onPress={() => setIsSettingsVisible(true)}><Ionicons name="settings-outline" size={20} color={colors.text} /></TouchableOpacity></View></View>
            <View style={styles.postsHeader}><Text style={[styles.postsTitle, { color: colors.text }]}>Your Posts</Text></View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F0F2F5' }]}>
            <FlatList data={myPosts} renderItem={renderPost} keyExtractor={item => item.id} ListHeaderComponent={renderHeader} showsVerticalScrollIndicator={false} refreshing={isLoading} onRefresh={loadProfileAndPosts} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }} />

            <Modal visible={isPostModalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.postModalBox, { backgroundColor: colors.card, height: '70%', marginTop: 'auto', borderTopLeftRadius: 25, borderTopRightRadius: 25 }]}>
                        <View style={styles.modalHeader}><TouchableOpacity onPress={() => { setIsPostModalVisible(false); setSelectedMedia(null); }}><Text>Cancel</Text></TouchableOpacity><Text style={[styles.modalTitle, { color: colors.text }]}>New Update</Text><TouchableOpacity onPress={handleAddPost}><Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Post</Text></TouchableOpacity></View>
                        <TextInput style={{ color: colors.text, fontSize: 16, flex: 1, textAlignVertical: 'top' }} placeholder="What's update?" placeholderTextColor={colors.textSecondary} multiline autoFocus value={newPostText} onChangeText={setNewPostText} />
                        {selectedMedia && (
                            <View style={styles.previewContainer}>
                                {selectedMedia.type === 'image' ? <Image source={{ uri: selectedMedia.uri }} style={styles.mediaPreview} /> : <View style={[styles.mediaPreview, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }]}><Ionicons name="videocam" size={40} color="#FFF" /></View>}
                                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setSelectedMedia(null)}><Ionicons name="close-circle" size={24} color="#FF4444" /></TouchableOpacity>
                            </View>
                        )}
                        <View style={styles.mediaOptionsRow}>
                            <TouchableOpacity style={styles.mediaOptBtn} onPress={() => pickMedia('image')}><Ionicons name="image-outline" size={26} color="#4CAF50" /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Photo</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.mediaOptBtn} onPress={() => pickMedia('video')}><Ionicons name="videocam-outline" size={26} color="#F44336" /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Video</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={isOptionsMenuVisible} transparent={true} animationType="fade"><Pressable style={styles.modalOverlay} onPress={() => setIsOptionsMenuVisible(false)}><View style={[styles.menuContent, { backgroundColor: colors.card }]}><TouchableOpacity style={styles.menuItem} onPress={() => { setIsOptionsMenuVisible(false); setIsReportModalVisible(true); }}><Ionicons name="flag-outline" size={24} color={colors.text} /><Text style={[styles.menuText, { color: colors.text }]}>Report Post</Text></TouchableOpacity><TouchableOpacity style={styles.menuItem} onPress={() => { setIsOptionsMenuVisible(false); Alert.alert("Delete", "Permanently?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: async () => { await socialApi.deletePost(selectedPost!.id); loadProfileAndPosts(); } }]); }}><Ionicons name="trash-outline" size={24} color="#FF4444" /><Text style={[styles.menuText, { color: '#FF4444' }]}>Delete Post</Text></TouchableOpacity></View></Pressable></Modal>

            {/* Settings Modal */}
            <Modal visible={isSettingsVisible} transparent={true} animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setIsSettingsVisible(false)}>
                    <View style={[styles.menuContent, { backgroundColor: colors.card, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingBottom: 40 }]} onStartShouldSetResponder={() => true}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: 15 }} />
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Settings</Text>
                        </View>

                        {/* Bank Account - Only for teachers */}
                        {user?.role === 'teacher' && (
                            <>
                                <TouchableOpacity
                                    style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 8 }]}
                                    onPress={handleConnectBank}
                                    disabled={isConnecting}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bankConnected ? '#27AE6020' : '#F2994A20', justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name={bankConnected ? "checkmark-circle" : "card-outline"} size={22} color={bankConnected ? '#27AE60' : '#F2994A'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.menuText, { color: colors.text }]}>{bankConnected ? 'Bank Account Connected' : 'Connect Bank Account'}</Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{bankConnected ? 'Your payouts are active' : 'Link via Stripe to receive earnings'}</Text>
                                    </View>
                                    {isConnecting ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 8 }]}
                                    onPress={() => { setIsSettingsVisible(false); router.push('/teacher/finance' as any); }}
                                >
                                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center' }}>
                                        <Ionicons name="wallet-outline" size={22} color={Colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.menuText, { color: colors.text }]}>Finance & Earnings</Text>
                                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>View payouts, revenue & history</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </>
                        )}

                        {/* Profile Info */}
                        <TouchableOpacity
                            style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderRadius: 14, padding: 16, marginBottom: 8 }]}
                            onPress={() => { setIsSettingsVisible(false); setIsEditModalVisible(true); }}
                        >
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#9B59B620', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="person-outline" size={22} color="#9B59B6" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuText, { color: colors.text }]}>Edit Profile</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Update your name, email & photo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>

                        {/* App Info */}
                        <View style={[styles.menuItem, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderRadius: 14, padding: 16 }]}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3498DB20', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="information-circle-outline" size={22} color="#3498DB" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.menuText, { color: colors.text }]}>App Version</Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>Learnova v1.0.0</Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    pageTitleHeader: { padding: 20, paddingTop: 10 },
    pageTitle: { fontSize: 24, fontWeight: 'bold' },
    coverContainer: { height: 160 },
    coverPhoto: { width: '100%', height: '100%' },
    profileTop: { paddingBottom: 20, alignItems: 'center' },
    avatarMainOuter: { marginTop: -50 },
    avatarMain: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    avatarMainText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
    nameContainer: { marginTop: 10, alignItems: 'center' },
    profileName: { fontSize: 20, fontWeight: 'bold' },
    profileBio: { fontSize: 13 },
    actionRow: { flexDirection: 'row', marginTop: 15, gap: 10, width: '90%' },
    mainActionBtn: { flex: 1, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    secondaryActionBtn: { width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    postsHeader: { padding: 15 },
    postsTitle: { fontSize: 16, fontWeight: 'bold' },
    fullScreenPostCard: { width: width, marginBottom: 10 },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 10 },
    postUserName: { fontWeight: 'bold' },
    postTime: { fontSize: 10 },
    postFullImage: { width: width, height: width, backgroundColor: '#000', marginTop: 8 },
    divider: { height: 1, marginHorizontal: 15 },
    postActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
    postActionItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    postActionText: { fontWeight: '600' },
    inlineCommentBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, gap: 10, borderTopWidth: 1 },
    inlineCommentInput: { flex: 1, height: 40, borderRadius: 20, paddingHorizontal: 15, fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    menuContent: { marginTop: 'auto', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
    menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 12 },
    menuText: { fontSize: 16, fontWeight: '600' },
    smallAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    smallAvatarText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    postModalBox: { width: '100%', padding: 20, alignSelf: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    modalTitle: { fontSize: 17, fontWeight: 'bold' },
    previewContainer: { height: 150, width: '100%', marginBottom: 15, position: 'relative' },
    mediaPreview: { width: '100%', height: '100%', borderRadius: 12 },
    removeMediaBtn: { position: 'absolute', top: -10, right: -10, backgroundColor: '#FFF', borderRadius: 12 },
    mediaOptionsRow: { flexDirection: 'row', paddingVertical: 15, gap: 15, borderTopWidth: 1, borderTopColor: '#EEE' },
    mediaOptBtn: { alignItems: 'center', gap: 4 }
});
