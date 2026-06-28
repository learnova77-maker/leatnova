import AppHeader from '@/components/sidebar/AppHeader';
import { userApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SettingsScreen() {
    const router = useRouter();
    const { colors, isDark, toggleTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Form States
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [bankName, setBankName] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const parsed = JSON.parse(userData);
                setUser(parsed);
                setFullName(parsed.fullName || '');
                setEmail(parsed.email || '');
                setUsername(parsed.username || '');

                // Fetch latest details from API to get bank info
                const res = await userApi.getProfile(parsed.uid);
                if (res.data.success) {
                    const latest = res.data.user;
                    setUser(latest);
                    setFullName(latest.fullName || '');
                    setEmail(latest.email || '');
                    setUsername(latest.username || '');
                    if (latest.bankDetails) {
                        setBankName(latest.bankDetails.bankName || '');
                        setAccountHolder(latest.bankDetails.accountHolder || '');
                        setAccountNumber(latest.bankDetails.accountNumber || '');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim() || !email.trim() || !username.trim()) {
            Alert.alert('Error', 'Name, Username, and Email are required.');
            return;
        }

        setIsSaving(true);
        try {
            const updateData: any = { fullName, email, username, photoUrl };
            if (user?.role === 'teacher') {
                updateData.bankDetails = {
                    bankName,
                    accountHolder,
                    accountNumber
                };
            }

            const res = await userApi.updateProfile(user.uid, updateData);
            if (res.data.success) {
                // Update local storage
                const updatedUser = { ...user, ...updateData };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
                Alert.alert('Success', 'Settings updated successfully.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteBank = () => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to remove your bank details?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSaving(true);
                        try {
                            const res = await userApi.updateProfile(user.uid, { bankDetails: null });
                            if (res.data.success) {
                                setBankName('');
                                setAccountHolder('');
                                setAccountNumber('');
                                Alert.alert('Deleted', 'Bank details removed.');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        } finally {
                            setIsSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setIsUploadingPhoto(true);
        try {
            const formData = new FormData();
            const filename = uri.split('/').pop() || 'profile.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image`;

            formData.append('file', {
                uri,
                name: filename,
                type,
            } as any);
            formData.append('folder', 'profiles');
            formData.append('userId', user.uid);

            const res = await userApi.uploadFile(formData);
            if (res.data.success) {
                setPhotoUrl(res.data.url);
                // Also update user profile immediately in DB
                await userApi.updateProfile(user.uid, { photoUrl: res.data.url });

                // Update local storage
                const updatedUser = { ...user, photoUrl: res.data.url };
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

                Alert.alert('Success', 'Profile photo updated.');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to upload photo: ' + error.message);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'DELETE ACCOUNT?',
            'This action is permanent and cannot be undone. All your data will be erased.',
            [
                { text: 'GO BACK', style: 'cancel' },
                {
                    text: 'DELETE PERMANENTLY',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await userApi.deleteProfile(user.uid);
                            if (res.data.success) {
                                await AsyncStorage.clear();
                                router.replace('/(auth)/login');
                            }
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isTeacher = user?.role === 'teacher';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <AppHeader title="SETTINGS" showBack onBackPress={() => router.back()} role={user?.role} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Profile Image Section */}
                    <View style={styles.profileImageSection}>
                        <View style={styles.avatarWrapper}>
                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={styles.avatarImg} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <Ionicons name="person" size={40} color={colors.textSecondary} />
                                </View>
                            )}
                            <TouchableOpacity style={styles.editAvatarBtn} onPress={pickImage} disabled={isUploadingPhoto}>
                                {isUploadingPhoto ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="camera" size={18} color="#FFF" />}
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.profileName, { color: colors.text }]}>{fullName || 'Learner'}</Text>
                        <Text style={[styles.profileRole, { color: colors.textSecondary }]}>{user?.role?.toUpperCase()}</Text>
                    </View>

                    {/* Appearance Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.settingRow}>
                                <View style={styles.settingInfo}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 174, 239, 0.1)' }]}>
                                        <Ionicons name={isDark ? "moon" : "sunny"} size={20} color="#00AEEF" />
                                    </View>
                                    <View>
                                        <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                                        <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                                            {isDark ? "Deep Space UI Active" : "Daylight UI Active"}
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={isDark}
                                    onValueChange={toggleTheme}
                                    trackColor={{ false: '#767577', true: 'rgba(0, 174, 239, 0.5)' }}
                                    thumbColor={isDark ? '#00AEEF' : '#f4f3f4'}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Profile Section */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PROFILE INFORMATION</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter your name"
                                    placeholderTextColor={colors.textSecondary}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Username</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    value={username}
                                    onChangeText={setUsername}
                                    placeholder="Enter username"
                                    placeholderTextColor={colors.textSecondary}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.text }]}>Email Address</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter email"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="email-address"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Bank Section - Teacher Only */}
                    {isTeacher && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>BANK DETAILS</Text>
                                {(bankName || accountHolder || accountNumber) && (
                                    <TouchableOpacity onPress={handleDeleteBank}>
                                        <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '700' }}>DELETE BANK</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Bank Name</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        value={bankName}
                                        onChangeText={setBankName}
                                        placeholder="e.g. HBL, Alfalah"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Account Holder Name</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        value={accountHolder}
                                        onChangeText={setAccountHolder}
                                        placeholder="Full name on account"
                                        placeholderTextColor={colors.textSecondary}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.inputLabel, { color: colors.text }]}>Account / IBAN Number</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                                        value={accountNumber}
                                        onChangeText={setAccountNumber}
                                        placeholder="Enter account number"
                                        placeholderTextColor={colors.textSecondary}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]}
                        onPress={handleSaveProfile}
                        disabled={isSaving}
                    >
                        {isSaving ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
                    </TouchableOpacity>

                    {/* Danger Zone */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#EB5757' }]}>DANGER ZONE</Text>
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: colors.card, borderColor: '#EB5757' + '40', flexDirection: 'row', alignItems: 'center', gap: 15 }]}
                            onPress={handleDeleteAccount}
                        >
                            <View style={[styles.iconBox, { backgroundColor: '#EB5757' + '10' }]}>
                                <Ionicons name="trash-outline" size={20} color="#EB5757" />
                            </View>
                            <View>
                                <Text style={{ color: '#EB5757', fontWeight: 'bold', fontSize: 15 }}>Delete Account</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Permanently erase your identity from Learnova</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20 },
    profileImageSection: { alignItems: 'center', marginBottom: 30 },
    avatarWrapper: { width: 100, height: 100, borderRadius: 50, position: 'relative', marginBottom: 15 },
    avatarImg: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderStyle: 'dashed' },
    editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00AEEF', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#000' },
    profileName: { fontSize: 20, fontWeight: 'bold' },
    profileRole: { fontSize: 10, letterSpacing: 2, fontWeight: '800', marginTop: 4 },
    section: { marginBottom: 25 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    settingInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    settingLabel: { fontSize: 16, fontWeight: 'bold' },
    settingSub: { fontSize: 11, marginTop: 2 },
    inputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
    input: {
        height: 52,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 15,
        fontSize: 14,
    },
    saveBtn: {
        backgroundColor: '#00AEEF',
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#00AEEF',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
