import NoInternet from '@/components/NoInternet';
import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Platform,
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
    const [isOffline, setIsOffline] = useState(false);

    const randomColors = ['#00AEEF', '#0072FF', '#00C6FF', '#00E5FF'];

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        loadStudents();
        return () => unsubscribe();
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
                    level: s.courseTitle || 'ENROLLED STUDENT',
                    progress: 'ACTIVE',
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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {isDark && (
                <LinearGradient
                    colors={['#000000', '#001A2A', '#000000']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <AppSidebar role="teacher" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader
                title="MATLOVERSE"
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                showLive={true}
                onLivePress={() => router.push('/teacher/live')}
            />

            <View style={styles.screenContainer}>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.welcomeSubSmall}>• ENROLLED STUDENTS</Text>
                    <Text style={[styles.mainTagline, { color: colors.text }]}>
                        Student <Text style={{ color: '#00AEEF' }}>List</Text>
                    </Text>
                </View>

                {isOffline ? (
                    <NoInternet />
                ) : (
                    isLoading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#00AEEF" />
                            <Text style={{ marginTop: 15, color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>LOADING DATA...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={studentList}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="people-outline" size={50} color={colors.textSecondary} />
                                    <Text style={[styles.emptyText, { color: colors.text }]}>NO STUDENTS FOUND.</Text>
                                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Students will appear here after enrollment.</Text>
                                    <TouchableOpacity style={styles.refreshBtn} onPress={loadStudents}>
                                        <Text style={styles.refreshBtnText}>RETRY</Text>
                                    </TouchableOpacity>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <View style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <View style={[styles.avatarCircle, { backgroundColor: 'rgba(0, 174, 239, 0.1)', borderColor: '#00AEEF', borderWidth: 1 }]}>
                                        <Text style={[styles.avatarInitial, { color: '#00AEEF' }]}>{item.name ? item.name.charAt(0).toUpperCase() : 'S'}</Text>
                                    </View>
                                    <View style={styles.listText}>
                                        <Text style={[styles.itemName, { color: colors.text }]}>{item.name.toUpperCase()}</Text>
                                        <Text style={[styles.itemSub, { color: colors.textSecondary }]}>{item.level.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.progressBox}>
                                        <View style={styles.pulse} />
                                        <Text style={styles.progressText}>{item.progress}</Text>
                                    </View>
                                </View>
                            )}
                            contentContainerStyle={[styles.listContent, studentList.length === 0 && { flex: 1 }]}
                            showsVerticalScrollIndicator={false}
                        />
                    )
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContainer: {
        flex: 1,
        paddingHorizontal: 32,
    },
    headerTitleContainer: {
        marginTop: 10,
        marginBottom: 30,
    },
    welcomeSubSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
    },
    mainTagline: {
        fontSize: 26,
        fontWeight: '900',
        marginTop: 15,
        letterSpacing: -0.5,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    listContent: {
        paddingBottom: 40,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
    },
    avatarCircle: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '900',
    },
    listText: {
        flex: 1,
        marginLeft: 15,
    },
    itemName: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    itemSub: {
        fontSize: 9,
        fontWeight: '700',
        marginTop: 4,
        letterSpacing: 0.5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '900',
        marginTop: 20,
        letterSpacing: 1,
    },
    emptySub: {
        fontSize: 10,
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    refreshBtn: {
        marginTop: 30,
        backgroundColor: '#00AEEF',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 8,
    },
    refreshBtnText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
    progressBox: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(0, 174, 239, 0.1)',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pulse: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#00AEEF',
    },
    progressText: {
        fontSize: 8,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
});
