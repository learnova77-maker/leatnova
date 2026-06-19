import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function EnrollmentSuccess() {
    const router = useRouter();
    const { id, courseId, courseTitle } = useLocalSearchParams();
    const { colors, isDark } = useTheme();

    const targetId = id || courseId;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <View style={styles.content}>
                <View style={styles.iconWrapper}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)', borderColor: isDark ? 'rgba(0, 174, 239, 0.3)' : 'rgba(0, 174, 239, 0.2)' }]}>
                        <Ionicons name="shield-checkmark" size={60} color="#00AEEF" />
                    </View>
                    <View style={[styles.glowRing, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.05)' : 'rgba(0, 174, 239, 0.03)' }]} />
                </View>

                <Text style={[styles.title, { color: colors.text }]}>SUCCESSFULLY <Text style={{ color: '#00AEEF' }}>ENROLLED</Text></Text>

                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>
                    YOU HAVE SUCCESSFULLY ENROLLED IN:
                </Text>

                <View style={[styles.courseChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={styles.courseName}>
                        {String(courseTitle || 'YOUR COURSE').toUpperCase()}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => router.replace(`/student/courses/${targetId}`)}
                    >
                        <Text style={styles.primaryBtnText}>START LEARNING NOW</Text>
                        <Ionicons name="chevron-forward" size={16} color="#000" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryBtn, { borderColor: colors.border }]}
                        onPress={() => router.replace('/student')}
                    >
                        <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>GO TO DASHBOARD</Text>
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
        paddingHorizontal: 40,
    },
    iconWrapper: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        borderWidth: 1,
    },
    glowRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        zIndex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 15,
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subTitle: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: '700',
        letterSpacing: 1,
        lineHeight: 18,
    },
    courseChip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 50,
    },
    courseName: {
        fontSize: 12,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 0.5,
    },
    footer: {
        width: '100%',
        gap: 20,
    },
    primaryBtn: {
        flexDirection: 'row',
        height: 60,
        borderRadius: 12,
        backgroundColor: '#00AEEF',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    primaryBtnText: {
        color: '#000',
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    secondaryBtn: {
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        width: '100%',
    },
    secondaryBtnText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
