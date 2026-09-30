require("dotenv").config({ path: __dirname + "/../.env" });
const pool = require("../config/database");
const progressService = require("../services/progress.service");

async function runTests() {
  console.log("--- STARTING WEAK WORDS HUB BACKEND TESTS ---");

  // User 3 (student.demo), User 2 (teacher.demo)
  const userA = { user_id: 3, role: "STUDENT" };
  const userB = { user_id: 2, role: "TEACHER" };

  let testSetId = null;
  let cardIds = [];

  try {
    // 0. Setup a dedicated temporary study set and cards
    const [setResult] = await pool.execute(
      `INSERT INTO study_sets (creator_id, title, description, visibility, status)
       VALUES (?, '[TEST_WEAK] Temporary Set', 'For testing weak words API', 'PUBLIC', 'ACTIVE')`,
      [userA.user_id],
    );
    testSetId = setResult.insertId;

    const cardsData = [
      { term: "apple", def: "quả táo", pron: "/ˈæpl/", ex: "An apple a day", audio: "https://audio/apple.mp3" },
      { term: "banana", def: "quả chuối", pron: "/bəˈnɑːnə/", ex: "Yellow banana", audio: null },
      { term: "cherry", def: "quả anh đào", pron: "/ˈtʃeri/", ex: "Sweet cherry", audio: null },
      { term: "date", def: "quả chà là", pron: "/deɪt/", ex: "Sweet date", audio: null },
      { term: "elderberry", def: "quả cơm cháy", pron: "/ˈeldəberi/", ex: "Purple elderberry", audio: null },
    ];

    for (let i = 0; i < cardsData.length; i++) {
      const c = cardsData[i];
      const [cardResult] = await pool.execute(
        `INSERT INTO cards (set_id, term, definition, pronunciation, example, audio_url, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [testSetId, c.term, c.def, c.pron, c.ex, c.audio, i + 1],
      );
      cardIds.push(cardResult.insertId);
    }

    const [c1, c2, c3, c4, c5] = cardIds;

    // Card 1: Weak condition #1 (wrong_count 5 > correct_count 1, mastery 0)
    await pool.execute(
      `INSERT INTO card_progress (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at)
       VALUES (?, ?, 0, 1, 5, NOW())`,
      [userA.user_id, c1],
    );

    // Card 2: Weak condition #2 (wrong_count 2 == correct_count 2, but wrong_count > 0 AND mastery_level 1 <= 1)
    await pool.execute(
      `INSERT INTO card_progress (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at)
       VALUES (?, ?, 1, 2, 2, DATE_SUB(NOW(), INTERVAL 1 HOUR))`,
      [userA.user_id, c2],
    );

    // Card 3: Mastered (mastery 3, correct 5, wrong 0) -> NOT WEAK
    await pool.execute(
      `INSERT INTO card_progress (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at)
       VALUES (?, ?, 3, 5, 0, NOW())`,
      [userA.user_id, c3],
    );

    // Card 4: Unlearned (no progress record) -> NOT WEAK

    // Card 5: Weak condition #1 with high wrong count (wrong 10, correct 2, mastery 1)
    await pool.execute(
      `INSERT INTO card_progress (user_id, card_id, mastery_level, correct_count, wrong_count, last_reviewed_at)
       VALUES (?, ?, 1, 2, 10, DATE_SUB(NOW(), INTERVAL 2 HOUR))`,
      [userA.user_id, c5],
    );

    // ==========================================
    // CASE 1: unauthenticated -> 401
    // ==========================================
    console.log("Testing CASE 1: unauthenticated -> 401...");
    try {
      await progressService.getWeakCards(null);
      throw new Error("Expected 401 error for unauthenticated user");
    } catch (err) {
      const status = err.statusCode || err.status;
      if (status !== 401) throw err;
      console.log("CASE 1: PASS");
    }

    // ==========================================
    // CASE 2: User A -> returns User A's weak cards
    // ==========================================
    console.log("Testing CASE 2: User A -> returns User A's weak cards...");
    const resA = await progressService.getWeakCards(userA);
    const setAWeakIds = resA.items.map((i) => i.card_id).filter((id) => cardIds.includes(id));
    if (!setAWeakIds.includes(c1) || !setAWeakIds.includes(c2) || !setAWeakIds.includes(c5)) {
      throw new Error(`Expected weak cards c1, c2, c5 to be returned, got: ${setAWeakIds.join(", ")}`);
    }
    console.log("CASE 2: PASS");

    // ==========================================
    // CASE 3: User B -> does NOT see User A's weak cards
    // ==========================================
    console.log("Testing CASE 3: User B -> does not see User A's weak cards...");
    const resB = await progressService.getWeakCards(userB);
    const setBWeakIds = resB.items.map((i) => i.card_id).filter((id) => cardIds.includes(id));
    if (setBWeakIds.length > 0) {
      throw new Error(`User B saw User A's cards: ${setBWeakIds.join(", ")}`);
    }
    console.log("CASE 3: PASS");

    // ==========================================
    // CASE 4: weak condition #1 (wrong_count > correct_count)
    // ==========================================
    console.log("Testing CASE 4: weak condition #1 (wrong_count > correct_count)...");
    const itemC1 = resA.items.find((i) => i.card_id === c1);
    if (!itemC1 || itemC1.wrong_count <= itemC1.correct_count) {
      throw new Error("Card 1 should satisfy weak condition #1 (wrong_count > correct_count)");
    }
    console.log("CASE 4: PASS");

    // ==========================================
    // CASE 5: weak condition #2 (wrong_count > 0 AND mastery_level <= 1)
    // ==========================================
    console.log("Testing CASE 5: weak condition #2 (wrong_count > 0 AND mastery_level <= 1)...");
    const itemC2 = resA.items.find((i) => i.card_id === c2);
    if (!itemC2 || !(itemC2.wrong_count > 0 && itemC2.mastery_level <= 1)) {
      throw new Error("Card 2 should satisfy weak condition #2 (wrong > 0 and mastery <= 1)");
    }
    console.log("CASE 5: PASS");

    // ==========================================
    // CASE 6: unlearned (Card 4) does NOT appear
    // ==========================================
    console.log("Testing CASE 6: unlearned cards do NOT appear in weak cards...");
    if (resA.items.some((i) => i.card_id === c4)) {
      throw new Error("Unlearned Card 4 must NOT appear in weak cards");
    }
    console.log("CASE 6: PASS");

    // ==========================================
    // CASE 7: mastered (Card 3: mastery 3, wrong 0) does NOT appear
    // ==========================================
    console.log("Testing CASE 7: mastered cards do NOT appear in weak cards...");
    if (resA.items.some((i) => i.card_id === c3)) {
      throw new Error("Mastered Card 3 must NOT appear in weak cards");
    }
    console.log("CASE 7: PASS");

    // ==========================================
    // CASE 8: filter=all sorting
    // ==========================================
    console.log("Testing CASE 8: filter=all sorting...");
    const resAll = await progressService.getWeakCards(userA, { filter: "all" });
    const allFiltered = resAll.items.filter((i) => cardIds.includes(i.card_id));
    // c5 has net wrong = 10 - 2 = 8
    // c1 has net wrong = 5 - 1 = 4
    // c2 has net wrong = 2 - 2 = 0
    if (allFiltered[0].card_id !== c5 || allFiltered[1].card_id !== c1 || allFiltered[2].card_id !== c2) {
      throw new Error(`filter=all order expected [c5, c1, c2], got [${allFiltered.map(x=>x.card_id).join(", ")}]`);
    }
    console.log("CASE 8: PASS");

    // ==========================================
    // CASE 9: filter=most_wrong sorting
    // ==========================================
    console.log("Testing CASE 9: filter=most_wrong sorting...");
    const resMostWrong = await progressService.getWeakCards(userA, { filter: "most_wrong" });
    const mwFiltered = resMostWrong.items.filter((i) => cardIds.includes(i.card_id));
    // c5 (wrong 10) > c1 (wrong 5) > c2 (wrong 2)
    if (mwFiltered[0].card_id !== c5 || mwFiltered[1].card_id !== c1 || mwFiltered[2].card_id !== c2) {
      throw new Error(`filter=most_wrong order expected [c5, c1, c2], got [${mwFiltered.map(x=>x.card_id).join(", ")}]`);
    }
    console.log("CASE 9: PASS");

    // ==========================================
    // CASE 10: filter=low_mastery sorting
    // ==========================================
    console.log("Testing CASE 10: filter=low_mastery sorting...");
    const resLowMastery = await progressService.getWeakCards(userA, { filter: "low_mastery" });
    const lmFiltered = resLowMastery.items.filter((i) => cardIds.includes(i.card_id));
    // c1 has mastery 0, c5 has mastery 1 (wrong 10), c2 has mastery 1 (wrong 2)
    if (lmFiltered[0].card_id !== c1) {
      throw new Error(`filter=low_mastery expected c1 (mastery 0) first, got ${lmFiltered[0].card_id}`);
    }
    console.log("CASE 10: PASS");

    // ==========================================
    // CASE 11: pagination
    // ==========================================
    console.log("Testing CASE 11: pagination...");
    const page1 = await progressService.getWeakCards(userA, { page: 1, limit: 1 });
    if (page1.items.length !== 1) throw new Error(`Expected 1 item on page 1, got ${page1.items.length}`);
    if (page1.pagination.page !== 1) throw new Error("Expected page 1");
    if (page1.pagination.limit !== 1) throw new Error("Expected limit 1");
    if (page1.pagination.total < 3) throw new Error(`Expected total >= 3, got ${page1.pagination.total}`);
    if (page1.pagination.total_pages < 3) throw new Error("Expected total_pages >= 3");

    const page2 = await progressService.getWeakCards(userA, { page: 2, limit: 1 });
    if (page2.items.length !== 1) throw new Error(`Expected 1 item on page 2, got ${page2.items.length}`);
    if (page2.items[0].card_id === page1.items[0].card_id) {
      throw new Error("Page 1 and Page 2 returned same card_id");
    }
    console.log("CASE 11: PASS");

    // ==========================================
    // CASE 12: limit > 50 -> 400
    // ==========================================
    console.log("Testing CASE 12: limit > 50 -> 400...");
    try {
      await progressService.getWeakCards(userA, { limit: 51 });
      throw new Error("Expected 400 for limit > 50");
    } catch (err) {
      const status = err.statusCode || err.status;
      if (status !== 400) throw err;
      console.log("CASE 12: PASS");
    }

    // ==========================================
    // CASE 13: invalid page -> 400
    // ==========================================
    console.log("Testing CASE 13: invalid page -> 400...");
    try {
      await progressService.getWeakCards(userA, { page: 0 });
      throw new Error("Expected 400 for page 0");
    } catch (err) {
      const status = err.statusCode || err.status;
      if (status !== 400) throw err;
    }
    try {
      await progressService.getWeakCards(userA, { page: "abc" });
      throw new Error("Expected 400 for page abc");
    } catch (err) {
      const status = err.statusCode || err.status;
      if (status !== 400) throw err;
      console.log("CASE 13: PASS");
    }

    // ==========================================
    // CASE 14: invalid filter -> 400
    // ==========================================
    console.log("Testing CASE 14: invalid filter -> 400...");
    try {
      await progressService.getWeakCards(userA, { filter: "random_sql_injection" });
      throw new Error("Expected 400 for invalid filter");
    } catch (err) {
      const status = err.statusCode || err.status;
      if (status !== 400) throw err;
      console.log("CASE 14: PASS");
    }

    // ==========================================
    // CASE 15: empty result
    // ==========================================
    console.log("Testing CASE 15: empty result -> [] + 200, total = 0...");
    // Create another temporary active user without any study history
    const [emptyUserRes] = await pool.execute(
      `INSERT INTO users (email, username, password_hash, role, status)
       VALUES ('test_empty@quizletclone.local', 'test_empty', 'hash', 'STUDENT', 'ACTIVE')`,
    );
    const emptyUserId = emptyUserRes.insertId;
    try {
      const resEmpty = await progressService.getWeakCards({ user_id: emptyUserId, role: "STUDENT" });
      if (!Array.isArray(resEmpty.items) || resEmpty.items.length !== 0) {
        throw new Error("Expected empty items array");
      }
      if (resEmpty.pagination.total !== 0 || resEmpty.pagination.total_pages !== 0) {
        throw new Error(`Expected total 0, got ${resEmpty.pagination.total}`);
      }
      if (resEmpty.summary.total_weak_cards !== 0) {
        throw new Error("Expected summary.total_weak_cards === 0");
      }
      console.log("CASE 15: PASS");
    } finally {
      await pool.execute(`DELETE FROM users WHERE user_id = ?`, [emptyUserId]);
    }

    // ==========================================
    // CASE 16: data fields
    // ==========================================
    console.log("Testing CASE 16: data fields presence...");
    const sample = resA.items.find((i) => i.card_id === c1);
    const requiredFields = [
      "card_id", "set_id", "set_title", "term", "definition",
      "pronunciation", "example", "audio_url", "image_url",
      "mastery_level", "correct_count", "wrong_count",
      "last_reviewed_at", "next_review_at",
    ];
    for (const f of requiredFields) {
      if (sample[f] === undefined) {
        throw new Error(`Missing expected field '${f}' in weak card item`);
      }
    }
    if (sample.set_title !== "[TEST_WEAK] Temporary Set") {
      throw new Error(`set_title mismatch: ${sample.set_title}`);
    }
    if (sample.pronunciation !== "/ˈæpl/") {
      throw new Error(`pronunciation mismatch: ${sample.pronunciation}`);
    }
    console.log("CASE 16: PASS");

    // ==========================================
    // CASE 17: progress update reflects in weak API
    // ==========================================
    console.log("Testing CASE 17: progress update reflects in weak API...");
    // Review card 2 correctly multiple times until mastery reaches 3 and correct > wrong
    await progressService.reviewCard(c2, userA, { correct: true }); // correct = 3, wrong = 2, mastery = 2
    await progressService.reviewCard(c2, userA, { correct: true }); // correct = 4, wrong = 2, mastery = 3
    // Now card 2: correct (4) > wrong (2), and mastery_level = 3 -> NO LONGER WEAK!
    const resAfterReview = await progressService.getWeakCards(userA);
    if (resAfterReview.items.some((i) => i.card_id === c2)) {
      throw new Error("Card 2 was reviewed to mastery 3 (correct > wrong) but still appeared in weak cards!");
    }
    console.log("CASE 17: PASS");

    console.log("--- ALL 17 TEST CASES PASSED SUCCESSFULLY ---");
  } finally {
    // Cleanup temporary test set, cards, progress
    if (testSetId) {
      await pool.execute(`DELETE FROM card_progress WHERE card_id IN (${cardIds.join(",")})`);
      await pool.execute(`DELETE FROM cards WHERE set_id = ?`, [testSetId]);
      await pool.execute(`DELETE FROM study_sets WHERE set_id = ?`, [testSetId]);
      console.log("Cleaned up test data.");
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
