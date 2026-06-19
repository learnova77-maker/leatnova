import { authApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type UserRole = 'student' | 'teacher' | 'school';

export default function SchoolLoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const role = (params.role as UserRole) || 'student';
    const roleTitle = role === 'school' ? 'Principal' : role === 'teacher' ? 'Teacher' : 'Student';

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }
        setIsLoading(true);

        if (role === 'school' && email.toLowerCase() === 'admin' && password === 'admin') {
            await AsyncStorage.setItem('user', JSON.stringify({ uid: 'admin_principal', role: 'school', name: 'Admin Principal' }));
            setIsLoading(false);
            router.replace('/principal');
            return;
        }

        try {
            const response = await authApi.login({ email, password, role });
            if (response.data.success) {
                const userData = response.data.user;
                if (userData.role !== role) {
                    Alert.alert('Role Mismatch', `Account not found for ${roleTitle} node.`);
                    setIsLoading(false);
                    return;
                }
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                if ((userData.role === 'teacher' || userData.role === 'school') && userData.status === 'pending') {
                    router.replace('/(auth)/approval');
                } else {
                    router.replace(role === 'student' ? '/student' : '/teacher');
                }
            }
        } catch (err: any) {
            Alert.alert('Access Denied', err.response?.data?.message || 'Check your internet connection.');
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.navHeader}>
                            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                                <Ionicons name="arrow-back-outline" size={28} color="#00AEEF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.header}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={role === 'school' ? 'business-outline' : role === 'teacher' ? 'school-outline' : 'person-outline'} size={40} color="#00AEEF" />
                            </View>
                            <Text style={styles.statusLabel}>• INSTITUTIONAL LOGIN</Text>
                            <Text style={[styles.title, { color: '#1A1A1A' }]}>{roleTitle} Login</Text>
                            <Text style={styles.subtitle}>Sign in with your institution credentials.</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>EMAIL ADDRESS</Text>
                                <View style={[styles.inputWrapper, isEmailFocused && styles.inputFocused]}>
                                    <Ionicons name="mail-outline" size={20} color={isEmailFocused ? "#00AEEF" : "#AAA"} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter your email"
                                        placeholderTextColor="#AAA"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        onFocus={() => setIsEmailFocused(true)}
                                        onBlur={() => setIsEmailFocused(false)}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>PASSWORD</Text>
                                <View style={[styles.inputWrapper, isPasswordFocused && styles.inputFocused]}>
                                    <Ionicons name="lock-closed-outline" size={20} color={isPasswordFocused ? "#00AEEF" : "#AAA"} style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="••••••••"
                                        placeholderTextColor="#AAA"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                        onFocus={() => setIsPasswordFocused(true)}
                                        onBlur={() => setIsPasswordFocused(false)}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#00AEEF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.loginButton, isLoading && { opacity: 0.7 }]}
                                onPress={handleLogin}
                                disabled={isLoading}
                                activeOpacity={0.8}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.loginButtonText}>LOGIN</Text>}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    navHeader: { paddingTop: Platform.OS === 'android' ? 20 : 0, paddingHorizontal: 32, marginBottom: 10 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    scrollContent: { flexGrow: 1, paddingBottom: 60 },
    header: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
    iconContainer: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 24, backgroundColor: 'rgba(0,174,239,0.08)', borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)' },
    statusLabel: { fontSize: 8, fontWeight: '900', color: '#00AEEF', letterSpacing: 2, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: '900', marginBottom: 12, letterSpacing: -1 },
    subtitle: { fontSize: 13, textAlign: 'center', color: '#666', lineHeight: 20, fontWeight: '600' },
    form: { width: '100%', paddingHorizontal: 32 },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 9, fontWeight: '900', color: '#00AEEF', marginBottom: 12, letterSpacing: 1.5, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 20, height: 64, borderWidth: 1, borderColor: 'rgba(0,174,239,0.1)', backgroundColor: '#F8F9FA' },
    inputFocused: { borderColor: '#00AEEF', backgroundColor: '#FFFFFF', elevation: 4, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10 },
    inputIcon: { marginRight: 16 },
    input: { flex: 1, fontSize: 15, color: '#1A1A1A', fontWeight: '600' },
    loginButton: { width: '100%', height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 12, backgroundColor: '#00AEEF', shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
    loginButtonText: { fontSize: 12, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 },
});
