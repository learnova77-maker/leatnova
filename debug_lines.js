import fs from 'fs';
const content = fs.readFileSync('f:/Learnova/app/student/index.tsx', 'utf-8');
const lines = content.split('\n');
for (let i = 220; i < 260; i++) {
    console.log(`${i + 1}: [${lines[i].replace(/ /g, '_')}]`);
}
