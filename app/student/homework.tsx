import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { assignmentApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentHomework() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState('');
    const [userName, setUserName] = useState('');

    // Upload modal
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [pickedFile, setPickedFile] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadHomework = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserId(user.uid);
                setUserName(user.fullName);

                const res = await assignmentApi.getStudentAssignments(user.uid);
                if (res.data.success) {
                    setAssignments(res.data.assignments);
                }
            }
        } catch (err) {
            console.error('Error loading homework:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadHomework(); }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadHomework();
        setRefreshing(false);
    }, []);

    const pickFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setPickedFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Doc picker error:', err);
        }
    };

    const handleSubmit = async () => {
        if (!pickedFile) {
            Alert.alert('Required', 'Please select a file to upload.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await assignmentApi.submit({
                studentId: userId,
                studentName: userName,
                assignmentId: selectedAssignment.id,
                submissionUrl: pickedFile.uri,
                submissionFileName: pickedFile.name,
            });

            if (res.data.success) {
                Alert.alert('Success', 'Assignment submitted successfully!');
                setIsUploadModalVisible(false);
                setPickedFile(null);
                setSelectedAssignment(null);
                loadHomework();
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Submission failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completed':
                return { icon: 'checkmark-done-circle', color: '#10B981', label: 'Completed', bg: '#10B98115' };
            case 'submitted':
                return { icon: 'time', color: '#F59E0B', label: 'Submitted - Awaiting Review', bg: '#F59E0B15' };
            default:
                return { icon: 'alert-circle', color: '#EF4444', label: 'Pending', bg: '#EF444415' };
        }
    };

    const renderItem = ({ item }: any) => {
        const st = getStatusConfig(item.status);
        return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardTop}>
                    <View style={[styles.iconCircle, { backgroundColor: st.bg }]}>
                        <Ionicons name={st.icon as any} size={24} color={st.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                            {item.courseTitle} • by {item.teacherName}
                        </Text>
                    </View>
                </View>

                {item.description ? (
                    <Text style={[styles.descText, { color: colors.textSecondary }]} numberOfLines={3}>{item.description}</Text>
                ) : null}

                {/* Status badge */}
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon as any} size={14} color={st.color} />
                    <Text style={{ color: st.color, fontWeight: '600', fontSize: 12 }}>{st.label}</Text>
                </View>

                {/* File attached by teacher (download) */}
                {item.fileUrl && (
                    <TouchableOpacity
                        style={styles.downloadRow}
                        onPress={() => Linking.openURL(item.fileUrl)}
                    >
                        <Ionicons name="document-attach" size={16} color={Colors.primary} />
                        <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: '600' }}>View Attached File</Text>
                    </TouchableOpacity>
                )}

                {/* Upload button for pending tasks */}
                {item.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.uploadBtn}
                        onPress={() => {
                            setSelectedAssignment(item);
                            setPickedFile(null);
                            setIsUploadModalVisible(true);
                        }}
                    >
                        <Ionicons name="cloud-upload" size={18} color="#FFF" />
                        <Text style={styles.uploadBtnText}>Upload Your Work</Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                    Assigned: {new Date(item.assignedAt).toLocaleDateString()}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="My Homework" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <View style={styles.screenContent}>
                <FlatList
                    data={assignments}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                            <View style={styles.emptyState}>
                                <Ionicons name="happy-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No homework assigned yet!</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Enjoy your free time 🎉</Text>
                            </View>
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                />
            </View>

            {/* Upload Submission Modal */}
            <Modal visible={isUploadModalVisible} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsUploadModalVisible(false)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
                    </Pressable>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Assignment</Text>
                            <TouchableOpacity onPress={() => setIsUploadModalVisible(false)}>
                                <Ionicons name="close" size={22} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedAssignment && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>{selectedAssignment.title}</Text>
                                <Text style={[styles.cardSub, { color: colors.textSecondary, marginTop: 4 }]}>{selectedAssignment.courseTitle}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={[styles.filePickerBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={pickFile}
                        >
                            <Ionicons name={pickedFile ? 'document' : 'cloud-upload-outline'} size={40} color={Colors.primary} />
                            <Text style={{ color: pickedFile ? colors.text : colors.textSecondary, textAlign: 'center', marginTop: 8, fontSize: 14 }}>
                                {pickedFile ? pickedFile.name : 'Tap to select your file\n(PDF, Image, Doc)'}
                            </Text>
                            {pickedFile && (
                                <TouchableOpacity onPress={() => setPickedFile(null)} style={{ marginTop: 5 }}>
                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '600' }}>Remove</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
                            onPress={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Submit</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    screenContent: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold' },
    cardSub: { fontSize: 12, marginTop: 2 },
    descText: { fontSize: 13, marginTop: 12, lineHeight: 19 },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 12,
    },
    downloadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
    },
    uploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 14,
    },
    uploadBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    dateText: { fontSize: 11, marginTop: 10 },
    emptyState: { alignItems: 'center', marginTop: 80, gap: 8 },
    emptyText: { fontSize: 16 },

    // Modal
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', maxWidth: 400, borderRadius: 24, padding: 24, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    filePickerBox: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        paddingVertical: 35,
        alignItems: 'center',
        marginBottom: 20,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
