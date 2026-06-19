const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

async function testUpload() {
    try {
        const rawSecret = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDKbBq+2SVn/c/6
lgHWBhLWyC+LUPlhDnPp26OgkktbRJym2qm9UtBkCV3pf46boj+Wg0erdkcFKuW0
3+fc0A2sIcddhafAeDs+PxGOdIDLQgoZl/6PEs7KgqUIrSJNKNvYC92LY7Es8Nef
B9dmE6Lr1QIN2fHm/ItJuT13UcDeQPZuh1F5lfdt7PcOukXi8jITE9mm7CmrO+9F
4suirnPlqfHk/gyXQ4V9MzNlJL2MVhiO4uvDE+CBjJ6Q3gpzt1Dppt1XeQ3hMh3+
r39bed/ZMqMX4ozRdBzkvH18vZWR5vjKpXgg4qECOrdNYGmIO3hlC4dzjpSbQhVS
5DDaIWGdAgMBAAECggEAIWhonJ1phUl4SRb3XBuaAd09rYxScDCKtGrFzWM/sSM4
iHg3wfGYR55dI8Oj5W9Id96YVkXZ0FJFYY3/riufSgy0Iu0DY+pj+rC9hMmZFRLD
6HfzsSjNPNKFitJKQjpPWE+TA6WTMQPZzlsks2njvnDkGyWgfTsqgOMj8ByrzHJY
hwkaHuDfnsdNTMbDjGeLPpwLbE4DqoobdkYp3grDEwzyQmMyAZBkvWRLOOjnZEcI
VDkxn6AipiJU1Ci+NMU67UTTI8c3ChnQ3FUiZKxJ4ZUr3bpnFkLjPm0atHiX1Yo2
bejugOkexObZNhRpjYgJ5wzOq7JFIKXmDskuxBfgMQKBgQDw1jTJYoI4bNRCgm8d
uI9XRnMulIOynnuwbc8A//hMfBuhIvO+NVGZh6c3vXZLhDjLFHoi75ntmCIO1HBh
D70uJbN9rcPKVNJbBTVOogtWKImTxsztiMN6y+jo5VaaOgG8ZnYwiYLEs2pQj/fM
yVXQtd7jIKXPnzp6tWMKcQ2jEQKBgQDXKrxuR9JbbFCW9gd+dJhjbPja02q7YNlb
d64cLdvub5Ky1KT6zGsVVIUocq3+mR5rH09vBA+ScjNWucso5WnZtsF0NFLctv9w
dstHHO2ayZNjEZOcoRXBRzav/coPoTHF+JfDteQ7Yc+TgPyruprmoiVjaHpr0R/v
kUe32y79zQKBgQDejuUbEViLci65A7ZRfeOg4G7CpeYKY6CkCuXX47P+YlZaE2Wx
6a3ttklWHlS6NocRTGwN6uORiBw5HiJ338aQZbC4PKMJUFdQW8DGWMMnLLDuijGI
dPFIgjVLO9xLC73c78ba1cito6tkpZZ2fbw68kb2F46DDn9JNGRBGvZiMQKBgQC2
+qP2EOQGVW2Pg7jJxHPXkdNrnIFWyjzt+TA6zJENCxsxM379vZuPLypyRFxNeH+S
z7Soj0aC3tVj+mqX48kJmc6YeOrCwmkmhg/G8QXrLWNGy6rBd4fdrycFsYkFk6qV
VhwSFnv6N+rj4Lx/ehjC679p826wg85p2B2qcB5dPQKBgBsq2ah/yljyxrzrMq+p
+IJSybJk2GE7vN4w4CAAnmGMy28NJ4UyA+Ao69rAP1bouncLiDX74hbhq5CvHbZW
Spzzj+7T6dHtWWOBkDQKDE7aGB2TLLoCqM5v4ox3k/X1jXv+6zgmwfbMzzj7Kch2
fgQSZrInlhj8rdYLi7aV5CsB
-----END PRIVATE KEY-----`;

        const storage = new Storage({
            projectId: 'my-project-e57d2',
            credentials: {
                client_email: 'firebase-adminsdk-fbsvc@my-project-e57d2.iam.gserviceaccount.com',
                private_key: rawSecret
            }
        });

        const bucketName = 'my-project-e57d2.firebasestorage.app';
        fs.writeFileSync('dummy.txt', 'Hello World');
        await storage.bucket(bucketName).upload('dummy.txt', { destination: 'test_agora.txt' });
        console.log("Success! Bucket name and keys are valid.");
        process.exit(0);
    } catch (e) {
        console.error("GCS Error:", e.message);
        process.exit(1);
    }
}
testUpload();
