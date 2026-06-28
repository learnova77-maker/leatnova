import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignUpChoice() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const roles = [
        { id: 'student', title: 'STUDENT', sub: 'LEARNER', icon: 'person-outline', desc: 'Learn new skills and track your progress.' },
        { id: 'teacher', title: 'TEACHER', sub: 'INSTRUCTOR', icon: 'school-outline', desc: 'Teach students and share your knowledge.' },
        { id: 'school', title: 'SCHOOL', sub: 'ADMINISTRATION', icon: 'business-outline', desc: 'Manage your school and students.' },
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.navHeader}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back-outline" size={28} color="#00AEEF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.welcomeSubSmall}>• GET STARTED</Text>
                        <Text style={[styles.title, { color: '#1A1A1A' }]}>
                            Choose your <Text style={{ color: '#00AEEF' }}>Role</Text>
                        </Text>
                    </View>

                    <View style={styles.choices}>
                        {roles.map((role) => (
                            <TouchableOpacity
                                key={role.id}
                                activeOpacity={role.id === 'school' ? 1 : 0.8}
                                style={[styles.choiceCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,174,239,0.1)' }, role.id === 'school' && { opacity: 0.6 }]}
                                onPress={() => {
                                    if (role.id !== 'school') {
                                        router.push({ pathname: '/google-signup', params: { role: role.id } });
                                    }
                                }}
                            >
                                {role.id === 'school' && (
                                    <View style={{ 
                                        position: 'absolute', 
                                        top: 16, 
                                        right: 16, 
                                        backgroundColor: 'rgba(0, 174, 239, 0.1)', 
                                        paddingHorizontal: 8, 
                                        paddingVertical: 4, 
                                        borderRadius: 10, 
                                        borderWidth: 1, 
                                        borderColor: 'rgba(0, 174, 239, 0.4)',
                                        shadowColor: '#00AEEF',
                                        shadowOffset: { width: 0, height: 0 },
                                        shadowOpacity: 0.8,
                                        shadowRadius: 8,
                                        elevation: 5
                                    }}>
                                        <Text style={{ fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 0.5 }}>COMING SOON</Text>
                                    </View>
                                )}
                                <View style={styles.cardHeader}>
                                    <View style={[styles.iconBox, role.id === 'school' && { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' }]}>
                                        <Ionicons name={role.id === 'school' ? 'lock-closed' : role.icon as any} size={24} color={role.id === 'school' ? '#9CA3AF' : '#00AEEF'} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.choiceTitle, { color: role.id === 'school' ? '#9CA3AF' : '#1A1A1A' }]}>{role.title}</Text>
                                        <Text style={[styles.roleSub, role.id === 'school' && { color: '#9CA3AF' }]}>{role.sub}</Text>
                                    </View>
                                    {role.id !== 'school' && <Ionicons name="chevron-forward" size={20} color="#00AEEF" />}
                                </View>
                                <Text style={[styles.choiceDescription, { color: role.id === 'school' ? '#9CA3AF' : '#666' }]}>{role.desc}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: '#666' }]}>ALREADY HAVE AN ACCOUNT? </Text>
                    <TouchableOpacity onPress={() => router.replace('/login')}>
                        <Text style={styles.loginText}>LOGIN HERE</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    navHeader: { paddingTop: Platform.OS === 'android' ? 40 : 10, paddingHorizontal: 16 },
    backButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: 'rgba(0,174,239,0.05)' },
    content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
    header: { marginBottom: 40 },
    welcomeSubSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    choices: { gap: 16 },
    choiceCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 174, 239, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 174, 239, 0.1)',
    },
    choiceTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    roleSub: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 1.5, marginTop: 2 },
    choiceDescription: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: 60,
    },
    footerText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    loginText: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 1 },
});
