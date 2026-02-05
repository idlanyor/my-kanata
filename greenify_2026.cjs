const { execSync } = require('child_process');
const fs = require('fs');

// Konfigurasi User Utama (Untuk menghijaukan grafikmu)
const MY_NAME = execSync('git config user.name').toString().trim();
const MY_EMAIL = 'prasbhara0604@gmail.com';

// Daftar "Kolaborator" Palsu
const FAKE_AUTHORS = [
    { name: "Kanata Bot", email: "bot@kanata.id" },
    { name: "System Auto", email: "sys@kanata.id" },
    { name: "Dev Helper", email: "helper@dev.com" },
    { name: "Linter Fixer", email: "lint@fix.org" }
];

// File dummy untuk dipancing (agar ada perubahan file)
const DUMMY_FILE = 'activity_log.txt';

// Fungsi Helper Random
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Setup Tanggal
const startDate = new Date('2026-01-01T12:00:00');
const endDate = new Date('2026-12-31T12:00:00');

console.log(`🚀 Memulai simulasi commit dari ${startDate.toDateString()} sampai ${endDate.toDateString()}...`);
console.log(`👤 User Utama: ${MY_NAME} <${MY_EMAIL}>`);

let totalCommits = 0;

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Tentukan jumlah commit hari ini (Random 1 s/d 8 commit per hari)
    // Bisa 0 jika ingin ada hari libur, tapi user minta "hijaukan", jadi minimal 1.
    // Kita buat variasi: kadang sepi (1-3), kadang ramai (4-8).
    const dailyCommits = randomInt(1, 8); 

    for (let i = 0; i < dailyCommits; i++) {
        // Tentukan Waktu Commit (Jam kerja random 09:00 - 23:00)
        const commitTime = new Date(d);
        commitTime.setHours(randomInt(9, 23), randomInt(0, 59), randomInt(0, 59));
        
        // Format tanggal ISO string untuk GIT_DATE
        const dateString = commitTime.toISOString();

        // Tentukan Author (70% Kamu, 30% Orang Lain)
        const isMe = Math.random() > 0.3;
        const author = isMe 
            ? { name: MY_NAME, email: MY_EMAIL } 
            : FAKE_AUTHORS[randomInt(0, FAKE_AUTHORS.length - 1)];

        // Update file dummy
        const logContent = `Log entry: ${dateString} | Author: ${author.name}
`;
        fs.appendFileSync(DUMMY_FILE, logContent);

        // Command Git
        try {
            // Stage
            execSync(`git add -f ${DUMMY_FILE}`);

            // Commit dengan env variable untuk manipulasi tanggal dan author
            const env = {
                ...process.env,
                GIT_AUTHOR_DATE: dateString,
                GIT_COMMITTER_DATE: dateString,
                GIT_AUTHOR_NAME: author.name,
                GIT_AUTHOR_EMAIL: author.email,
                GIT_COMMITTER_NAME: author.name,
                GIT_COMMITTER_EMAIL: author.email
            };

            const msgs = [
                "fix: minor bug update", "feat: improve performance", "docs: update log", 
                "chore: cleanup cache", "refactor: optimize logic", "style: lint fix",
                "fix: resolve merging conflict", "ci: update pipeline", "test: add unit test"
            ];
            const msg = msgs[randomInt(0, msgs.length - 1)];

            execSync(`git commit -m "${msg}"`, { env });
            totalCommits++;
        } catch (e) {
            console.error(`Gagal commit pada ${dateString}:`, e.message);
        }
    }
    
    // Log progress per bulan (biar tidak spam output)
    if (d.getDate() === 1) {
        console.log(`📅 Generate bulan ${d.getMonth() + 1}/2026 selesai...`);
    }
}

console.log(`
✅ Selesai! Total ${totalCommits} fake commits berhasil dibuat di branch 'activity-2026'.`);
console.log(`ℹ️  Push branch ini ke remote untuk melihat hasilnya di GitHub.`);
