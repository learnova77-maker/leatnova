import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SignUpChoice() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : Colors.secondary} />
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>Join Learnova</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Select how you want to use the platform</Text>

                <View style={styles.choices}>
                    <TouchableOpacity
                        style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/student-signup')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1A2744' : '#E8F4FD' }]}>
                            <Ionicons name="person" size={32} color={Colors.primary} />
                        </View>
                        <View style={styles.choiceText}>
                            <Text style={[styles.choiceTitle, { color: colors.text }]}>Sign up as Student</Text>
                            <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>Learn from the best instructors around the world.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.choiceCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/signup')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#2D1F15' : '#FDF2E9' }]}>
                            <Ionicons name="school" size={32} color="#E67E22" />
                        </View>
                        <View style={styles.choiceText}>
                            <Text style={[styles.choiceTitle, { color: colors.text }]}>Sign up as Teacher</Text>
                            <Text style={[styles.choiceDescription, { color: colors.textSecondary }]}>Share your knowledge and earn from your expertise.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                    <Text style={styles.loginText}>Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    backButton: { padding: 24 },
    content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    title: { fontSize: 32, fontWeight: 'bold', color: Colors.secondary },
    subtitle: { fontSize: 16, color: Colors.grey, marginTop: 10, marginBottom: 40 },
    choices: { gap: 20 },
    choiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: Colors.lightGrey,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    choiceText: { flex: 1, marginLeft: 16, marginRight: 8 },
    choiceTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary },
    choiceDescription: { fontSize: 14, color: Colors.grey, marginTop: 4 },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 30,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    footerText: { fontSize: 16, color: Colors.grey },
    loginText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
});
