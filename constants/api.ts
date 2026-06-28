import axios from 'axios';

// Use your computer's IP address instead of localhost for physical device testing
// Android emulator uses 10.0.2.2
const BASE_URL = 'https://learnovaserver-production.up.railway.app/api';

const api = axios.create({
    baseURL: BASE_URL,
});

export const authApi = {
    signup: (data: any, headers?: any) => api.post('/auth/signup', data, { headers }),
    login: (data: any) => api.post('/auth/login', data),
};

export const courseApi = {
    getCourses: () => api.get('/courses'),
    createCourse: (data: any) => api.post('/courses/create', data),
    addModule: (data: any) => api.post('/courses/module/add', data),
    addLecture: (data: any) => api.post('/courses/lecture/add', data),
    getTeacherDashboard: (id: string) => api.get(`/courses/teacher/${id}`),
    getCourseDetails: (id: string) => api.post(`/courses/details`, { courseId: id }),
    getCourseAnalytics: (id: string) => api.get(`/courses/${id}/analytics`),
    getEnrolledCourses: (studentId: string) => api.get(`/courses/enrolled/${studentId}`),
    deleteCourse: (id: string) => api.delete(`/courses/${id}`),
    deleteModule: (courseId: string, moduleId: string) => api.delete(`/courses/module/${courseId}/${moduleId}`),
    getTeacherStudents: (teacherId: string) => api.get(`/courses/teacher-students/${teacherId}`),
    updateCourse: (id: string, data: { title: string }) => api.put(`/courses/update/${id}`, data),
    updateModule: (courseId: string, moduleId: string, data: { title: string }) => api.put(`/courses/module/update/${courseId}/${moduleId}`, data),
    markLectureCompleted: (data: { courseId: string; moduleId: string; lectureId: string }) => api.post('/courses/lecture/mark-completed', data),
    markStudentLectureCompleted: (data: { studentId: string; courseId: string; lectureId: string }) => api.post('/courses/lecture/student-complete', data),
    addReview: (data: { courseId: string; studentId: string; studentName: string; rating: number; text: string }) => api.post('/courses/reviews/add', data),
    deleteReview: (courseId: string, reviewId: string) => api.delete(`/courses/reviews/${courseId}/${reviewId}`),
};

