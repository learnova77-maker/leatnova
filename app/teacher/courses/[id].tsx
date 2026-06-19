import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
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
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Lecture {
    id: string;
    title: string;
    duration: string;
    type: 'Video' | 'Live' | 'PDF';
    isPreviewFree: boolean;
    url?: string;
    videoUrl?: string; // For uploaded videos
    scheduledAt?: string;
    isUploading?: boolean;
    uploadProgress?: number;
}

interface Module {
    id: string;
    title: string;
    thumbnail?: string; // Added thumbnail
    lectures: Lecture[];
}

const btoa = (input: string) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = input;
    let output = '';
    for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
        charCode = str.charCodeAt(i += 3 / 4);
        if (charCode > 0xFF) { throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range."); }
        block = block << 8 | charCode;
    }
    return output;
};

export default function TeacherCourses() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    // Current course ID from route
    const currentCourseId = id as string;

    // State for Modules
    const [modules, setModules] = useState<Module[]>([]);
    const [courseInfo, setCourseInfo] = useState<any>(null);
    const [selectedPreviewVideo, setSelectedPreviewVideo] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(true);

    const previewPlayer = useVideoPlayer(selectedPreviewVideo, player => {
        if (selectedPreviewVideo) {
            player.loop = false;
            player.play();
        }
    });

    useEffect(() => {
        const statusSub = previewPlayer.addListener('statusChange', ({ status }) => {
            if (status === 'readyToPlay') {
                setIsPreviewLoading(false);
            }
        });

        const playingSub = previewPlayer.addListener('playingChange', (isPlaying) => {
            if (isPlaying) setIsPreviewLoading(false);
        });

        const timeSub = previewPlayer.addListener('timeUpdate', (event) => {
            if (isPreviewLoading && event.currentTime > 0) {
                setIsPreviewLoading(false);
            }
        });

        return () => {
            statusSub.remove();
            playingSub.remove();
            timeSub.remove();
        };
    }, [previewPlayer, isPreviewLoading]);

    useEffect(() => {
        if (selectedPreviewVideo) {
            setIsPreviewLoading(true);
        }
    }, [selectedPreviewVideo]);

    const fetchCurriculum = async () => {
        setIsFetching(true);
        try {
            const response = await courseApi.getCourseDetails(currentCourseId);
            if (response.data.success) {
                const courseData = response.data.course;
                setCourseInfo(courseData);

                if (courseData.modules) {
                    const modulesData = courseData.modules;
                    const formattedModules = Object.keys(modulesData).map(mKey => ({
                        id: mKey,
                        title: modulesData[mKey].title,
                        lectures: modulesData[mKey].lectures
                            ? Object.keys(modulesData[mKey].lectures).map(lKey => ({
                                id: lKey,
                                ...modulesData[mKey].lectures[lKey]
                            }))
                            : []
                    }));
                    setModules(formattedModules);
                }
            }
        } catch (err) {
            console.error('Error fetching curriculum:', err);
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        if (currentCourseId) {
            fetchCurriculum();
        }
    }, [currentCourseId]);

    // UI state for Modals
    const [isModuleModalVisible, setIsModuleModalVisible] = useState(false);
    const [isLectureModalVisible, setIsLectureModalVisible] = useState(false);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [editingModule, setEditingModule] = useState<Module | null>(null);

    // Form inputs for Module
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleThumbnail, setModuleThumbnail] = useState<string | null>(null);

    // Form inputs for Lecture
    const [lectureTitle, setLectureTitle] = useState('');
    const [lectureUrl, setLectureUrl] = useState(''); // Text input for link
    const [lectureVideo, setLectureVideo] = useState<string | null>(null); // For uploaded file
    const [lectureDuration, setLectureDuration] = useState('');
    const [lectureType, setLectureType] = useState<'Video' | 'Live' | 'PDF'>('Video');
    const [uploadProgress, setUploadProgress] = useState(0); // For video upload progress
    const [compressionProgress, setCompressionProgress] = useState(0); // For compression progress
    const [isCompressing, setIsCompressing] = useState(false);
    const [uploadTaskRef, setUploadTaskRef] = useState<any>(null); // For canceling firebase upload
    const [scheduledAt, setScheduledAt] = useState('');
    const [isPreviewFree, setIsPreviewFree] = useState(false);
    const [isLiveToggle, setIsLiveToggle] = useState(false);
    const [liveDate, setLiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [liveTime, setLiveTime] = useState('10:00 AM');
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [showTimeModal, setShowTimeModal] = useState(false);
    const [isManualTimeMode, setIsManualTimeMode] = useState(false);
    const [isManualDateMode, setIsManualDateMode] = useState(false);

    // Generate next 14 days for date selection
    const getNext14Days = () => {
        const days: any[] = [];
        for (let i = 0; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            days.push({
                full: date.toISOString().split('T')[0],
                dayNum: date.getDate(),
                dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
                month: date.toLocaleDateString('en-US', { month: 'short' })
            });
        }
        return days;
    };

    const formatScheduleDate = () => {
        return `${liveDate} ${liveTime}`.trim();
    };

    // --- Media Picking ---
    const pickModuleImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });
        if (!result.canceled) setModuleThumbnail(result.assets[0].uri);
    };

    const pickLectureVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsEditing: true,
            quality: 0.7,
        });
        if (!result.canceled) setLectureVideo(result.assets[0].uri);
    };

    // --- Module Actions ---
    const handleAddModule = async () => {
        if (!moduleTitle.trim()) return;

        setIsLoading(true);
        try {
            if (editingModule) {
                const response = await courseApi.updateModule(currentCourseId, editingModule.id, { title: moduleTitle });
                if (response.data.success) {
                    setModules(modules.map(m => m.id === editingModule.id ? { ...m, title: moduleTitle, thumbnail: moduleThumbnail || undefined } : m));
                    Alert.alert('Success', 'Module updated successfully!');
                }
            } else {
                const response = await courseApi.addModule({
                    courseId: currentCourseId,
                    moduleTitle: moduleTitle,
                    thumbnail: moduleThumbnail // Added thumbnail
                });

                if (response.data.success) {
                    const newMod: Module = {
                        id: response.data.moduleId,
                        title: moduleTitle,
                        thumbnail: moduleThumbnail || undefined,
                        lectures: [],
                    };
                    setModules([...modules, newMod]);
                }
            }
            closeModuleModal();
        } catch (err) {
            Alert.alert('Error', 'Failed to save module. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const openEditModule = (module: Module) => {
        setEditingModule(module);
        setModuleTitle(module.title);
        setModuleThumbnail(module.thumbnail || null);
        setIsModuleModalVisible(true);
    };

    const handleDeleteModule = (id: string) => {
        Alert.alert(
            'Delete Module',
            'Are you sure you want to delete this module? This will also remove any lectures inside it.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await courseApi.deleteModule(currentCourseId, id);
                            if (res.data.success) {
                                setModules(modules.filter(m => m.id !== id));
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Failed to delete module from database. Please try again.');
                            console.error('Delete module error:', err);
                        }
                    }
                }
            ]
        );
    };

    const closeModuleModal = () => {
        setIsModuleModalVisible(false);
        setEditingModule(null);
        setModuleTitle('');
        setModuleThumbnail(null);
    };

    // --- Lecture Actions ---
    const handleAddLecture = () => {
        if (!lectureTitle.trim() || !activeModuleId) return;

        const targetModuleId = activeModuleId;
        const tempId = `temp_${Date.now()}`;
        const isLive = isLiveToggle;

        const tempLecture: Lecture = {
            id: tempId,
            title: lectureTitle,
            duration: lectureDuration || '00:00',
            type: isLive ? 'Live' : lectureType,
            isPreviewFree,
            url: lectureVideo || lectureUrl || '',
            scheduledAt: isLive ? formatScheduleDate() : '',
            isUploading: true,
            uploadProgress: 0,
        };

        // Instantly add to state so UI updates
        setModules(prev => prev.map(m =>
            m.id === targetModuleId ? { ...m, lectures: [...m.lectures, tempLecture] } : m
        ));

        // Start Background Process
        const backgroundProcess = async () => {
            try {
                let finalVideoUrl = lectureUrl;
                let calculatedDuration = tempLecture.duration;

                if (lectureVideo && !lectureVideo.startsWith('http')) {
                    let finalUri = lectureVideo;
                    if (Platform.OS === 'android' && !finalUri.startsWith('file://') && !finalUri.startsWith('content://')) {
                        finalUri = 'file://' + finalUri;
                    }

                    // Mux Integration
                    const MUX_TOKEN_ID = process.env.EXPO_PUBLIC_MUX_TOKEN_ID || 'dummy_token_id';
                    const MUX_TOKEN_SECRET = process.env.EXPO_PUBLIC_MUX_TOKEN_SECRET || 'dummy_token_secret';
                    const authString = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`);

                    let uploadUrl = '';
                    let uploadId = '';

                    try {
                        const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Basic ${authString}`
                            },
                            body: JSON.stringify({
                                cors_origin: "*",
                                new_asset_settings: {
                                    playback_policy: ["public"],
                                    video_quality: "basic"
                                }
                            })
                        });
                        const muxData = await muxRes.json();
                        if (muxData.data && muxData.data.url) {
                            uploadUrl = muxData.data.url;
                            uploadId = muxData.data.id;
                        } else {
                            throw new Error("Failed to get Mux upload URL");
                        }
                    } catch (e) {
                        throw new Error("Could not initialize Mux upload");
                    }

                    const uploadTask = FileSystem.createUploadTask(
                        uploadUrl,
                        finalUri,
                        {
                            httpMethod: 'PUT',
                            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                            headers: { 'Content-Type': 'video/mp4' }
                        },
                        (progressEvent) => {
                            const actualProgress = Math.round((progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend) * 100);
                            const progress = Math.min(actualProgress, 95);

                            setModules(prev => prev.map(m =>
                                m.id === targetModuleId ? {
                                    ...m,
                                    lectures: m.lectures.map(l =>
                                        l.id === tempId ? { ...l, uploadProgress: progress } : l
                                    )
                                } : m
                            ));
                        }
                    );

                    const uploadRes = await uploadTask.uploadAsync();
                    if (!uploadRes || uploadRes.status < 200 || uploadRes.status >= 300) {
                        throw new Error(`Mux Upload Error: ${uploadRes?.status} - ${uploadRes?.body}`);
                    }

                    // Poll Mux for playback ID
                    let assetId = null;
                    let playbackId = null;
                    let attempts = 0;

                    while (!playbackId && attempts < 20) {
                        setModules(prev => prev.map(m =>
                            m.id === targetModuleId ? {
                                ...m,
                                lectures: m.lectures.map(l =>
                                    l.id === tempId ? { ...l, uploadProgress: 95 + (Math.min(attempts, 4)) } : l
                                )
                            } : m
                        ));

                        await new Promise(r => setTimeout(r, 2500));
                        attempts++;
                        try {
                            const statusReq = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
                                headers: { Authorization: `Basic ${authString}` }
                            });
                            const statusData = await statusReq.json();
                            if (statusData.data?.asset_id) {
                                assetId = statusData.data.asset_id;

                                const assetReq = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
                                    headers: { Authorization: `Basic ${authString}` }
                                });
                                const assetData = await assetReq.json();
                                if (assetData.data?.playback_ids && assetData.data.playback_ids.length > 0) {
                                    playbackId = assetData.data.playback_ids[0].id;
                                    if (assetData.data.duration) {
                                        calculatedDuration = `${Math.floor(assetData.data.duration / 60).toString().padStart(2, '0')}:${Math.floor(assetData.data.duration % 60).toString().padStart(2, '0')}`;
                                    }
                                }
                            }
                        } catch (e) { }
                    }

                    if (playbackId) {
                        finalVideoUrl = `https://stream.mux.com/${playbackId}.m3u8`;
                    } else {
                        throw new Error("Mux video processing timed out");
                    }
                }

                const lectureData = {
                    courseId: currentCourseId,
                    moduleId: targetModuleId,
                    lectureTitle: tempLecture.title,
                    duration: calculatedDuration,
                    type: tempLecture.type,
                    isPreviewFree: tempLecture.isPreviewFree,
                    url: finalVideoUrl,
                    scheduledAt: tempLecture.scheduledAt
                };

                const response = await courseApi.addLecture(lectureData);

                if (response.data.success) {
                    setModules(prev => prev.map(m =>
                        m.id === targetModuleId ? {
                            ...m,
                            lectures: m.lectures.map(l =>
                                l.id === tempId ? { ...l, id: response.data.lectureId, url: finalVideoUrl, duration: calculatedDuration, isUploading: false } : l
                            )
                        } : m
                    ));
                } else {
                    throw new Error('Failed to save to database');
                }
            } catch (err: any) {
                console.error('Background Upload Failed:', err);
                // Remove the dummy file on failure
                setModules(prev => prev.map(m =>
                    m.id === targetModuleId ? { ...m, lectures: m.lectures.filter(l => l.id !== tempId) } : m
                ));
                Alert.alert('Upload Failed', `Could not upload lecture: ${tempLecture.title}`);
            }
        };

        backgroundProcess(); // No Await!
        closeLectureModal(); // Close Immediately
    };

    const closeLectureModal = () => {
        // Since we removed local compression, nothing to cancel here
        // if (isCompressing && lectureVideo) {
        //    try { VideoCompressor.cancelCompression(lectureVideo); } catch (e) { }
        // }
        if (uploadTaskRef && typeof uploadTaskRef.cancel === 'function') {
            try { uploadTaskRef.cancel(); } catch (e) { }
        }

        setIsLectureModalVisible(false);
        setActiveModuleId(null);
        setLectureTitle('');
        setLectureUrl('');
        setLectureVideo(null);
        setLectureDuration('');
        setLectureType('Video');
        setScheduledAt('');
        setIsPreviewFree(false);
        setIsLiveToggle(false);
        setUploadProgress(0);
        setCompressionProgress(0);
        setIsCompressing(false);
        setUploadTaskRef(null);
        setIsLoading(false);
        setLiveDate('');
        setLiveTime('');
    };

    const hasModules = modules.length > 0;
    const hasLectures = modules.some((m: any) => m.lectures && m.lectures.length > 0);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Manage Course"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
                role="teacher"
            />

            <View style={styles.screenContainer}>
                <FlatList
                    data={modules}
                    keyExtractor={(item) => item.id}
                    ListHeaderComponent={
                        <View style={styles.screenHeader}>
                            {(!hasModules || !hasLectures) && (
                                <View style={{ backgroundColor: '#FFF3CD', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#FFEEBA', flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="warning" size={20} color="#856404" />
                                    <Text style={{ color: '#856404', marginLeft: 8, fontSize: 13, flex: 1, fontWeight: '500' }}>
                                        {!hasModules
                                            ? "Your course isn't live. Please add a module to make it live."
                                            : "Your course isn't live. Please add a lecture to make it live."}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.titleRow}>
                                <View style={{ flex: 1, marginRight: 10 }}>
                                    <Text style={styles.screenTitle}>Curriculum</Text>
                                    <Text style={styles.screenSub}>Modules & Lectures</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.addBtn}
                                    onPress={() => setIsModuleModalVisible(true)}
                                >
                                    <Ionicons name="add" size={18} color={Colors.secondary} />
                                    <Text style={styles.addBtnText}>Add Module</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.moduleHeader, { flexDirection: 'row', alignItems: 'center', borderBottomColor: colors.border }]}>
                                {item.thumbnail && (
                                    <View style={[styles.moduleThumbBoxList, { backgroundColor: colors.surface }]}>
                                        <Image source={{ uri: item.thumbnail }} style={styles.moduleThumbImg} />
                                    </View>
                                )}
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.moduleTitle, { color: colors.text }]}>{item.title}</Text>
                                    <Text style={[styles.lectureCount, { color: colors.textSecondary }]}>{item.lectures.length} Lectures</Text>
                                </View>
                                <View style={styles.moduleActions}>
                                    <TouchableOpacity onPress={() => openEditModule(item)} style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="create-outline" size={18} color={Colors.primary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteModule(item.id)} style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="trash" size={18} color="#EB5757" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.lectureList}>
                                {item.lectures.map((lec) => (
                                    <TouchableOpacity
                                        key={lec.id}
                                        style={styles.lectureItem}
                                        onPress={() => {
                                            if (lec.type === 'Video' || lec.url || lec.videoUrl) {
                                                setSelectedPreviewVideo(lec.url || lec.videoUrl || '');
                                            } else {
                                                Alert.alert('Preview Unavailable', 'This lecture is not a recorded video.');
                                            }
                                        }}
                                    >
                                        <View style={[styles.lectureIconBox, { backgroundColor: colors.surface }]}>
                                            {lec.isUploading ? (
                                                <ActivityIndicator size="small" color={Colors.primary} />
                                            ) : (
                                                <Ionicons
                                                    name={lec.type === 'Video' ? 'play-circle' : lec.type === 'Live' ? 'videocam' : 'document-text'}
                                                    size={18}
                                                    color={colors.textSecondary}
                                                />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.lectureName, { color: colors.text }]}>{lec.title}</Text>
                                            {lec.isUploading ? (
                                                <Text style={[styles.lectureMeta, { color: Colors.primary, fontWeight: 'bold' }]}>Uploading... {lec.uploadProgress || 0}%</Text>
                                            ) : (
                                                <Text style={[styles.lectureMeta, { color: colors.textSecondary }]}>{lec.duration || '00:00'}</Text>
                                            )}
                                        </View>
                                        {lec.type === 'Video' && (
                                            <Ionicons name="play" size={16} color={Colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    style={[styles.addLectureBtn, { backgroundColor: isDark ? colors.surface : '#F0F9FF', borderColor: Colors.primary }]}
                                    onPress={() => {
                                        setActiveModuleId(item.id);
                                        // Pre-select toggle based on courseType
                                        const isLive = courseInfo?.courseType === 'live';
                                        setIsLiveToggle(isLive);
                                        setLectureType(isLive ? 'Live' : 'Video');
                                        setIsLectureModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="add" size={18} color={Colors.primary} />
                                    <Text style={styles.addLectureText}>Add Lecture</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    contentContainerStyle={{ paddingBottom: 150 }}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* --- Add/Edit Module Modal --- */}
            <Modal visible={isModuleModalVisible} animationType="fade" transparent onRequestClose={closeModuleModal}>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModuleModal}>
                        <View style={styles.blurOverlay} />
                    </Pressable>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeaderInner}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>{editingModule ? 'Edit Module' : 'Create Module'}</Text>
                                <TouchableOpacity onPress={closeModuleModal}>
                                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formItem}>
                                <Text style={[styles.label, { color: colors.text }]}>Module Title</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    placeholder="e.g. Getting Started"
                                    placeholderTextColor={colors.textSecondary}
                                    value={moduleTitle}
                                    onChangeText={setModuleTitle}
                                />
                            </View>

                            <View style={styles.formItem}>
                                <Text style={[styles.label, { color: colors.text }]}>Module Thumbnail</Text>
                                <TouchableOpacity style={[styles.imagePickerCompact, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickModuleImage}>
                                    {moduleThumbnail ? (
                                        <Image source={{ uri: moduleThumbnail }} style={styles.previewImage} />
                                    ) : (
                                        <View style={styles.imagePlaceholderCompact}>
                                            <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
                                            <Text style={[styles.imagePlaceholderTextCompact, { color: colors.textSecondary }]}>Add Thumbnail</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
                                onPress={handleAddModule}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={Colors.white} />
                                ) : (
                                    <Text style={styles.submitBtnText}>{editingModule ? 'Save Changes' : 'Create Module'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* --- Add Lecture Modal --- */}
            <Modal visible={isLectureModalVisible} animationType="fade" transparent onRequestClose={closeLectureModal}>
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeLectureModal}>
                        <View style={styles.blurOverlay} />
                    </Pressable>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                            <View style={styles.modalHeaderInner}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>{isLiveToggle ? 'Schedule Live Class' : 'New Video Lecture'}</Text>
                                <TouchableOpacity onPress={closeLectureModal}>
                                    <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                                <View style={styles.formItem}>
                                    <Text style={[styles.label, { color: colors.text }]}>Lecture Title</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        placeholder="e.g. Master React in 10 mins"
                                        placeholderTextColor={colors.textSecondary}
                                        value={lectureTitle}
                                        onChangeText={setLectureTitle}
                                    />
                                </View>

                                {!isLiveToggle && courseInfo?.courseType !== 'live' && (
                                    <View style={styles.formItem}>
                                        <Text style={[styles.label, { color: colors.text }]}>Video File</Text>
                                        <TouchableOpacity style={[styles.imagePickerCompact, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={pickLectureVideo}>
                                            {lectureVideo ? (
                                                <View style={styles.imagePlaceholderCompact}>
                                                    <Ionicons name="film" size={24} color={Colors.primary} />
                                                    <Text style={[styles.imagePlaceholderTextCompact, { color: Colors.primary }]}>Video Selected</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.imagePlaceholderCompact}>
                                                    <Ionicons name="videocam-outline" size={24} color={colors.textSecondary} />
                                                    <Text style={[styles.imagePlaceholderTextCompact, { color: colors.textSecondary }]}>Select Video from Phone</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Hide Toggle if courseType is explicitly set */}
                                {(!courseInfo?.courseType || courseInfo?.courseType === 'general') && (
                                    <View style={[styles.formItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 5, borderRadius: 12, backgroundColor: isLiveToggle ? '#EF444410' : colors.surface, borderWidth: 1, borderColor: isLiveToggle ? '#EF4444' : colors.border }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <Ionicons name="videocam" size={20} color={isLiveToggle ? '#EF4444' : colors.textSecondary} />
                                            <Text style={[styles.label, { color: isLiveToggle ? '#EF4444' : colors.text, marginBottom: 0 }]}>Schedule Live Class</Text>
                                        </View>
                                        <Switch
                                            value={isLiveToggle}
                                            onValueChange={(val) => {
                                                setIsLiveToggle(val);
                                                if (val) setLectureType('Live');
                                                else setLectureType('Video');
                                            }}
                                            trackColor={{ false: '#E2E8F0', true: '#EF4444' }}
                                            thumbColor={isLiveToggle ? '#FFF' : '#CCC'}
                                        />
                                    </View>
                                )}

                                {isLiveToggle && (
                                    <View style={{ gap: 12, marginTop: 5 }}>
                                        <View style={styles.formItem}>
                                            <Text style={[styles.label, { color: colors.text }]}>Schedule Date & Time</Text>
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <TouchableOpacity
                                                    style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'center' }]}
                                                    onPress={() => setShowCalendarModal(true)}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                                                        <Text style={{ color: colors.text }}>{liveDate}</Text>
                                                    </View>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.input, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, justifyContent: 'center' }]}
                                                    onPress={() => setShowTimeModal(true)}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                        <Ionicons name="time-outline" size={18} color={Colors.primary} />
                                                        <Text style={{ color: colors.text }}>{liveTime}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Unified Progress Bar UI */}
                                {(isCompressing || (isLoading && uploadProgress > 0)) && (
                                    <View style={{ marginTop: 15 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: 'bold' }}>
                                                {isCompressing ? 'Step 1 of 2: Preparing Video...' : 'Step 2 of 2: Saving Video...'}
                                            </Text>
                                            <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: 'bold' }}>
                                                {isCompressing ? Math.round(compressionProgress * 0.5) : Math.round(50 + (uploadProgress * 0.5))}%
                                            </Text>
                                        </View>
                                        <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                                            <View style={{ height: '100%', backgroundColor: Colors.primary, width: `${isCompressing ? (compressionProgress * 0.5) : (50 + (uploadProgress * 0.5))}%` }} />
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.submitBtn, { marginTop: 20 }, (isLoading || isCompressing) && { opacity: 0.7 }]}
                                    onPress={handleAddLecture}
                                    disabled={isLoading || isCompressing}
                                >
                                    {isLoading || isCompressing ? (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <ActivityIndicator color={Colors.white} size="small" />
                                            {isCompressing && <Text style={{ color: Colors.white, fontWeight: 'bold' }}>Processing...</Text>}
                                            {!isCompressing && uploadProgress > 0 && <Text style={{ color: Colors.white, fontWeight: 'bold' }}>Saving...</Text>}
                                        </View>
                                    ) : (
                                        <Text style={styles.submitBtnText}>{isLiveToggle ? 'Schedule Live Now' : 'Add Lecture'}</Text>
                                    )}
                                </TouchableOpacity>

                                {(isLoading || isCompressing) && (
                                    <TouchableOpacity
                                        style={{ marginTop: 15, alignSelf: 'center', padding: 8 }}
                                        onPress={closeLectureModal}
                                    >
                                        <Text style={{ color: '#EF4444', fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                                    </TouchableOpacity>
                                )}
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Custom Horizontal Date Selector Modal */}
            <Modal visible={showCalendarModal} transparent animationType="fade">
                <View style={[styles.pickerOverlay, isManualDateMode && { justifyContent: 'center', paddingBottom: 100 }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ width: '100%' }}
                    >
                        <View style={[styles.pickerContent, { backgroundColor: colors.card, borderRadius: isManualDateMode ? 30 : 0 }]}>
                            <View style={styles.pickerHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    {isManualDateMode && (
                                        <TouchableOpacity onPress={() => setIsManualDateMode(false)}>
                                            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    <Text style={[styles.pickerTitle, { color: colors.text }]}>{isManualDateMode ? 'Type Custom Date' : 'Select Start Date'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setShowCalendarModal(false); setIsManualDateMode(false); }}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {!isManualDateMode && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 5, gap: 12, paddingVertical: 20 }}>
                                    {getNext14Days().map((day) => (
                                        <TouchableOpacity
                                            key={day.full}
                                            style={[
                                                styles.dateBox,
                                                { backgroundColor: liveDate === day.full ? Colors.primary : colors.surface, borderColor: liveDate === day.full ? Colors.primary : colors.border }
                                            ]}
                                            onPress={() => { setLiveDate(day.full); setShowCalendarModal(false); }}
                                        >
                                            <Text style={[styles.dateMonth, { color: liveDate === day.full ? '#FFF' : colors.textSecondary }]}>{day.month}</Text>
                                            <Text style={[styles.dateNum, { color: liveDate === day.full ? '#FFF' : colors.text }]}>{day.dayNum}</Text>
                                            <Text style={[styles.dateDay, { color: liveDate === day.full ? '#FFF' : colors.textSecondary }]}>{day.dayName}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

                            <TextInput
                                style={[styles.input, { marginTop: isManualDateMode ? 0 : 10, marginHorizontal: 20, textAlign: 'center', backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                placeholder="Or type: 2026-04-25"
                                placeholderTextColor={colors.textSecondary}
                                autoFocus={isManualDateMode}
                                value={liveDate}
                                onChangeText={setLiveDate}
                                onFocus={() => setIsManualDateMode(true)}
                            />
                            {isManualDateMode && (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>Format: YYYY-MM-DD • Press back arrow for quick dates</Text>
                            )}

                            <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border, alignItems: 'center', marginTop: 10 }}>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Scheduled for: <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{liveDate}</Text></Text>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Custom Time Modal */}
            <Modal visible={showTimeModal} transparent animationType="slide">
                <View style={[styles.pickerOverlay, isManualTimeMode && { justifyContent: 'center', paddingBottom: 100 }]}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ width: '100%' }}
                    >
                        <View style={[styles.pickerContent, { backgroundColor: colors.card, paddingBottom: 40, borderTopLeftRadius: isManualTimeMode ? 30 : 30, borderTopRightRadius: isManualTimeMode ? 30 : 30, borderRadius: isManualTimeMode ? 30 : 0 }]}>
                            <View style={styles.pickerHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    {isManualTimeMode && (
                                        <TouchableOpacity onPress={() => setIsManualTimeMode(false)}>
                                            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                                        </TouchableOpacity>
                                    )}
                                    <Text style={[styles.pickerTitle, { color: colors.text }]}>{isManualTimeMode ? 'Type Custom Time' : 'Select Time'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { setShowTimeModal(false); setIsManualTimeMode(false); }}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {!isManualTimeMode && (
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 10 }}>
                                    {['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM'].map(t => (
                                        <TouchableOpacity
                                            key={t}
                                            style={[styles.timeSlot, { borderColor: liveTime === t ? Colors.primary : colors.border, backgroundColor: liveTime === t ? Colors.primary + '10' : 'transparent' }]}
                                            onPress={() => { setLiveTime(t); setShowTimeModal(false); }}
                                        >
                                            <Text style={{ color: liveTime === t ? Colors.primary : colors.text, fontWeight: liveTime === t ? 'bold' : 'normal' }}>{t}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <TextInput
                                style={[styles.input, { marginTop: isManualTimeMode ? 0 : 20, marginHorizontal: 20, textAlign: 'center', backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                placeholder="Or type: 05:30 PM"
                                placeholderTextColor={colors.textSecondary}
                                autoFocus={isManualTimeMode}
                                value={liveTime}
                                onChangeText={setLiveTime}
                                onFocus={() => setIsManualTimeMode(true)}
                            />
                            {isManualTimeMode && (
                                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 10 }}>Press back arrow to see quick slots</Text>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* --- Video Preview Modal --- */}
            {selectedPreviewVideo && (
                <Modal visible={true} transparent animationType="fade" onRequestClose={() => setSelectedPreviewVideo(null)}>
                    <View style={styles.videoModalOverlay}>
                        <View style={styles.videoModalHeader}>
                            <TouchableOpacity style={styles.videoCloseBtn} onPress={() => {
                                setSelectedPreviewVideo(null);
                                previewPlayer.pause();
                            }}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            {isPreviewLoading && (
                                <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', zIndex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }]}>
                                    <ActivityIndicator size="large" color={Colors.primary} />
                                    <Text style={{ color: '#FFF', marginTop: 10, fontSize: 12 }}>LOADING PREVIEW...</Text>
                                </View>
                            )}
                            <VideoView
                                player={previewPlayer}
                                style={styles.fullscreenVideo}
                                allowsFullscreen
                                allowsPictureInPicture
                            />
                        </View>
                    </View>
                </Modal>
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    videoModalOverlay: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
    },
    videoModalHeader: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 100,
    },
    videoCloseBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 20,
    },
    fullscreenVideo: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').width * (9 / 16),
        alignSelf: 'center',
    },
    screenContainer: {
        flex: 1,
        padding: 20,
    },
    screenHeader: {
        marginBottom: 25,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    screenSub: {
        fontSize: 14,
        color: Colors.grey,
        marginTop: 4,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    addBtnText: {
        fontWeight: 'bold',
        color: Colors.secondary,
        fontSize: 12,
    },
    moduleCard: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        marginBottom: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    moduleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F2',
        paddingBottom: 15,
        marginBottom: 15,
    },
    moduleTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    lectureCount: {
        fontSize: 12,
        color: Colors.grey,
        marginTop: 2,
    },
    moduleActions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionIconBtn: {
        width: 36,
        height: 36,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lectureList: {
        gap: 12,
    },
    lectureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 4,
    },
    lectureIconBox: {
        width: 32,
        height: 32,
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lectureName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
    },
    lectureMeta: {
        fontSize: 11,
        color: Colors.grey,
        marginTop: 1,
    },
    addLectureBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F9FF',
        paddingVertical: 10,
        borderRadius: 10,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: Colors.primary,
        marginTop: 10,
        gap: 5,
    },
    addLectureText: {
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blurOverlay: {
        flex: 1,
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeaderInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    formItem: {
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        height: 54,
        paddingHorizontal: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#EEE',
        color: Colors.secondary,
    },
    submitBtn: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    submitBtnText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    rowInputs: {
        flexDirection: 'row',
    },
    typeSelector: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    typeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeBtnActive: {
        backgroundColor: Colors.white,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    typeBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.grey,
    },
    typeBtnTextActive: {
        color: Colors.secondary,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
        marginTop: 5,
    },
    switchSub: {
        fontSize: 11,
        color: Colors.grey,
        marginTop: 2,
    },
    imagePickerCompact: { width: '100%', height: 120, backgroundColor: '#F9FAFB', borderRadius: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', overflow: 'hidden', marginBottom: 5 },
    imagePlaceholderCompact: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 5 },
    imagePlaceholderTextCompact: { color: Colors.grey, fontSize: 13, fontWeight: '500' },
    previewImage: { width: '100%', height: '100%' },
    moduleThumbBoxList: { width: 44, height: 44, borderRadius: 10, marginRight: 12, overflow: 'hidden', backgroundColor: '#F5F5F5' },
    moduleThumbImg: { width: '100%', height: '100%' },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    pickerContent: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    pickerTitle: { fontSize: 18, fontWeight: 'bold' },
    timeSlot: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: '30%', alignItems: 'center' },
    dateBox: { width: 70, height: 100, borderRadius: 15, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 2 },
    dateMonth: { fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' },
    dateNum: { fontSize: 22, fontWeight: 'bold' },
    dateDay: { fontSize: 11 },
});
