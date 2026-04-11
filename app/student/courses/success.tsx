import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function PaymentSuccess() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { courseId, courseTitle } = useLocalSearchParams();

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            // Force clear any specific success state if needed
        };
    }, []);

    const handleNavigation = (path: string) => {
        // Use replace to prevent going back to success page
        router.replace(path as any);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#1E293B' : '#F0FDF4' }]}>
                    <Ionicons name="checkmark-circle" size={100} color="#16A34A" />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>Payment Successful! 🎉</Text>

                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                    Congratulations! You are now officially enrolled in:
                </Text>

                <View style={[styles.courseChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="book-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.courseName, { color: colors.text }]}>
                        {courseTitle || 'Your Course'}
                    </Text>
                </View>

                <View style={styles.messageBox}>
                    <Text style={[styles.message, { color: colors.textSecondary }]}>
                        You can now access all modules, download resources, and start your learning journey.
                    </Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: Colors.primary }]}
                        onPress={() => router.replace(`/student/courses/${courseId}`)}
                    >
                        <Text style={styles.primaryBtnText}>Start Learning Now</Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: colors.border }]}
                        onPress={() => router.replace('/student')}
                    >
                        <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Go to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
    },
    iconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
    },
    subTitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
    },
    courseChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 50,
        borderWidth: 1,
        marginBottom: 30,
        gap: 10,
    },
    courseName: {
        fontSize: 16,
        fontWeight: '700',
    },
    messageBox: {
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    footer: {
        width: '100%',
        gap: 15,
    },
    primaryBtn: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        width: '100%',
    },
    primaryBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    secondaryBtn: {
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        width: '100%',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
