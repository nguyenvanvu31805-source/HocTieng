require("dotenv").config();

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const demoUsers = [
  {
    username: "teacher.demo",
    email: "teacher.demo@quizletclone.local",
    password: "Teacher@12345",
    fullName: "Demo Teacher",
    role: "TEACHER",
  },
  {
    username: "student.demo",
    email: "student.demo@quizletclone.local",
    password: "Student@12345",
    fullName: "Demo Student",
    role: "STUDENT",
  },
];

const demoSet = {
  title: "Everyday English Essentials",
  description: "A starter set for practical English vocabulary.",
  category: "Daily English",
  language: "English",
};

const demoCards = [
  [
    "curious",
    "wanting to know or learn something",
    "/ˈkjʊəriəs/",
    "She was curious about the new course.",
    1,
  ],
  [
    "improve",
    "to make something better",
    "/ɪmˈpruːv/",
    "Small habits improve your memory.",
    2,
  ],
  [
    "recall",
    "to remember something",
    "/rɪˈkɔːl/",
    "Spaced practice helps you recall new words.",
    3,
  ],
  [
    "steady",
    "regular and continuous",
    "/ˈstedi/",
    "Steady practice is better than cramming.",
    4,
  ],
  [
    "achieve",
    "to successfully reach a goal",
    "/əˈtʃiːv/",
    "You can achieve your goal one card at a time.",
    5,
  ],
];

async function findUser(connection, username, email) {
  const [rows] = await connection.execute(
    "SELECT user_id FROM users WHERE username = ? OR email = ? LIMIT 1",
    [username, email],
  );
  return rows[0]?.user_id || null;
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
  });

  try {
    await connection.beginTransaction();

    const adminId = await findUser(
      connection,
      "admin",
      "admin@quizletclone.local",
    );
    if (!adminId) {
      throw new Error(
        "Admin account is missing. Create the admin account before seeding demo data.",
      );
    }

    const userIds = {};
    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);
      await connection.execute(
        `INSERT INTO users (username, email, password_hash, full_name, role, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE')
         ON DUPLICATE KEY UPDATE
           password_hash = VALUES(password_hash), full_name = VALUES(full_name),
           role = VALUES(role), status = 'ACTIVE'`,
        [user.username, user.email, passwordHash, user.fullName, user.role],
      );
      userIds[user.username] = await findUser(
        connection,
        user.username,
        user.email,
      );
    }

    const [setRows] = await connection.execute(
      "SELECT set_id FROM study_sets WHERE creator_id = ? AND title = ? ORDER BY set_id DESC LIMIT 1",
      [userIds["teacher.demo"], demoSet.title],
    );
    let setId = setRows[0]?.set_id;
    if (!setId) {
      const [result] = await connection.execute(
        `INSERT INTO study_sets
          (creator_id, title, description, category, language, visibility, status)
         VALUES (?, ?, ?, ?, ?, 'PUBLIC', 'ACTIVE')`,
        [
          userIds["teacher.demo"],
          demoSet.title,
          demoSet.description,
          demoSet.category,
          demoSet.language,
        ],
      );
      setId = result.insertId;
    }

    for (const [
      term,
      definition,
      pronunciation,
      example,
      position,
    ] of demoCards) {
      const [existing] = await connection.execute(
        "SELECT card_id FROM cards WHERE set_id = ? AND term = ? LIMIT 1",
        [setId, term],
      );
      if (!existing.length) {
        await connection.execute(
          `INSERT INTO cards
            (set_id, term, definition, pronunciation, example, position)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [setId, term, definition, pronunciation, example, position],
        );
      }
    }

    await connection.commit();
    console.log(
      JSON.stringify(
        {
          success: true,
          message: "Demo data seeded",
          studySetId: setId,
          demoUsers: demoUsers.map(({username, email, password, role}) => ({
            username,
            email,
            password,
            role,
          })),
          cards: demoCards.length,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
});
