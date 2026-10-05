require("dotenv").config({path: __dirname + "/../.env"});
const pool = require("../config/database");

async function checkPrerequisites(connection) {
  const requiredTables = ["assignments", "users", "test_results", "study_sessions"];
  console.log("Checking prerequisites for assignment_submissions migration...");

  for (const table of requiredTables) {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`Prerequisite check failed: Table '${table}' does not exist.`);
    }
  }
  console.log("All prerequisite tables exist: assignments, users, test_results, study_sessions.");
}

async function runMigration() {
  console.log("Starting migration for assignment_submissions table...");

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      submission_id INT NOT NULL AUTO_INCREMENT,
      assignment_id INT NOT NULL,
      user_id INT NOT NULL,
      status ENUM(
        'NOT_STARTED',
        'IN_PROGRESS',
        'COMPLETED'
      ) NOT NULL DEFAULT 'NOT_STARTED',
      score DECIMAL(5,2) NULL,
      result_id INT NULL,
      session_id INT NULL,
      started_at DATETIME NULL,
      submitted_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (submission_id),

      UNIQUE KEY uk_assignment_user (
        assignment_id,
        user_id
      ),

      KEY idx_assignment_submissions_assignment (
        assignment_id
      ),

      KEY idx_assignment_submissions_user (
        user_id
      ),

      CONSTRAINT fk_assignment_submissions_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(assignment_id)
        ON DELETE CASCADE,

      CONSTRAINT fk_assignment_submissions_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

      CONSTRAINT fk_assignment_submissions_result
        FOREIGN KEY (result_id)
        REFERENCES test_results(result_id)
        ON DELETE SET NULL,

      CONSTRAINT fk_assignment_submissions_session
        FOREIGN KEY (session_id)
        REFERENCES study_sessions(session_id)
        ON DELETE SET NULL

    ) ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `;

  let connection;
  try {
    connection = await pool.getConnection();

    // 1. Check prerequisites
    await checkPrerequisites(connection);

    // 2. Execute CREATE TABLE
    console.log("Executing CREATE TABLE assignment_submissions...");
    await connection.query(createTableSql);
    console.log("Table assignment_submissions created or already exists.");

    // 3. Inspect table structure
    const [createTableResult] = await connection.query("SHOW CREATE TABLE assignment_submissions");
    console.log("SHOW CREATE TABLE output:\n", createTableResult[0]["Create Table"]);

    const [cols] = await connection.query("DESCRIBE assignment_submissions");
    console.log(
      "Columns:",
      cols.map((c) => `${c.Field} ${c.Type} Null:${c.Null} Key:${c.Key} Default:${c.Default}`)
    );

    console.log("Migration assignment_submissions completed successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    // Do not call process.exit(0) immediately to allow pool draining if needed
  }
}

runMigration().then(() => {
  if (process.exitCode === 1) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
