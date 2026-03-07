import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
    View,
} from 'react-native';

interface Lecture {
    id: string;
    title: string;
    duration: string;
    type: 'Video' | 'Live' | 'PDF';
    isPreviewFree: boolean;
    url?: string;
}

interface Module {
    id: string;
    title: string;
    lectures: Lecture[];
}

export default function TeacherCourses() {
    const router = useRouter();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Mock current course ID for this screen
    const [currentCourseId, setCurrentCourseId] = useState('sample-course-id');

    // State for Modules
    const [modules, setModules] = useState<Module[]>([]);

    useEffect(() => {
        const fetchCurriculum = async () => {
            // For now we keep the mock or use API if exists
            setModules([
                {
                    id: '1',
                    title: 'Introduction to Web Dev',
                    lectures: [
                        { id: 'l1', title: 'What is HTML?', duration: '10:00', type: 'Video', isPreviewFree: true },
                    ]
                }
            ]);
        };
        fetchCurriculum();
    }, [currentCourseId]);

    // UI state for Modals
    const [isModuleModalVisible, setIsModuleModalVisible] = useState(false);
    const [isLectureModalVisible, setIsLectureModalVisible] = useState(false);
    const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
    const [editingModule, setEditingModule] = useState<Module | null>(null);

    // Form inputs for Module
    const [moduleTitle, setModuleTitle] = useState('');

    // Form inputs for Lecture
    const [lectureTitle, setLectureTitle] = useState('');
    const [lectureUrl, setLectureUrl] = useState('');
    const [lectureDuration, setLectureDuration] = useState('');
    const [lectureType, setLectureType] = useState<'Video' | 'Live' | 'PDF'>('Video');
    const [isPreviewFree, setIsPreviewFree] = useState(false);

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
                    moduleTitle: moduleTitle
                });

                if (response.data.success) {
                    const newMod: Module = {
                        id: response.data.moduleId,
                        title: moduleTitle,
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
        setIsModuleModalVisible(true);
    };

    const handleDeleteModule = (id: string) => {
        setModules(modules.filter(m => m.id !== id));
    };

    const closeModuleModal = () => {
        setIsModuleModalVisible(false);
        setEditingModule(null);
        setModuleTitle('');
    };

    // --- Lecture Actions ---
    const handleAddLecture = async () => {
        if (!lectureTitle.trim() || !activeModuleId) return;

        setIsLoading(true);
        try {
            const lectureData = {
                courseId: currentCourseId,
                moduleId: activeModuleId,
                lectureTitle,
                duration: lectureDuration || '00:00',
                type: lectureType,
                isPreviewFree,
                url: lectureUrl
            };

            const response = await courseApi.addLecture(lectureData);

            if (response.data.success) {
                const newLecture: Lecture = {
                    id: response.data.lectureId,
                    title: lectureTitle,
                    duration: lectureDuration || '00:00',
                    type: lectureType,
                    isPreviewFree: isPreviewFree,
                    url: lectureUrl,
                };

                setModules(modules.map(m =>
                    m.id === activeModuleId ? { ...m, lectures: [...m.lectures, newLecture] } : m
                ));
            }
            closeLectureModal();
        } catch (err) {
            Alert.alert('Error', 'Failed to add lecture.');
        } finally {
            setIsLoading(false);
        }
    };

    const closeLectureModal = () => {
        setIsLectureModalVisible(false);
        setActiveModuleId(null);
        setLectureTitle('');
        setLectureUrl('');
        setLectureDuration('');
        setLectureType('Video');
        setIsPreviewFree(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
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
                        <View style={styles.moduleCard}>
                            <View style={styles.moduleHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.moduleTitle}>{item.title}</Text>
                                    <Text style={styles.lectureCount}>{item.lectures.length} Lectures</Text>
                                </View>
                                <View style={styles.moduleActions}>
                                    <TouchableOpacity onPress={() => openEditModule(item)} style={styles.actionIconBtn}>
                                        <Ionicons name="pencil" size={18} color={Colors.secondary} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteModule(item.id)} style={styles.actionIconBtn}>
                                        <Ionicons name="trash" size={18} color="#EB5757" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.lectureList}>
                                {item.lectures.map((lec) => (
                                    <View key={lec.id} style={styles.lectureItem}>
                                        <View style={styles.lectureIconBox}>
                                            <Ionicons
                                                name={lec.type === 'Video' ? 'play-circle' : lec.type === 'Live' ? 'videocam' : 'document-text'}
                                                size={18}
                                                color={Colors.grey}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.lectureName}>{lec.title}</Text>
                                            <Text style={styles.lectureMeta}>{lec.duration} • {lec.isPreviewFree ? 'Free Preview' : 'Locked'}</Text>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={styles.addLectureBtn}
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
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeModuleModal}>
                        <View style={styles.blurOverlay} />
                    </Pressable>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeaderInner}>
                                <Text style={styles.modalTitle}>{editingModule ? 'Edit Module' : 'Create Module'}</Text>
                                <TouchableOpacity onPress={closeModuleModal}>
                                    <Ionicons name="close-circle" size={24} color={Colors.grey} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.formItem}>
                                <Text style={styles.label}>Module Title</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Getting Started"
                                    value={moduleTitle}
                                    onChangeText={setModuleTitle}
                                    autoFocus
                                />
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
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeLectureModal}>
                        <View style={styles.blurOverlay} />
                    </Pressable>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeaderInner}>
                                <Text style={styles.modalTitle}>New Lecture</Text>
                                <TouchableOpacity onPress={closeLectureModal}>
                                    <Ionicons name="close-circle" size={24} color={Colors.grey} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                                <View style={styles.formItem}>
                                    <Text style={styles.label}>Lecture Title</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Setting up Environment"
                                        value={lectureTitle}
                                        onChangeText={setLectureTitle}
                                    />
                                </View>

                                <View style={styles.formItem}>
                                    <Text style={styles.label}>Video URL / Path</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="https://..."
                                        value={lectureUrl}
                                        onChangeText={setLectureUrl}
                                    />
                                </View>

                                <View style={styles.rowInputs}>
                                    <View style={[styles.formItem, { flex: 1 }]}>
                                        <Text style={styles.label}>Duration</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="12:30"
                                            value={lectureDuration}
                                            onChangeText={setLectureDuration}
                                        />
                                    </View>
                                    <View style={[styles.formItem, { flex: 1.5, marginLeft: 10 }]}>
                                        <Text style={styles.label}>Lecture Type</Text>
                                        <View style={styles.typeSelector}>
                                            {(['Video', 'Live', 'PDF'] as const).map(type => (
                                                <TouchableOpacity
                                                    key={type}
                                                    style={[styles.typeBtn, lectureType === type && styles.typeBtnActive]}
                                                    onPress={() => setLectureType(type)}
                                                >
                                                    <Text style={[styles.typeBtnText, lectureType === type && styles.typeBtnTextActive]}>{type}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.switchRow}>
                                    <View>
                                        <Text style={styles.label}>Is Preview Free?</Text>
                                        <Text style={styles.switchSub}>Students can watch without buying</Text>
                                    </View>
                                    <Switch
                                        value={isPreviewFree}
                                        onValueChange={setIsPreviewFree}
                                        trackColor={{ false: '#EEE', true: Colors.primary }}
                                        thumbColor={isPreviewFree ? Colors.secondary : '#FFF'}
                                    />
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
    }
});
