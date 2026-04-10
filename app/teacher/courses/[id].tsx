import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
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

interface Lecture {
    id: string;
    title: string;
    duration: string;
    type: 'Video' | 'Live' | 'PDF';
    isPreviewFree: boolean;
    url?: string;
    videoUrl?: string; // For uploaded videos
    scheduledAt?: string;
}

interface Module {
    id: string;
    title: string;
    thumbnail?: string; // Added thumbnail
    lectures: Lecture[];
}

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

    const fetchCurriculum = async () => {
        setIsFetching(true);
        try {
            const response = await courseApi.getCourseDetails(currentCourseId);
            if (response.data.success && response.data.course.modules) {
                const modulesData = response.data.course.modules;
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
    const [scheduledAt, setScheduledAt] = useState('');
    const [isPreviewFree, setIsPreviewFree] = useState(false);

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
                // Mock update for now
                setModules(modules.map(m => m.id === editingModule.id ? { ...m, title: moduleTitle } : m));
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
    const handleAddLecture = async () => {
        if (!lectureTitle.trim() || !activeModuleId) return;

        setIsLoading(true);
        try {
            let finalVideoUrl = lectureUrl;

            // 1. IF teacher selected a local file, UPLOAD it to Firebase Storage first
            if (lectureVideo && lectureVideo.startsWith('file://')) {
                const { getStorage, ref: sRef, uploadBytes, getDownloadURL } = require('firebase/storage');
                const storage = getStorage();
                const filename = `lectures/${currentCourseId}/${Date.now()}.mp4`;
                const storageRef = sRef(storage, filename);

                const response = await fetch(lectureVideo);
                const blob = await response.blob();

                const uploadResult = await uploadBytes(storageRef, blob);
                finalVideoUrl = await getDownloadURL(uploadResult.ref);
                console.log('Video uploaded successfully:', finalVideoUrl);
            }

            const lectureData = {
                courseId: currentCourseId,
                moduleId: activeModuleId,
                lectureTitle,
                duration: lectureDuration || '00:00',
                type: lectureType,
                isPreviewFree,
                url: finalVideoUrl, // Use the uploaded URL or the manually entered one
                scheduledAt: lectureType === 'Live' ? scheduledAt : ''
            };

            const response = await courseApi.addLecture(lectureData);

            if (response.data.success) {
                const newLecture: Lecture = {
                    id: response.data.lectureId,
                    title: lectureTitle,
                    duration: lectureDuration || '00:00',
                    type: lectureType,
                    isPreviewFree: isPreviewFree,
                    url: finalVideoUrl,
                    scheduledAt: lectureType === 'Live' ? scheduledAt : ''
                };

                setModules(modules.map(m =>
                    m.id === activeModuleId ? { ...m, lectures: [...m.lectures, newLecture] } : m
                ));
            }
            closeLectureModal();
        } catch (err) {
            console.error('Upload/Save error:', err);
            Alert.alert('Error', 'Failed to upload video or save lecture. Please check connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const closeLectureModal = () => {
        setIsLectureModalVisible(false);
        setActiveModuleId(null);
        setLectureTitle('');
        setLectureUrl('');
        setLectureVideo(null);
        setLectureDuration('');
        setLectureType('Video');
        setScheduledAt('');
        setIsPreviewFree(false);
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
                                        <Ionicons name="pencil" size={18} color={Colors.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteModule(item.id)} style={[styles.actionIconBtn, { backgroundColor: colors.surface }]}>
                                        <Ionicons name="trash" size={18} color="#EB5757" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.lectureList}>
                                {item.lectures.map((lec) => (
                                    <View key={lec.id} style={styles.lectureItem}>
                                        <View style={[styles.lectureIconBox, { backgroundColor: colors.surface }]}>
                                            <Ionicons
                                                name={lec.type === 'Video' ? 'play-circle' : lec.type === 'Live' ? 'videocam' : 'document-text'}
                                                size={18}
                                                color={colors.textSecondary}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.lectureName, { color: colors.text }]}>{lec.title}</Text>
                                            <Text style={[styles.lectureMeta, { color: colors.textSecondary }]}>{lec.duration}</Text>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={[styles.addLectureBtn, { backgroundColor: isDark ? colors.surface : '#F0F9FF', borderColor: Colors.primary }]}
                                    onPress={() => {
                                        setActiveModuleId(item.id);
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
                                <Text style={[styles.modalTitle, { color: colors.text }]}>New Video Lecture</Text>
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

                                <TouchableOpacity
                                    style={[styles.submitBtn, { marginTop: 20 }, isLoading && { opacity: 0.7 }]}
                                    onPress={handleAddLecture}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={Colors.white} />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Add Lecture</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
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
});
