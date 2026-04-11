import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Student {
    id: string;
    name: string;
    level: string;
    progress: string;
    image: string;
}

export default function TeacherStudents() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const [studentList, setStudentList] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const randomColors = ['#FFD700', '#FF6347', '#4682B4', '#32CD32', '#9B51E0', '#F2994A', '#EB5757'];

    useEffect(() => {
        loadStudents();
    }, []);

    const loadStudents = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (!userData) return;
            const user = JSON.parse(userData);

            const response = await courseApi.getTeacherStudents(user.uid);
            if (response.data.success) {
                const fetchedStudents = response.data.students.map((s: any, index: number) => ({
                    id: s.id,
                    name: s.name,
                    level: s.courseTitle || 'Enrolled Student',
                    progress: 'Active',
                    image: randomColors[index % randomColors.length]
                }));
                setStudentList(fetchedStudents);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="Students"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
            />

            <View style={styles.screenContainer}>
                <View style={styles.screenHeader}>
                    <View style={styles.titleRow}>
                        <View>
                            <Text style={[styles.screenTitle, { color: colors.text }]}>My Students</Text>
                            <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Manage your active students</Text>
                        </View>
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={{ marginTop: 10, color: colors.textSecondary }}>Fetching your students...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={studentList}
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
                                <Text style={[styles.emptyText, { color: colors.text }]}>No students found yet.</Text>
                                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Students will appear here once they enroll in your courses.</Text>
                                <TouchableOpacity style={styles.refreshBtn} onPress={loadStudents}>
                                    <Text style={styles.refreshBtnText}>Check Again</Text>
                                </TouchableOpacity>
                            </View>
                        }
                        renderItem={({ item }) => (
                            <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={[styles.avatarCircle, { backgroundColor: item.image }]}>
                                    <Text style={styles.avatarInitial}>{item.name ? item.name.charAt(0) : 'S'}</Text>
                                </View>
                                <View style={styles.listText}>
                                    <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.level}</Text>
                                </View>
                                <View style={styles.progressBox}>
                                    <Text style={styles.progressText}>{item.progress}</Text>
                                </View>
                            </View>
                        )}
                        contentContainerStyle={[styles.listContent, studentList.length === 0 && { flex: 1 }]}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
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
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.white,
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
        marginTop: 2,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    refreshBtn: {
        marginTop: 30,
        backgroundColor: Colors.primary,
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
    },
    refreshBtnText: {
        color: '#1A2744',
        fontWeight: 'bold',
    },
    progressBox: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#E8F5E9',
        borderRadius: 8,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
});
