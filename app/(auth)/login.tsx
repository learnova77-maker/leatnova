import { authApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
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

type UserRole = 'student' | 'teacher';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await authApi.login({ email, password, role });

            if (response.data.success) {
                const userData = response.data.user;
                const userRole = userData?.role;
                const userStatus = userData?.status;

                // Validate if selected role matches database role
                if (userRole !== role) {
                    Alert.alert(
                        'Role Mismatch',
                        `This account is registered as a ${userRole}. Please select the correct role to login.`
                    );
                    setIsLoading(false);
                    return;
                }

                // Save user data for global use
                await AsyncStorage.setItem('user', JSON.stringify(userData));

                // Check Teacher Approval Status
                if (userRole === 'teacher' && userStatus === 'pending') {
                    router.replace('/(auth)/approval');
                    return;
                }

                // Redirect based on role
                if (userRole === 'teacher') {
                    router.replace('/teacher');
                } else {
                    router.replace('/student');
                }
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            const errMsg = err.response?.data?.message || 'Check if the backend server is running.';
            Alert.alert('Login Failed', errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Logo & Welcome Section */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/images/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.title, { color: colors.text }]}>Learnova</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Login to your account</Text>
                    </View>

                    {/* Role Selection */}
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                role === 'student' && styles.activeRoleButton
                            ]}
                            onPress={() => setRole('student')}
                        >
                            <Ionicons
                                name="person-outline"
                                size={22}
                                color={role === 'student' ? Colors.secondary : Colors.grey}
                            />
                            <Text style={[
                                styles.roleButtonText,
                                role === 'student' ? { color: Colors.secondary } : { color: colors.textSecondary }
                            ]}>Student</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.roleButton,
                                role === 'teacher' && styles.activeRoleButton
                            ]}
                            onPress={() => setRole('teacher')}
                        >
                            <Ionicons
                                name="school-outline"
                                size={22}
                                color={role === 'teacher' ? Colors.secondary : Colors.grey}
                            />
                            <Text style={[
                                styles.roleButtonText,
                                role === 'teacher' ? { color: Colors.secondary } : { color: colors.textSecondary }
                            ]}>Teacher</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form Section */}
                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Email or Phone</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="example@mail.com"
                                    placeholderTextColor="#999"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.loginButton,
                                { backgroundColor: isDark ? Colors.primary : Colors.secondary },
                                isLoading && { opacity: 0.7 }
                            ]}
                            onPress={handleLogin}
                            activeOpacity={0.8}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={isDark ? Colors.secondary : Colors.white} />
                            ) : (
                                <Text style={[
                                    styles.loginButtonText,
                                    { color: isDark ? Colors.secondary : Colors.white }
                                ]}>
                                    Login as {role === 'student' ? 'Student' : 'Teacher'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/signup-choice')}>
                            <Text style={styles.signUpText}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingBottom: 40,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 15,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.grey,
        marginTop: 5,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 30,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 50,
        borderRadius: 12,
        backgroundColor: Colors.lightGrey,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    activeRoleButton: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    roleButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.grey,
    },
    activeRoleButtonText: {
        color: Colors.secondary,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.lightGrey,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.secondary,
    },
    loginButton: {
        width: '100%',
        height: 60,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    loginButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.white,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 16,
        color: Colors.grey,
    },
    signUpText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
});
