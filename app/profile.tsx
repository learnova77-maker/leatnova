import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function ProfileScreen() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    const isTeacher = role === 'teacher';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : Colors.secondary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>My Profile</Text>
                <TouchableOpacity style={styles.editButton}>
                    <Ionicons name="create-outline" size={24} color={isDark ? colors.text : Colors.secondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={50} color={Colors.white} />
                        </View>
                        <TouchableOpacity style={[styles.cameraIcon, { borderColor: colors.card }]}>
                            <Ionicons name="camera" size={18} color={Colors.white} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.userName, { color: colors.text }]}>{isTeacher ? 'Prof. Wei Chen' : 'Ali Ahmed'}</Text>
                    <Text style={[styles.userRole, { color: colors.textSecondary }]}>{isTeacher ? 'Expert Instructor' : 'IELTS Student'}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statVal, { color: colors.text }]}>{isTeacher ? '128' : '12'}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isTeacher ? 'Students' : 'Courses'}</Text>
                        </View>
                        <View style={[styles.statItem, styles.statBorder, { borderColor: colors.border }]}>
                            <Text style={[styles.statVal, { color: colors.text }]}>{isTeacher ? '4.9' : '85%'}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isTeacher ? 'Rating' : 'Progress'}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statVal, { color: colors.text }]}>{isTeacher ? '85' : '24'}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{isTeacher ? 'Videos' : 'Badges'}</Text>
                        </View>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Account Information</Text>
                    <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
                        <View style={styles.infoRow}>
                            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email Address</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{isTeacher ? 'wei.chen@learnova.com' : 'ali.ahmed@example.com'}</Text>
                            </View>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="school-outline" size={20} color={colors.textSecondary} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{isTeacher ? 'Expertise' : 'Main Goal'}</Text>
                                <Text style={[styles.infoValue, { color: colors.text }]}>{isTeacher ? 'Web Development / Chinese' : 'IELTS Band 8.0'}</Text>
                            </View>
                        </View>
                        {isTeacher && (
                            <View style={styles.infoRow}>
                                <Ionicons name="briefcase-outline" size={20} color={colors.textSecondary} />
                                <View style={styles.infoTextContainer}>
                                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Experience</Text>
                                    <Text style={[styles.infoValue, { color: colors.text }]}>12 Years</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* Settings Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
                    <View style={[styles.infoBox, { backgroundColor: colors.card }]}>
                        <TouchableOpacity style={[styles.settingsBtn, { borderBottomColor: colors.border }]}>
                            <View style={styles.settingsRow}>
                                <Ionicons name="notifications-outline" size={20} color={isDark ? colors.text : Colors.secondary} />
                                <Text style={[styles.settingsLabel, { color: colors.text }]}>Notifications</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.settingsBtn, { borderBottomColor: colors.border }]}>
                            <View style={styles.settingsRow}>
                                <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? colors.text : Colors.secondary} />
                                <Text style={[styles.settingsLabel, { color: colors.text }]}>Privacy & Security</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.logoutBtn}
                            onPress={() => router.replace('/login')}
                        >
                            <View style={styles.settingsRow}>
                                <Ionicons name="log-out-outline" size={20} color="#EB5757" />
                                <Text style={[styles.settingsLabel, { color: '#EB5757' }]}>Logout</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: Colors.white,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    backButton: {
        padding: 5,
    },
    editButton: {
        padding: 5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileCard: {
        backgroundColor: Colors.white,
        padding: 25,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.secondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: Colors.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.white,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    userRole: {
        fontSize: 14,
        color: Colors.grey,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        marginTop: 25,
        width: '100%',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#EEE',
    },
    statVal: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.grey,
        marginTop: 2,
    },
    section: {
        marginTop: 25,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.secondary,
        marginBottom: 12,
        marginLeft: 5,
    },
    infoBox: {
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 5,
        elevation: 2,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 15,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: Colors.grey,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        marginTop: 1,
    },
    settingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    settingsLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.secondary,
    },
    logoutBtn: {
        paddingVertical: 15,
    }
});
