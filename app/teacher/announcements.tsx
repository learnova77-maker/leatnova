import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface Announcement {
    id: string;
    title: string;
    date: string;
    text: string;
}

export default function TeacherAnnouncements() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);

    const [newTitle, setNewTitle] = useState('');
    const [newText, setNewText] = useState('');

    const loadHistory = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const res = await userApi.getAnnouncementHistory(user.uid);
                if (res.data.success) {
                    setAnnouncements(res.data.announcements);
                }
            }
        } catch (err) {
            console.error('Error loading announcement history:', err);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadHistory();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadHistory();
        setRefreshing(false);
    }, []);

    const handleAddAnnouncement = async () => {
        if (newTitle.trim() === '' || newText.trim() === '') {
            Alert.alert('Required', 'Please fill in both title and message.');
            return;
        }

        setIsSubmitting(true);
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const res = await userApi.sendAnnouncement({
                    teacherId: user.uid,
                    teacherName: user.fullName,
                    title: newTitle,
                    message: newText
                });

                if (res.data.success) {
                    setNewTitle('');
                    setNewText('');
                    setIsModalVisible(false);
                    loadHistory();
                }
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to send announcement');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Announcement"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
            />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={[styles.screenTitle, { color: colors.text }]}>Announcements</Text>
                            <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Broadcast to your students</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsModalVisible(true)}
                        >
                            <Ionicons name="megaphone" size={20} color={Colors.secondary} />
                            <Text style={styles.addButtonText}>Post</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={announcements}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={() => (
                        isLoading ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} /> :
                            <View style={{ alignItems: 'center', marginTop: 50 }}>
                                <Ionicons name="megaphone-outline" size={60} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No announcements sent yet.</Text>
                            </View>
                    )}
                    renderItem={({ item }) => (
                        <View style={[styles.annItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.annHead}>
                                <Text style={[styles.annTitle, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.annDate, { color: colors.textSecondary }]}>
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <Text style={[styles.annText, { color: colors.textSecondary }]}>{item.message || item.text}</Text>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Add Announcement Modal */}
            <Modal
                visible={isModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsModalVisible(false)}>
                        <View style={styles.blurOverlay} />
                    </Pressable>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContainer}
                    >
                        <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.text }]}>New Announcement</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close-circle" size={24} color={Colors.grey} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.formScrollContent}
                                style={{ maxHeight: 450 }}
                            >
                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Heading</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                            placeholder="e.g. Schedule Change"
                                            placeholderTextColor="#AAA"
                                            value={newTitle}
                                            onChangeText={setNewTitle}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Message Details</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                            placeholder="Type your message here..."
                                            placeholderTextColor="#AAA"
                                            multiline
                                            numberOfLines={4}
                                            value={newText}
                                            onChangeText={setNewText}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
                                        onPress={handleAddAnnouncement}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <Text style={styles.submitButtonText}>Post Announcement</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
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
        backgroundColor: '#F3F4F6',
    },
    screenContainer: {
        flex: 1,
        padding: 20,
    },
    screenHeader: {
        marginBottom: 20,
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
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 5,
    },
    addButtonText: {
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    listContent: {
        paddingBottom: 40,
    },
    annItem: {
        backgroundColor: Colors.white,
        padding: 15,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    annHead: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    annTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    annDate: {
        fontSize: 11,
        color: Colors.grey,
    },
    annText: {
        fontSize: 13,
        color: Colors.grey,
        lineHeight: 18,
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
        width: '85%',
        maxWidth: 400,
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderRadius: 24,
        padding: 24,
        overflow: 'hidden',
        elevation: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    modalHeader: {
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
    form: {
        gap: 15,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#EEE',
        color: Colors.secondary,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    formScrollContent: {
        paddingBottom: 10,
    },
    submitButton: {
        backgroundColor: Colors.secondary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    submitButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
});
