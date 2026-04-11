import fs from 'fs';
const path = 'f:/Learnova/app/student/index.tsx';
let content = fs.readFileSync(path, 'utf-8');

// I'll replace everything inside the ScrollView child with a clean, correct version.
// Looking for the welcomeBox start and searching for more courses end.

const startMarker = '{searchQuery.trim() === \'\' ? (';
const endMarker = '    </SafeAreaView>'; // Something unique at the end of the return but before styles.

// Actually, I'll just replace from the ScrollView start to ScrollView end.
const svStart = '<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>';
const svEnd = '</ScrollView>';

const newSVContent = `<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {searchQuery.trim() === '' ? (
                            <>
                                <View style={styles.welcomeBox}>
                                    <Text style={[styles.welcomeTitle, { color: colors.text }]}>Hello, {userName}!</Text>
                                    <View style={[styles.subBadge, { borderColor: colors.primary, backgroundColor: isDark ? colors.card : '#FFF9E5' }]}>
                                        <Ionicons name="star" size={12} color={colors.primary} />
                                        <Text style={[styles.subText, { color: colors.text }]}>Premium Member</Text>
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    {[
                                        { id: '1', title: 'Videos', icon: 'videocam', color: '#4A90E2' },
                                        { id: '2', title: 'Quizzes', icon: 'checkbox', color: '#9B51E0' },
                                        { id: '3', title: 'Social', icon: 'people', color: '#F2994A' },
                                    ].map((item) => (
                                        <View key={item.id} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <View style={[styles.statIcon, { backgroundColor: item.color + '15' }]}>
                                                <Ionicons name={item.icon as any} size={20} color={item.color} />
                                            </View>
                                            <Text style={[styles.statVal, { color: colors.text }]}>{item.title}</Text>
                                        </View>
                                    ))}
                                </View>

                                {/* My Enrolled Courses Section */}
                                <View style={{ marginVertical: 15 }}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>My Enrolled Courses</Text>
                                        <Text style={[styles.courseCount, { color: colors.textSecondary }]}>{myCourses.length} Enrolled</Text>
                                    </View>
                                    
                                    {myCourses.length > 0 ? (
                                        myCourses.map(course => renderCourseCard(course, true))
                                    ) : (
                                        <View style={[styles.emptyEnrollmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <Ionicons name="school-outline" size={32} color={colors.textSecondary} />
                                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>You haven't enrolled in any courses yet.</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Explore Section */}
                                <View style={{ marginTop: 10, marginBottom: 15 }}>
                                    <View style={styles.sectionHeaderRow}>
                                        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Explore New Courses</Text>
                                        <TouchableOpacity onPress={() => router.push('/student/courses')}>
                                            <Text style={styles.seeAllText}>See All</Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    {allCourses
                                        .filter(c => !myCourses.find(mc => mc.id === c.id))
                                        .slice(0, 5)
                                        .map(course => renderCourseCard(course, false))}
                                </View>
                            </>
                        ) : (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Result ({filteredCourses.length})</Text>
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map(course => {
                                        const isEnrolled = myCourses.some(mc => mc.id === course.id);
                                        return renderCourseCard(course, isEnrolled);
                                    })
                                ) : (
                                    <View style={styles.emptySearch}>
                                        <Ionicons name="search" size={50} color={Colors.lightGrey} />
                                        <Text style={styles.emptySearchText}>No courses found matching your search.</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </ScrollView>`;

const startIndex = content.indexOf(svStart);
const endIndex = content.indexOf(svEnd) + svEnd.length;

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + newSVContent + content.substring(endIndex);
    fs.writeFileSync(path, newContent);
    console.log('Successfully updated student index');
} else {
    console.log('Error finding markers', startIndex, endIndex);
}
