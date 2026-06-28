import { authApi } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        GoogleSignin.configure({
            webClientId: '239945810669-b0inemo2igerag5f6rsr16vu1n6230hh.apps.googleusercontent.com',
            offlineAccess: true,
        });
    }, []);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            if (GoogleSignin.hasPreviousSignIn()) {
                await GoogleSignin.signOut();
            }
            const userInfo = await GoogleSignin.signIn();
            const user = userInfo.data?.user || (userInfo as any).user;

            if (user) {
                const response = await authApi.login({
                    email: user.email,
                    uid: user.id,
                    isGoogleAuth: true,
                });

                if (response.data.success) {
                    const userData = response.data.user;
                    await AsyncStorage.setItem('user', JSON.stringify(userData));
                    if (userData?.status === 'pending') router.replace('/(auth)/approval');
                    else if (userData?.role === 'teacher' || userData?.role === 'school') router.replace('/teacher');
                    else router.replace('/student');
                }
            }
        } catch (error: any) {
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert("Login Failed", "Could not sign in with Google.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.contentWrapper}>
                    <View style={styles.header}>
                        <View style={styles.logoContainer}>
                            <Image source={require('../../assets/images/logo.jpg')} style={styles.logo} resizeMode="contain" />
                        </View>
                        <Text style={styles.mainTitle}>MALTO<Text style={{ color: '#00AEEF' }}>VERSE</Text></Text>
                        <View style={styles.taglineBox}>
                            <Text style={styles.tagline}>ELITE LEARNING PLATFORM</Text>
                        </View>
                    </View>

                    <View style={styles.actionCard}>
                        <Text style={styles.actionTitle}>LOGIN TO YOUR ACCOUNT</Text>
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleLogin}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Ionicons name="logo-google" size={22} color="#FFF" style={{ marginRight: 12 }} />
                                    <Text style={styles.googleButtonText}>CONTINUE WITH GOOGLE</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footerRow}>
                        <Text style={styles.footerText}>DON'T HAVE AN ACCOUNT? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup-choice')}>
                            <Text style={styles.signUpLink}>REGISTER NOW</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.systemFooter}>
                        <Text style={styles.systemText}>
                            <Text style={{ color: '#00AEEF' }}>• </Text>
                            MATLOVERSE <Text style={{ color: '#00AEEF' }}>• </Text> SECURE ACCESS
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    contentWrapper: { flex: 1, paddingHorizontal: 40, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', marginBottom: 60 },
    logoContainer: { width: 90, height: 90, borderRadius: 24, padding: 2, backgroundColor: 'rgba(0,174,239,0.1)', marginBottom: 24, overflow: 'hidden' },
    logo: { width: '100%', height: '100%', borderRadius: 22 },
    mainTitle: { fontSize: 42, fontWeight: '900', color: '#1A1A1A', letterSpacing: -1, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    taglineBox: { marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,174,239,0.1)', paddingTop: 12, paddingHorizontal: 16 },
    tagline: { fontSize: 10, color: '#00AEEF', fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
    actionCard: { width: '100%', backgroundColor: '#FFFFFF', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)', marginBottom: 40, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20 },
    actionTitle: { fontSize: 9, fontWeight: '900', color: '#666', textAlign: 'center', letterSpacing: 2, marginBottom: 24 },
    googleButton: { backgroundColor: '#00AEEF', height: 64, width: '100%', borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
    btnContent: { flexDirection: 'row', alignItems: 'center' },
    googleButtonText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
    footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    footerText: { fontSize: 10, color: '#666', fontWeight: '900', letterSpacing: 1 },
    signUpLink: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 1 },
    systemFooter: { position: 'absolute', bottom: 60 },
    systemText: { color: '#999', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
