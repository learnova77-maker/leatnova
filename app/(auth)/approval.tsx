import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring
} from 'react-native-reanimated';

export default function ApprovalScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // Animation Values
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const rotate = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        // Entrance animation
        scale.value = withSpring(1, { damping: 12 });
        opacity.value = withDelay(200, withSpring(1));

        // Continuous pulse for the outer circle
        pulse.value = withRepeat(
            withSequence(
                withSpring(1.15, { damping: 10 }),
                withSpring(1, { damping: 10 })
            ),
            -1,
            true
        );

        // Subtle icon rotation
        rotate.value = withRepeat(
            withSequence(
                withSpring(0.1, { damping: 10 }),
                withSpring(-0.1, { damping: 10 })
            ),
            -1,
            true
        );
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotate.value}rad` }
        ],
        opacity: opacity.value,
    }));

    const animatedPulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: interpolate(pulse.value, [1, 1.15], [0.4, 0.1], 'clamp'),
    }));

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.content}>
                {/* Animated SVG-like Icon Section */}
                <View style={styles.animationWrapper}>
                    <Animated.View style={[styles.pulseCircle, animatedPulseStyle]} />
                    <Animated.View style={[styles.iconCircle, { backgroundColor: colors.card, shadowColor: Colors.primary }, animatedIconStyle]}>
                        <Ionicons name="time-outline" size={80} color={Colors.primary} />
                    </Animated.View>
                </View>

                {/* Text Section */}
                <Animated.View style={[styles.textWrapper, { opacity }]}>
                    <Text style={[styles.title, { color: colors.text }]}>Application Submitted!</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Your instructor profile is currently under review by our team.
                        We will notify you via email once your account is approved.
                    </Text>
                </Animated.View>

                {/* Info Cards */}
                <View style={[styles.infoContainer, { backgroundColor: colors.inputBg }]}>
                    <View style={styles.infoRow}>
                        <View style={styles.dot} />
                        <Text style={[styles.infoText, { color: colors.text }]}>Review takes 24-48 working hours.</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <View style={styles.dot} />
                        <Text style={[styles.infoText, { color: colors.text }]}>Check your inbox for Next Steps.</Text>
                    </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => router.replace('/login')}
                >
                    <Text style={styles.doneButtonText}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    animationWrapper: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        position: 'relative',
    },
    pulseCircle: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: Colors.primary,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: Colors.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
    },
    textWrapper: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.secondary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.grey,
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 24,
    },
    infoContainer: {
        width: '100%',
        backgroundColor: '#F9FAFB',
        padding: 20,
        borderRadius: 20,
        gap: 12,
        marginBottom: 40,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    infoText: {
        fontSize: 14,
        color: Colors.secondary,
        fontWeight: '500',
    },
    doneButton: {
        width: '100%',
        height: 60,
        backgroundColor: Colors.secondary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    doneButtonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
