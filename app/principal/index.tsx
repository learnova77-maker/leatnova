import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function PrincipalDashboard() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Overview');

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState<'teacher' | 'class' | 'assign' | null>(null);

    // Mock Stats
    const stats = [
        { title: 'Total Students', value: '1,250', icon: 'people', color: '#3B82F6' },
        { title: 'Total Teachers', value: '45', icon: 'school', color: '#10B981' },
        { title: 'Active Classes', value: '32', icon: 'business', color: '#8B5CF6' },
        { title: 'Avg Attendance', value: '94%', icon: 'checkmark-circle', color: '#F59E0B' },
    ];

    const actions = [
        { label: 'Add Teacher', icon: 'person-add', color: '#10B981', action: 'teacher' },
        { label: 'Create Class', icon: 'add-circle', color: '#3B82F6', action: 'class' },
        { label: 'Assign Roles', icon: 'git-network', color: '#8B5CF6', action: 'assign' },
    ];

    useEffect(() => {
        // Quick check to ensure user is logged in
        AsyncStorage.getItem('user').then((val) => {
            if (!val) router.replace('/(auth)/login');
        });
    }, []);

    const openModal = (type: 'teacher' | 'class' | 'assign') => {
        setModalType(type);
        setModalVisible(true);
    };

    const renderModalContent = () => {
        switch (modalType) {
            case 'teacher':
                return (
                    <View style={styles.modalForm}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Teacher</Text>
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Teacher Name" />
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Email" />
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Subject Expertise" />
                    </View>
                );
            case 'class':
                return (
                    <View style={styles.modalForm}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Class</Text>
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Class Name (e.g., Grade 10-A)" />
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Capacity" keyboardType="numeric" />
                    </View>
                );
            case 'assign':
                return (
                    <View style={styles.modalForm}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Assign Teacher to Class</Text>
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Select Teacher (e.g., Mr. Smith)" />
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Select Class (e.g., Grade 10-A)" />
                        <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholderTextColor="#999" placeholder="Subject (e.g., Mathematics)" />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <AppSidebar role="school" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(false)} />
            <View style={styles.mainContent}>
                <AppHeader toggleSidebar={() => setIsSidebarOpen(true)} title="Principal Dashboard" role="school" />

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.welcomeSection}>
                        <Text style={[styles.greeting, { color: colors.text }]}>Welcome back, Principal</Text>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>Manage your school from one place.</Text>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        {stats.map((stat, idx) => (
                            <View key={idx} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                                    <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                                </View>
                                <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{stat.title}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Quick Actions */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                    <View style={styles.actionsContainer}>
                        {actions.map((action, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => openModal(action.action as any)}
                            >
                                <View style={[styles.actionIconWrapper, { backgroundColor: action.color }]}>
                                    <Ionicons name={action.icon as any} size={20} color="#FFF" />
                                </View>
                                <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Recent Activity Placeholder */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                    <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.activityItem}>
                            <View style={[styles.activityDot, { backgroundColor: '#10B981' }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '500' }}>Mr. Smith assigned to Grade 10-A Math</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>2 hours ago</Text>
                            </View>
                        </View>
                        <View style={[styles.activityItem, { borderBottomWidth: 0 }]}>
                            <View style={[styles.activityDot, { backgroundColor: '#3B82F6' }]} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.text, fontWeight: '500' }}>New Class 'Grade 9-B' created</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>5 hours ago</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>

            {/* General Action Modal */}
            <Modal visible={modalVisible} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        {renderModalContent()}
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={{ color: colors.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmBtn} onPress={() => { setModalVisible(false); Alert.alert('Success', 'Action completed successfully.'); }}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mainContent: { flex: 1 },
    content: { flex: 1, padding: 20 },
    welcomeSection: { marginBottom: 25 },
    greeting: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
    dateText: { fontSize: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
    statCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 15, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
    statIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    statTitle: { fontSize: 14 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
    actionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
    actionBtn: { width: '31%', padding: 15, borderRadius: 16, borderWidth: 1, alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }, android: { elevation: 2 } }) },
    actionIconWrapper: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
    activityCard: { borderRadius: 16, padding: 15, borderWidth: 1, marginBottom: 40 },
    activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: 300 },
    modalForm: { marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
    input: { borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 15 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
    confirmBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#4F46E5', alignItems: 'center' },
});
