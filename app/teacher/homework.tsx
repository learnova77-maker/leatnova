import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { Colors } from '@/constants/theme';
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

interface Homework {
    id: string;
    name: string;
    task: string;
}

export default function TeacherHomework() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submissions, setSubmissions] = useState<Homework[]>([
        { id: '1', name: 'John Doe', task: 'Writing Feedback Task #1' },
        { id: '2', name: 'Mei Lin', task: 'Grammar Quiz - Advanced' },
        { id: '3', name: 'Alex Smith', task: 'Speaking Mock Cards' },
    ]);

    const [newName, setNewName] = useState('');
    const [newTask, setNewTask] = useState('');

    const handleAddHomework = () => {
        if (newName.trim() === '' || newTask.trim() === '') return;

        const newHw: Homework = {
            id: Math.random().toString(),
            name: newName,
            task: newTask,
        };

        setSubmissions([newHw, ...submissions]);
        setNewName('');
        setNewTask('');
        setIsModalVisible(false);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Homework"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
            />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={styles.screenTitle}>Homework Tasks</Text>
                            <Text style={styles.screenSub}>Assign tasks to your students</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setIsModalVisible(true)}
                        >
                            <Ionicons name="add-circle" size={20} color={Colors.secondary} />
                            <Text style={styles.addButtonText}>Assign</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={submissions}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.listItem}>
                            <View style={styles.listText}>
                                <Text style={styles.itemName}>{item.name}</Text>
                                <Text style={styles.itemSub}>{item.task}</Text>
                            </View>
                            <TouchableOpacity style={styles.gradeBtnAction}>
                                <Text style={styles.gradeText}>Review</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            </View>

            {/* Add Homework Modal */}
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
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>New Homework</Text>
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
                                        <Text style={styles.label}>Student Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter student name"
                                            placeholderTextColor="#AAA"
                                            value={newName}
                                            onChangeText={setNewName}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Task Description</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. Essay Writing Task 2"
                                            placeholderTextColor="#AAA"
                                            value={newTask}
                                            onChangeText={setNewTask}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={handleAddHomework}
                                    >
                                        <Text style={styles.submitButtonText}>Assign Homework</Text>
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
    listText: {
        flex: 1,
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
    gradeBtnAction: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        backgroundColor: Colors.secondary,
        borderRadius: 10,
    },
    gradeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.white,
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
