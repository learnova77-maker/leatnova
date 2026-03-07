import { authApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
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

export default function StudentSignUp() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        if (!fullName || !email || !password) {
            Alert.alert('Missing Fields', 'Please fill in all mandatory fields.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
            return;
        }

        setIsLoading(true);
        try {
            const signupData = {
                fullName,
                email,
                password,
                role: 'student'
            };

            const response = await authApi.signup(signupData);

            if (response.data.success) {
                const userData = response.data.user;
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                router.replace('/student');
            }
        } catch (err: any) {
            console.error('Signup Error:', err);
            const errMsg = err.response?.data?.message || 'Something went wrong. Please check your connection.';
            Alert.alert('Error', errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={Colors.secondary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={styles.title}>Student Sign Up</Text>
                        <Text style={styles.subtitle}>Join Learnova to start learning</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Full Name *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ali Ahmed"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email Address *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="ali@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && { opacity: 0.7 }]}
                            onPress={handleSignUp}
                            disabled={isLoading}
                        >
                            {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>Create Account</Text>}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/login')}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    scrollContent: { padding: 24, flexGrow: 1, justifyContent: 'center' },
    backButton: { marginBottom: 20 },
    header: { marginBottom: 30 },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.secondary },
    subtitle: { fontSize: 16, color: Colors.grey, marginTop: 8 },
    form: { gap: 20 },
    inputContainer: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: Colors.secondary },
    input: {
        height: 56,
        backgroundColor: Colors.lightGrey,
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    signUpButton: {
        height: 60,
        backgroundColor: Colors.secondary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    signUpButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
    footerText: { color: Colors.grey, fontSize: 16 },
    loginText: { color: Colors.primary, fontSize: 16, fontWeight: 'bold' }
});
