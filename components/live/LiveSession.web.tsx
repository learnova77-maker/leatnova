import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface LiveSessionProps {
    appId: string;
    channelName: string;
    token: string;
    uid: number;
    sessionId: string;
    userName: string;
    role: 'publisher' | 'subscriber';
    onEnd: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onEnd, channelName }) => {
    const { isDark } = useTheme();
    const activeColors = isDark ? Colors.dark : Colors.light;

    return (
        <View style={[styles.container, { backgroundColor: activeColors.background }]}>
            <View style={[styles.card, { 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
                borderColor: activeColors.border 
            }]}>
                {/* Warning Icon Container with Glow */}
                <View style={styles.iconContainer}>
                    <Ionicons name="videocam-off-outline" size={64} color={Colors.primary} />
                </View>

                <Text style={[styles.title, { color: activeColors.text }]}>
                    Live Class Mobile Par Dastiyab Hai
                </Text>
                
                <Text style={[styles.channelText, { color: Colors.primary }]}>
                    Channel: {channelName}
                </Text>

                <Text style={[styles.description, { color: activeColors.textSecondary }]}>
                    Live streaming aur interactive video/audio capabilities sirf hamari mobile app (Android / iOS) par supported hain. Behtareen experience aur live chat mein hissa lene ke liye baraye meherbani mobile device par app use karein.
                </Text>

                {/* Go Back Button */}
                <TouchableOpacity 
                    style={styles.button}
                    onPress={onEnd}
                    activeOpacity={0.8}
                >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Wapis Jayein</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        maxWidth: 500,
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        padding: 32,
        alignItems: 'center',
        shadowColor: '#00AEEF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(0, 174, 239, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    channelText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
    },
    button: {
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default LiveSession;
