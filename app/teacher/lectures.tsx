import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
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
    View,
} from 'react-native';

interface Lecture {
    id: string;
    title: string;
    duration: string;
    type: string;
}

export default function TeacherLectures() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [lectures, setLectures] = useState<Lecture[]>([
        { id: '1', title: 'IELTS Speaking Strategies', duration: '45:20', type: 'Video' },
        { id: '2', title: 'Advanced Grammar: Tenses', duration: '30:15', type: 'Live Record' },
        { id: '3', title: 'HSK 4 Vocabulary Part 1', duration: '55:00', type: 'Video' },
    ]);

    const [newTitle, setNewTitle] = useState('');
    const [newDuration, setNewDuration] = useState('');

    const handleAddLecture = () => {
        if (newTitle.trim() === '' || newDuration.trim() === '') return;

        const newLec: Lecture = {
            id: Math.random().toString(),
            title: newTitle,
            duration: newDuration,
            type: 'Video',
        };

        setLectures([newLec, ...lectures]);
        setNewTitle('');
        setNewDuration('');
        setIsModalVisible(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Lectures"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
            />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={[styles.screenTitle, { color: colors.text }]}>Lectures</Text>
                            <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Manage your class gallery</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsModalVisible(true)}
                        >
                            <Ionicons name="cloud-upload" size={20} color={Colors.secondary} />
                            <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={lectures}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                                <Ionicons name="play" size={20} color={isDark ? colors.text : Colors.secondary} />
                            </View>
                            <View style={styles.listText}>
                                <Text style={[styles.itemName, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.type} • {item.duration}</Text>
                            </View>
                            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Add Lecture Modal */}
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
                                <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Lecture</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                                    <Ionicons name="close-circle" size={24} color={Colors.grey} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.formScrollContent}
                                style={{ maxHeight: 400 }}
                            >
                                <View style={styles.form}>
                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Lecture Title</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                            placeholder="e.g. Grammar Session 1"
                                            placeholderTextColor="#AAA"
                                            value={newTitle}
                                            onChangeText={setNewTitle}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (min:sec)</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                            placeholder="e.g. 45:00"
                                            placeholderTextColor="#AAA"
                                            value={newDuration}
                                            onChangeText={setNewDuration}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={handleAddLecture}
                                    >
                                        <Text style={styles.submitButtonText}>Publish Lecture</Text>
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
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
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
    iconCircle: {
        width: 45,
        height: 45,
        borderRadius: 12,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    listText: {
        flex: 1,
        marginLeft: 15,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    itemSub: {
        fontSize: 12,
        color: Colors.grey,
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
