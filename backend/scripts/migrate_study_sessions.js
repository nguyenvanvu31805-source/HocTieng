require("dotenv").config({path: __dirname + "/../.env"});
const pool = require("../config/database");

async function runMigration() {
  console.log("Checking and migrating study_sessions table...");

  try {
    const [cols] = await pool.query("DESCRIBE study_sessions");
    const colMap = new Map(cols.map((c) => [c.Field, c]));

    // 1. Allow set_id to be NULL (for global sessions like WEAK_REVIEW)
    const setIdCol = colMap.get("set_id");
    if (setIdCol && setIdCol.Null === "NO") {
      console.log("Modifying set_id to allow NULL...");
      await pool.query("ALTER TABLE study_sessions MODIFY COLUMN set_id INT NULL");
      console.log("set_id modified to NULL successfully.");
    }

    // 2. Expand mode ENUM to include 'WEAK_REVIEW'
    const modeCol = colMap.get("mode");
    if (modeCol && !modeCol.Type.includes("WEAK_REVIEW")) {
      console.log("Modifying mode ENUM to include WEAK_REVIEW...");
      await pool.query(
        "ALTER TABLE study_sessions MODIFY COLUMN mode ENUM('FLASHCARDS','LEARN','TEST','MATCH','WEAK_REVIEW') NOT NULL"
      );
      console.log("mode ENUM updated successfully.");
    }

    // 3. Add cards_studied column if not exists
    if (!colMap.has("cards_studied")) {
      console.log("Adding cards_studied column...");
      await pool.query(
        "ALTER TABLE study_sessions ADD COLUMN cards_studied INT NOT NULL DEFAULT 0 AFTER score"
      );
      console.log("cards_studied column added successfully.");
    }

    const [updatedCols] = await pool.query("DESCRIBE study_sessions");
    console.log(
      "study_sessions updated schema:",
      updatedCols.map((r) => `${r.Field} (${r.Type}, Null: ${r.Null}, Default: ${r.Default})`)
    );

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
