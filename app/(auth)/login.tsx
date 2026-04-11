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

type UserRole = 'student' | 'teacher' | 'school';

export default function LoginScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [isLoading, setIsLoading] = useState(false);
    const [showRolePicker, setShowRolePicker] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

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

                // Check Teacher/School Approval Status
                if ((userRole === 'teacher' || userRole === 'school') && userStatus === 'pending') {
                    router.replace('/(auth)/approval');
                    return;
                }

                // Redirect based on role
                if (userRole === 'teacher') {
                    router.replace('/teacher');
                } else if (userRole === 'school') {
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
                                    secureTextEntry={!showPassword}
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                    <Ionicons
                                        name={showPassword ? "eye-outline" : "eye-off-outline"}
                                        size={20}
                                        color={colors.textSecondary}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Role Selection Input */}
                        <View style={[styles.inputContainer, { zIndex: 5000, elevation: Platform.OS === 'android' ? 5000 : 0 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Login As</Text>
                            <TouchableOpacity
                                style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                                onPress={() => setShowRolePicker(!showRolePicker)}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={role === 'student' ? 'person-outline' : role === 'teacher' ? 'school-outline' : 'business-outline'}
                                    size={20}
                                    color={colors.textSecondary}
                                    style={styles.inputIcon}
                                />
                                <Text style={[styles.input, { color: colors.text, lineHeight: 56 }]}>
                                    {role === 'student' ? 'Student' : role === 'teacher' ? 'Teacher' : 'School'}
                                </Text>
                                <Ionicons name={showRolePicker ? "chevron-up" : "chevron-down"} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            {showRolePicker && (
                                <View style={[styles.roleDropdown, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 6000, elevation: 6000 }]}>
                                    <TouchableOpacity
                                        style={[styles.dropdownItem, role === 'student' && { backgroundColor: isDark ? '#1A2744' : '#F0F7FF' }]}
                                        onPress={() => { setRole('student'); setShowRolePicker(false); }}
                                    >
                                        <Ionicons name="person-outline" size={20} color={role === 'student' ? Colors.primary : colors.textSecondary} />
                                        <Text style={[styles.dropdownText, { color: colors.text }, role === 'student' && { color: Colors.primary, fontWeight: 'bold' }]}>Student</Text>
                                        {role === 'student' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.dropdownItem, role === 'teacher' && { backgroundColor: isDark ? '#1A2744' : '#F0F7FF' }]}
                                        onPress={() => { setRole('teacher'); setShowRolePicker(false); }}
                                    >
                                        <Ionicons name="school-outline" size={20} color={role === 'teacher' ? Colors.primary : colors.textSecondary} />
                                        <Text style={[styles.dropdownText, { color: colors.text }, role === 'teacher' && { color: Colors.primary, fontWeight: 'bold' }]}>Teacher</Text>
                                        {role === 'teacher' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.dropdownItem, role === 'school' && { backgroundColor: isDark ? '#1A2744' : '#F0F7FF' }, { borderBottomWidth: 0 }]}
                                        onPress={() => { setRole('school'); setShowRolePicker(false); }}
                                    >
                                        <Ionicons name="business-outline" size={20} color={role === 'school' ? Colors.primary : colors.textSecondary} />
                                        <Text style={[styles.dropdownText, { color: colors.text }, role === 'school' && { color: Colors.primary, fontWeight: 'bold' }]}>School</Text>
                                        {role === 'school' && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                                    </TouchableOpacity>
                                </View>
                            )}
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
                                    Login as {role === 'student' ? 'Student' : role === 'teacher' ? 'Teacher' : 'School'}
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
    roleDropdown: {
        position: 'absolute',
        top: 85,
        left: 0,
        right: 0,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        zIndex: 2000,
        overflow: 'hidden',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    dropdownText: {
        flex: 1,
        fontSize: 16,
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
