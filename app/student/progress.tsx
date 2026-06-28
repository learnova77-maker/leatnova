import AppHeader from '@/components/sidebar/AppHeader';
import AppSidebar from '@/components/sidebar/AppSidebar';
import { courseApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
    ActivityIndicator,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentProgress() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [completedCourses, setCompletedCourses] = useState<any[]>([]);
    const [activeCourseDetails, setActiveCourseDetails] = useState<any>(null);
    const [selectedCompletedCourse, setSelectedCompletedCourse] = useState<any>(null);
    const [userName, setUserName] = useState('');
    const [generatingCertId, setGeneratingCertId] = useState<string | null>(null);

    const loadProgressData = async () => {
        try {
            const userData = await AsyncStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                setUserName(user.fullName || 'Student');
                const res = await courseApi.getEnrolledCourses(user.uid);
                
                if (res.data.success) {
                    const courses = res.data.courses || [];
                    
                    // 1. Find and process previous completed courses
                    const completed = courses.filter((c: any) => c.progress === 100).map((c: any) => {
                        let totalVideos = 0;
                        const moduleStats: any[] = [];
                        if (c.modules) {
                            const moduleIds = Object.keys(c.modules);
                            for (const mId of moduleIds) {
                                const mod = c.modules[mId];
                                const lectureIds = Object.keys(mod.lectures || {});
                                totalVideos += lectureIds.length;
                                moduleStats.push({
                                    id: mId,
                                    title: mod.title || `Module`,
                                    total: lectureIds.length,
                                    watched: lectureIds.length,
                                    status: 'completed'
                                });
                            }
                        }
                        return { ...c, totalVideos, watchedVideos: totalVideos, moduleStats };
                    });
                    setCompletedCourses(completed);

                    // 2. Find current active course
                    let activeCourse = courses.find((c: any) => c.progress > 0 && c.progress < 100);
                    if (!activeCourse && courses.length > 0) {
                        const pending = courses.filter((c: any) => c.progress === 0);
                        if (pending.length > 0) {
                            activeCourse = pending.sort((a: any, b: any) => b.enrolledAt - a.enrolledAt)[0];
                        }
                    }

                    if (activeCourse) {
                        let totalVideos = 0;
                        let watchedVideos = 0;
                        const moduleStats: any[] = [];

                        if (activeCourse.modules) {
                            const moduleIds = Object.keys(activeCourse.modules);

                            for (const mId of moduleIds) {
                                const mod = activeCourse.modules[mId];
                                const lectureIds = Object.keys(mod.lectures || {});
                                const totalLecturesInMod = lectureIds.length;
                                let watchedInMod = 0;

                                const progress = activeCourse.lectureProgress || {};
                                lectureIds.forEach(lId => {
                                    if (progress[lId]?.completed) {
                                        watchedInMod++;
                                    }
                                });

                                totalVideos += totalLecturesInMod;
                                watchedVideos += watchedInMod;

                                let status = 'pending';
                                if (watchedInMod === totalLecturesInMod && totalLecturesInMod > 0) status = 'completed';
                                else if (watchedInMod > 0) status = 'in-progress';

                                moduleStats.push({
                                    id: mId,
                                    title: mod.title || `Module`,
                                    total: totalLecturesInMod,
                                    watched: watchedInMod,
                                    status
                                });
                            }
                        }

                        setActiveCourseDetails({
                            ...activeCourse,
                            totalVideos,
                            watchedVideos,
                            moduleStats
                        });
                    } else {
                        setActiveCourseDetails(null);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading progress:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProgressData();
    }, []);

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadProgressData();
        setRefreshing(false);
    }, []);

    const handleDownloadCertificate = async (course: any) => {
        if (!course || generatingCertId) return;
        setGeneratingCertId(course.id);
        try {
            const dateStr = new Date(course.enrolledAt || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            // Escape HTML after uppercase so entities like &amp; stay lowercase and valid
            const escapeHtml = (str: string) => str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
            
            const instructor = course.instructorName ? course.instructorName : 'INSTRUCTOR';
            const rawTitle = course.title || course.courseName || course.courseTitle || 'COURSE COMPLETED';
            
            const safeTitle = escapeHtml(rawTitle.toUpperCase());
            const safeUserName = escapeHtml(userName.toUpperCase());
            const safeInstructor = escapeHtml(instructor.toUpperCase());

            const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Montserrat:wght@400;600;700&display=swap');
        body { margin: 0; padding: 0; background-color: #f5f5f5; display: flex; justify-content: center; align-items: center; height: 100vh; }
        .certificate {
            width: 800px; height: 600px; background-color: #fff; padding: 40px; position: relative; box-sizing: border-box;
            border: 15px solid #00AEEF; box-shadow: 0 0 20px rgba(0,0,0,0.1); text-align: center; font-family: 'Montserrat', sans-serif;
            display: flex; flex-direction: column; justify-content: center;
        }
        .certificate::before {
            content: ''; position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border: 2px solid #00AEEF; pointer-events: none;
        }
        .header { margin-top: 10px; }
        .app-name { font-family: 'Cinzel', serif; font-size: 32px; color: #000; letter-spacing: 4px; }
        .app-name span { color: #00AEEF; }
        .title { font-family: 'Cinzel', serif; font-size: 40px; color: #1a1a1a; margin-top: 15px; letter-spacing: 2px; }
        .subtitle { font-size: 14px; color: #666; margin-top: 10px; text-transform: uppercase; letter-spacing: 2px; }
        .student-name {
            font-family: 'Cinzel', serif; font-size: 36px; color: #00AEEF; margin-top: 10px; border-bottom: 2px solid #e0e0e0;
            display: inline-block; padding-bottom: 5px; min-width: 400px;
        }
        .course-desc { font-size: 16px; color: #444; margin-top: 20px; line-height: 1.6; padding: 0 50px; }
        .course-name { font-family: 'Cinzel', serif; font-size: 26px; font-weight: 700; color: #000; margin-top: 15px; margin-bottom: 20px; }
        .footer { margin-top: auto; display: flex; justify-content: space-between; padding: 0 60px; position: relative; z-index: 10; margin-bottom: 20px; }
        .signature-block { text-align: center; width: 220px; }
        .signature-value { font-family: 'Cinzel', serif; font-size: 18px; color: #1a1a1a; min-height: 25px; margin-bottom: 5px; }
        .signature-line { width: 100%; border-bottom: 2px solid #000; margin-bottom: 5px; }
        .signature-text { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; }
        .badge {
            position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 110px; height: 110px;
            background: #00AEEF; border-radius: 50%; display: flex; align-items: center; justify-content: center;
            color: #fff; font-family: 'Cinzel', serif; font-size: 15px; font-weight: bold; text-align: center;
            border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.2); z-index: 5; line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="header">
            <div class="app-name">MATLO<span>VERSE</span></div>
        </div>
        <div class="title">CERTIFICATE OF COMPLETION</div>
        <div class="subtitle">THIS IS PROUDLY PRESENTED TO</div>
        
        <div class="student-name">${safeUserName}</div>
        
        <div class="course-desc">
            For successfully completing the comprehensive modules and fulfilling all requirements of the course:
        </div>
        <div class="course-name">${safeTitle}</div>
        
        <div class="footer">
            <div class="signature-block">
                <div class="signature-value">${dateStr}</div>
                <div class="signature-line"></div>
                <div class="signature-text">DATE OF COMPLETION</div>
            </div>
            <div class="signature-block">
                <div class="signature-value" style="font-family: 'Montserrat', sans-serif; font-style: italic; font-weight: bold;">${safeInstructor}</div>
                <div class="signature-line"></div>
                <div class="signature-text">COURSE INSTRUCTOR</div>
            </div>
        </div>
        
        <div class="badge">100%<br>VERIFIED</div>
    </div>
</body>
</html>`;
            const { uri } = await Print.printToFileAsync({ html, width: 800, height: 600 });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (err) {
            console.error('Error generating certificate:', err);
        } finally {
            setGeneratingCertId(null);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <AppSidebar role="student" isSidebarOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <AppHeader title="MY PROGRESS" toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} role="student" />

            <ScrollView 
                style={styles.screenContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#00AEEF']} tintColor="#00AEEF" />}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.screenHeader}>
                    <Text style={[styles.screenTitle, { color: colors.text }]}>DETAILED <Text style={{ color: '#00AEEF' }}>REPORT</Text></Text>
                    <Text style={[styles.screenSub, { color: colors.textSecondary }]}>Track your modules and completed courses.</Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color="#00AEEF" style={{ marginTop: 50 }} />
                ) : (
                    <>
                        <Text style={[styles.sectionHeading, { color: colors.text }]}>ACTIVE COURSE</Text>
                        
                        <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(0, 174, 239, 0.15)' : 'rgba(0, 174, 239, 0.1)' }]}>
                            {activeCourseDetails ? (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                            <Text style={styles.badgeText}>{activeCourseDetails.category?.toUpperCase() || 'COURSE'}</Text>
                                        </View>
                                        <Text style={styles.progressPercent}>{activeCourseDetails.progress || 0}% DONE</Text>
                                    </View>
                                    
                                    <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>{activeCourseDetails.title}</Text>
                                    
                                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <View style={[styles.progressBarFill, { width: `${activeCourseDetails.progress || 0}%` }]} />
                                    </View>
                                    
                                    <View style={[styles.statsRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="videocam-outline" size={16} color={colors.textSecondary} />
                                            <Text style={[styles.statItemText, { color: colors.textSecondary }]}>TOTAL VIDEOS: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{activeCourseDetails.totalVideos}</Text></Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="eye-outline" size={16} color="#00AEEF" />
                                            <Text style={[styles.statItemText, { color: colors.textSecondary }]}>WATCHED: <Text style={{ color: '#00AEEF', fontWeight: 'bold' }}>{activeCourseDetails.watchedVideos}</Text></Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.moduleListHeading, { color: colors.text }]}>MODULE BREAKDOWN</Text>
                                    
                                    <View style={styles.moduleList}>
                                        {activeCourseDetails.moduleStats.map((mod: any, index: number) => (
                                            <View key={mod.id} style={[styles.moduleRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
                                                <View style={styles.moduleRowLeft}>
                                                    {mod.status === 'completed' && <Ionicons name="checkmark-circle" size={20} color="#10B981" />}
                                                    {mod.status === 'in-progress' && <Ionicons name="play-circle" size={20} color="#00AEEF" />}
                                                    {mod.status === 'pending' && <Ionicons name="ellipse-outline" size={20} color={colors.textSecondary} />}
                                                    
                                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                                        <Text style={[styles.modTitle, { color: colors.text }]} numberOfLines={1}>Part {index + 1}: {mod.title}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.modProgress, { color: mod.status === 'completed' ? '#10B981' : (mod.status === 'in-progress' ? '#00AEEF' : colors.textSecondary) }]}>
                                                    {mod.watched}/{mod.total}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            ) : (
                                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                                    <Ionicons name="leaf-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 10 }} />
                                    <Text style={[styles.courseName, { color: colors.textSecondary, marginBottom: 0 }]}>NO ACTIVE COURSE</Text>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 5 }}>Enroll in a course to start tracking.</Text>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 10 }]}>PREVIOUSLY COMPLETED ({completedCourses.length})</Text>
                        
                        {completedCourses.length > 0 ? (
                            completedCourses.map((c: any) => (
                                <TouchableOpacity 
                                    key={c.id} 
                                    style={[styles.completedCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedCompletedCourse(c)}
                                >
                                    <View style={{ flex: 1, paddingRight: 15 }}>
                                        <Text style={[styles.compCourseTitle, { color: colors.text }]} numberOfLines={2}>{c.title}</Text>
                                        <Text style={[styles.compInstructor, { color: colors.textSecondary }]}>BY {c.instructorName?.toUpperCase() || 'EXPERT'}</Text>
                                    </View>
                                    <View style={styles.compBadge}>
                                        <Ionicons name="ribbon-outline" size={16} color="#F59E0B" />
                                        <Text style={styles.compBadgeText}>100%</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={{ marginLeft: 15, padding: 8, backgroundColor: isDark ? 'rgba(0,174,239,0.1)' : 'rgba(0,174,239,0.05)', borderRadius: 12 }}
                                        onPress={(e) => { e.stopPropagation(); handleDownloadCertificate(c); }}
                                    >
                                        {generatingCertId === c.id ? <ActivityIndicator size="small" color="#00AEEF" /> : <Ionicons name="download-outline" size={20} color="#00AEEF" />}
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <View style={[styles.completedCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }]}>
                                <Ionicons name="trophy-outline" size={30} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                                <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 12, fontWeight: 'bold' }}>NO COURSES COMPLETED YET</Text>
                            </View>
                        )}
                        
                    </>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Course Details Modal */}
            <Modal visible={!!selectedCompletedCourse} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedCompletedCourse(null)}>
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }} />
                    </Pressable>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#0A0A0A' : '#FFF', borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>COURSE DETAILS</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity 
                                    style={{ marginRight: 15, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(0,174,239,0.1)', borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}
                                    onPress={() => handleDownloadCertificate(selectedCompletedCourse)}
                                >
                                    {generatingCertId === selectedCompletedCourse?.id ? <ActivityIndicator size="small" color="#00AEEF" /> : <><Ionicons name="download-outline" size={16} color="#00AEEF" style={{ marginRight: 4 }} /><Text style={{ color: '#00AEEF', fontSize: 10, fontWeight: 'bold' }}>CERTIFICATE</Text></>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setSelectedCompletedCourse(null)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24 }}>
                            {selectedCompletedCourse && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(0, 174, 239, 0.1)' : 'rgba(0, 174, 239, 0.05)' }]}>
                                            <Text style={styles.badgeText}>{selectedCompletedCourse.category?.toUpperCase() || 'COURSE'}</Text>
                                        </View>
                                        <Text style={styles.progressPercent}>100% DONE</Text>
                                    </View>
                                    
                                    <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={3}>{selectedCompletedCourse.title}</Text>
                                    
                                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }]}>
                                        <View style={[styles.progressBarFill, { width: `100%` }]} />
                                    </View>
                                    
                                    <View style={[styles.statsRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="videocam-outline" size={16} color={colors.textSecondary} />
                                            <Text style={[styles.statItemText, { color: colors.textSecondary }]}>TOTAL VIDEOS: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{selectedCompletedCourse.totalVideos}</Text></Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="eye-outline" size={16} color="#00AEEF" />
                                            <Text style={[styles.statItemText, { color: colors.textSecondary }]}>WATCHED: <Text style={{ color: '#00AEEF', fontWeight: 'bold' }}>{selectedCompletedCourse.watchedVideos}</Text></Text>
                                        </View>
                                    </View>

                                    <Text style={[styles.moduleListHeading, { color: colors.text }]}>MODULE BREAKDOWN</Text>
                                    
                                    <View style={styles.moduleList}>
                                        {selectedCompletedCourse.moduleStats?.map((mod: any, index: number) => (
                                            <View key={mod.id} style={[styles.moduleRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}>
                                                <View style={styles.moduleRowLeft}>
                                                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                                                    <View style={{ marginLeft: 10, flex: 1 }}>
                                                        <Text style={[styles.modTitle, { color: colors.text }]} numberOfLines={1}>Part {index + 1}: {mod.title}</Text>
                                                    </View>
                                                </View>
                                                <Text style={[styles.modProgress, { color: '#10B981' }]}>
                                                    {mod.watched}/{mod.total}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                            <View style={{ height: 30 }} />
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    screenContainer: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    screenHeader: {
        marginBottom: 30,
        paddingHorizontal: 8,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    screenSub: {
        fontSize: 10,
        marginTop: 8,
        lineHeight: 18,
        fontWeight: '700',
        letterSpacing: 1,
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 15,
        paddingHorizontal: 8,
    },
    progressCard: {
        padding: 24,
        borderRadius: 24,
        marginBottom: 25,
        borderWidth: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#00AEEF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    progressPercent: {
        fontSize: 14,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
    courseName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        lineHeight: 26,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#00AEEF',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 20,
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItemText: {
        fontSize: 10,
        marginLeft: 6,
        letterSpacing: 1,
    },
    moduleListHeading: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 15,
    },
    moduleList: {
        gap: 10,
    },
    moduleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    moduleRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        paddingRight: 15,
    },
    modTitle: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    modProgress: {
        fontSize: 12,
        fontWeight: '900',
    },
    completedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 15,
    },
    compCourseTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        lineHeight: 20,
    },
    compInstructor: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
    },
    compBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    compBadgeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '900',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        height: '75%',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        borderWidth: 1,
        borderBottomWidth: 0,
        paddingTop: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.1)',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
    },
});
