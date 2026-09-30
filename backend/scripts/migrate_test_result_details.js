require("dotenv").config({path: __dirname + "/../.env"});
const pool = require("../config/database");

async function runMigration() {
  console.log("Running migration for test_result_details table...");

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS \`test_result_details\` (
      \`detail_id\` INT NOT NULL AUTO_INCREMENT,
      \`result_id\` INT NOT NULL,
      \`card_id\` INT NOT NULL,
      \`question_order\` INT NOT NULL DEFAULT 1,
      \`user_answer\` TEXT NULL,
      \`correct_answer\` TEXT NOT NULL,
      \`is_correct\` TINYINT(1) NOT NULL DEFAULT 0,
      \`term\` VARCHAR(255) NOT NULL,
      \`definition\` TEXT NOT NULL,
      \`pronunciation\` VARCHAR(255) NULL,
      \`example\` TEXT NULL,
      \`audio_url\` VARCHAR(500) NULL,
      \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`detail_id\`),
      KEY \`idx_test_result_details_result\` (\`result_id\`),
      KEY \`idx_test_result_details_card\` (\`card_id\`),
      CONSTRAINT \`fk_trd_result\`
        FOREIGN KEY (\`result_id\`)
        REFERENCES \`test_results\` (\`result_id\`)
        ON DELETE CASCADE,
      CONSTRAINT \`fk_trd_card\`
        FOREIGN KEY (\`card_id\`)
        REFERENCES \`cards\` (\`card_id\`)
        ON DELETE CASCADE
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await pool.query(createTableSql);
    console.log("Migration test_result_details table completed successfully!");

    const [rows] = await pool.query("DESCRIBE test_result_details");
    console.log("test_result_details schema:", rows.map(r => `${r.Field} (${r.Type})`));

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
