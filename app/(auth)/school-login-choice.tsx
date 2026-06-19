import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SchoolLoginChoice() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const options = [
        {
            id: 'principal',
            title: 'Principal / Admin',
            description: 'Access administrative tools and manage your institution.',
            icon: 'business-outline',
            onPress: () => router.push({ pathname: '/(auth)/school-login', params: { role: 'school' } })
        },
        {
            id: 'teacher',
            title: 'Teacher',
            description: 'Manage your classes and communicate with students.',
            icon: 'school-outline',
            onPress: () => router.push({ pathname: '/(auth)/school-login', params: { role: 'teacher' } })
        },
        {
            id: 'student',
            title: 'Student',
            description: 'Access your courses and track your academic progress.',
            icon: 'person-outline',
            onPress: () => router.push({ pathname: '/(auth)/school-login', params: { role: 'student' } })
        }
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 : 0 }]}>
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: 'transparent', borderWidth: 0 }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back-outline" size={28} color="#00AEEF" />
                    </TouchableOpacity>
                    <View style={styles.titleContainer}>
                        <Text style={styles.statusLabel}>• INSTITUTION LOGIN</Text>
                        <Text style={[styles.title, { color: '#1A1A1A' }]}>Access Portal</Text>
                        <Text style={styles.subtitle}>Please select your role to continue to the login screen.</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.optionCard}
                            onPress={option.onPress}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconWrapper}>
                                <Ionicons name={option.icon as any} size={28} color="#00AEEF" />
                            </View>
                            <View style={styles.optionInfo}>
                                <Text style={[styles.optionTitle, { color: '#1A1A1A' }]}>{option.title}</Text>
                                <Text style={styles.optionDescription}>{option.description}</Text>
                            </View>
                            <View style={styles.arrowWrapper}>
                                <Ionicons name="chevron-forward" size={16} color="#00AEEF" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Encountering authentication errors?</Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/approval')}>
                        <Text style={styles.supportText}>CONTACT SUPPORT</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: { paddingHorizontal: 32 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start', marginBottom: 20 },
    titleContainer: { marginBottom: 24 },
    statusLabel: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 2, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 12 },
    subtitle: { fontSize: 13, color: '#666', lineHeight: 20, fontWeight: '600' },
    scrollContent: { paddingHorizontal: 32, paddingBottom: 40 },
    optionCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 24, marginBottom: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15 },
    iconWrapper: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,174,239,0.08)', marginRight: 20, borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)' },
    optionInfo: { flex: 1 },
    optionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
    optionDescription: { fontSize: 12, color: '#666', lineHeight: 18, fontWeight: '600' },
    arrowWrapper: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,174,239,0.05)' },
    footer: { padding: 32, alignItems: 'center', gap: 8 },
    footerText: { fontSize: 10, color: '#999', fontWeight: '800', letterSpacing: 0.5 },
    supportText: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 1.5 },
});