export const userApi = {
    getProfile: (uid: string) => api.get(`/users/profile/${uid}`),
    updateProfile: (uid: string, data: any) => api.put(`/users/update/${uid}`, data),
    deleteProfile: (uid: string) => api.delete(`/users/delete/${uid}`),
    getNotifications: (uid: string) => api.get(`/users/notifications/${uid}`),
    markNotificationRead: (uid: string, notificationId: string) => api.post('/users/notifications/mark-read', { uid, notificationId }),
    markAllNotificationsRead: (uid: string) => api.post('/users/notifications/mark-all-read', { uid }),
    sendAnnouncement: (data: { teacherId: string, teacherName: string, title: string, message: string }) => api.post('/users/announcements/send', data),
    getAnnouncementHistory: (teacherId: string) => api.get(`/users/announcements/history/${teacherId}`),
    reportProblem: (data: { userId: string, role: string, issue: string, description: string }) => api.post('/users/support/report', data),
    uploadFile: (data: FormData) => api.post('/users/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
    searchByUsername: (username: string) => api.get(`/users/search/${username}`),
    searchRealtime: (query: string) => api.get(`/users/search-realtime/${query}`),
};

export const liveSupportApi = {
    sendChatMessage: (data: { userId: string, userName: string, text?: string, sender?: string, mediaUri?: string, mediaType?: string }) => api.post('/help-live-support/chat/send', data),
    getChatHistory: (userId: string) => api.get(`/help-live-support/chat/${userId}`),
    markMessagesRead: (userId: string, senderType: string = 'support') => api.post('/help-live-support/chat/mark-read', { userId, senderType }),
};

export const approvalApi = {
    sendChatMessage: (data: { userId: string, userName: string, text?: string, sender?: string, mediaUri?: string, mediaType?: string }) => api.post('/users/approval/chat/send', data),
    getChatHistory: (userId: string) => api.get(`/users/approval/chat/${userId}`),
    markMessagesRead: (userId: string, senderType: string = 'support') => api.post('/users/approval/chat/mark-read', { userId, senderType }),
};

export const chatApi = {
    sendMessage: (data: { senderId: string, senderName: string, receiverId: string, receiverName: string, text?: string, mediaUri?: string, mediaType?: string }) => api.post('/chat/send', data),
    getChatHistory: (userId: string, otherUserId: string) => api.get(`/chat/history/${userId}/${otherUserId}`),
    getInbox: (userId: string) => api.get(`/chat/inbox/${userId}`),
    markMessagesRead: (userId: string, otherUserId: string) => api.post('/chat/mark-read', { userId, otherUserId }),
    getUnreadCount: (userId: string) => api.get(`/chat/unread-count/${userId}`),
};

export const liveApi = {
    getToken: (data: { channelName: string; uid: number; role: 'publisher' | 'subscriber' }) => api.post('/live/token', data),
    startSession: (data: any) => api.post('/live/session/start', data),
    endSession: (sessionId: string) => api.post('/live/session/end', { sessionId }),
    getActiveSessions: () => api.get('/live/sessions/active'),
    getRecordedSessions: () => api.get('/live/sessions/recorded'),
    broadcastLiveNow: (data: { courseId: string; teacherId: string; lectureTitle: string }) => api.post('/live/broadcast-live-now', data),
    broadcastStartingSoon: (data: { courseId: string; teacherId: string; lectureTitle: string }) => api.post('/live/broadcast-starting-soon', data),
    broadcastLiveEnded: (data: { courseId: string; teacherId: string; lectureTitle: string }) => api.post('/live/broadcast-live-ended', data),
};

export const socialApi = {
    getPosts: (params?: { limit?: number; lastTimestamp?: number }) => api.get('/social/posts', { params }),
    createPost: (data: { userId: string; userName: string; text: string; mediaUri?: string; mediaType?: string; fileName?: string }) => api.post('/social/post/create', data),
    likePost: (data: { postId: string; userId: string; userName?: string }) => api.post('/social/post/like', data),
    commentPost: (data: { postId: string; userId: string; userName: string; text: string }) => api.post('/social/post/comment', data),
    deletePost: (postId: string) => api.delete(`/social/post/delete/${postId}`),
    getNotifications: (userId: string) => api.get(`/social/notifications/${userId}`),
    markNotificationsRead: (userId: string) => api.post('/social/notifications/read-all', { userId }),
    deleteNotification: (userId: string, notifId: string) => api.delete(`/social/notifications/${userId}/${notifId}`),
    reportPost: (data: { postId: string; userId: string; userName: string; reportType: string; description: string }) => api.post('/social/post/report', data),
    getUserProfile: (userId: string) => api.get(`/social/user/profile/${userId}`),
    followUser: (data: { followerId: string; followingId: string; followerName?: string }) => api.post('/social/user/follow', data),
    getUserPosts: (userId: string) => api.get(`/social/user/posts/${userId}`),
    checkFollowStatus: (followerId: string, followingId: string) => api.get(`/social/user/is-following/${followerId}/${followingId}`),
    getFollowingIds: (userId: string) => api.get(`/social/user/following-ids/${userId}`),
    createStory: (data: { userId: string; userName: string; userAvatar?: string; mediaUri?: string; mediaType: string; text?: string; backgroundColor?: string }) => api.post('/social/story/create', data),
    getStories: (data: { userId: string; followingIds: string[] }) => api.post('/social/stories/filtered', data),
    deleteStory: (id: string) => api.delete(`/social/story/${id}`),
};

export const paymentApi = {
    // Student checkout
    createPaymentIntent: (data: { amount: string; courseId: string; studentId: string; studentName: string; courseTitle: string; teacherId?: string }) =>
        api.post('/payment/create-payment-intent', data),
    createCheckout: (data: { price: string; courseId: string; studentId: string; studentName: string; courseTitle: string; teacherId?: string; successUrl?: string; cancelUrl?: string }) =>
        api.post('/payment/create-checkout', data),
    confirmPayment: (paymentIntentId: string) => api.post('/payment/confirm-payment', { paymentIntentId }),
    verifyPayment: (sessionId: string) => api.post('/payment/verify-payment', { sessionId }),
    checkEnrollment: (data: { studentId: string; courseId: string }) => api.post('/payment/check-enrollment', data),
    getEnrollments: (studentId: string) => api.get(`/payment/enrollments/${studentId}`),

    // Teacher Stripe Connect
    onboardTeacher: (data: { teacherId: string; email: string; teacherName?: string }) =>
        api.post('/payment/onboard-teacher', data),
    getOnboardStatus: (teacherId: string) => api.get(`/payment/onboard-status/${teacherId}`),
    getTeacherEarnings: (teacherId: string) => api.get(`/payment/teacher-earnings/${teacherId}`),
    getTeacherCoinEarnings: (teacherId: string) => api.get(`/payment/teacher-coin-earnings/${teacherId}`),

    // Admin/Cron
    processPayouts: () => api.post('/payment/process-payouts'),
    getAdminRevenue: () => api.get('/payment/admin/revenue'),

    buyCoins: (data: { studentId: string; coins: number; transactionId?: string }) => api.post('/payment/buy-coins', data),
    buyCourseWithCoins: (data: { studentId: string; courseId: string; courseTitle: string; price: number; teacherId: string; studentName: string }) =>
        api.post('/payment/buy-with-coins', data),
};

export const assignmentApi = {
    create: (data: any) => api.post('/assignments/create', data),
    getTeacherAssignments: (teacherId: string) => api.get(`/assignments/teacher/${teacherId}`),
    getStudentAssignments: (studentId: string) => api.get(`/assignments/student/${studentId}`),
    submit: (data: any) => api.post('/assignments/submit', data),
    getSubmissions: (teacherId: string) => api.get(`/assignments/submissions/${teacherId}`),
    markComplete: (data: { teacherId: string; assignmentId: string; studentId: string }) => api.post('/assignments/mark-complete', data),
    rejectSubmission: (data: { teacherId: string; assignmentId: string; studentId: string; feedback?: string }) => api.post('/assignments/reject', data),
    update: (data: any) => api.put('/assignments/update', data),
    delete: (teacherId: string, assignmentId: string, courseId: string) => api.delete(`/assignments/${teacherId}/${assignmentId}/${courseId}`),
};

export default api;
