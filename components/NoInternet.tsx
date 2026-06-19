import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { Path, Svg } from 'react-native-svg';

const { width } = Dimensions.get('window');

const NoInternet = () => {
    const { colors, isDark } = useTheme();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {isDark && (
                <LinearGradient
                    colors={['#000000', '#001A2B', '#000000']}
                    style={StyleSheet.absoluteFill}
                />
            )}

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Svg width={120} height={120} viewBox="0 0 24 24" fill="none">
                        <Path
                            d="M1 1L23 23M16.72 11.06C17.5 11.85 18.12 12.8 18.57 13.84C19.01 14.88 19.27 16 19.33 17.15M5.17 7.12C4.12 8.17 3.25 9.4 2.62 10.74C1.98 12.08 1.6 13.51 1.48 15"
                            stroke={Colors.primary}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <Path
                            d="M8.5 8.5C9.5 7.5 10.7 6.8 12 6.5C13.3 6.2 14.7 6.3 16 6.8M5 14L5 20C5 21.1 5.9 22 7 22L13 22"
                            stroke={Colors.primary}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                        <Path
                            d="M12 12C12.8 12 13.5 12.3 14.1 12.9C14.7 13.5 15 14.2 15 15"
                            stroke={Colors.primary}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                        />
                    </Svg>
                </View>

                <Text style={[styles.title, { color: colors.text }]}>NO <Text style={{ color: Colors.primary }}>INTERNET</Text></Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    It looks like you're offline. Check your connection or explore your offline videos.
                </Text>

                <View style={[styles.statusBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                    <View style={styles.dot} />
                    <Text style={[styles.statusText, { color: colors.textSecondary }]}>OFFLINE MODE ACTIVE</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '80%',
        alignItems: 'center',
        padding: 30,
        borderRadius: 32,
    },
    iconContainer: {
        width: 140,
        height: 140,
        backgroundColor: 'rgba(0, 174, 239, 0.05)',
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(0, 174, 239, 0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 15,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 30,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF4B4B',
        marginRight: 10,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    }
});

export default NoInternet;
