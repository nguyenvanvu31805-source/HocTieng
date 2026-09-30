require("dotenv").config({path: __dirname + "/../.env"});
const pool = require("../config/database");
const testResultService = require("../services/test-result.service");
const cardRepository = require("../repositories/card.repository");

async function runTests() {
  console.log("--- STARTING TEST REVIEW & RETRY BACKEND TESTS ---");

  // User 3 (student.demo), User 2 (teacher.demo)
  const userA = { user_id: 3, role: "STUDENT" };
  const userB = { user_id: 2, role: "TEACHER" };

  // Get cards from Study Set 1
  const cards = await cardRepository.findBySetId(1);
  if (cards.length < 2) {
    throw new Error("Study set 1 needs at least 2 cards for testing");
  }
  const card1 = cards[0];
  const card2 = cards[1];

  let testResult1Id = null;
  let testResult2Id = null;
  let testResult3Id = null;

  try {
    // CASE 1: POST test result + details -> 201 PASS
    // CASE 2: Server tự tính total/correct/score -> PASS
    // CASE 3: Details lưu đúng -> PASS
    console.log("Testing CASE 1, 2, 3: Create test result with details and verify server-side calculation...");
    const res1 = await testResultService.createTestResult(userA, {
      set_id: 1,
      details: [
        {
          card_id: card1.card_id,
          question_order: 1,
          user_answer: card1.definition, // correct
        },
        {
          card_id: card2.card_id,
          question_order: 2,
          user_answer: "câu trả lời hoàn toàn sai", // incorrect
        },
      ],
    });

    testResult1Id = res1.result_id;
    if (!res1.result_id) throw new Error("Result ID not generated");
    if (res1.total_questions !== 2) throw new Error(`Expected total_questions 2, got ${res1.total_questions}`);
    if (res1.correct_answers !== 1) throw new Error(`Expected correct_answers 1, got ${res1.correct_answers}`);
    if (Math.abs(res1.score - 50.0) > 0.01) throw new Error(`Expected score 50.0, got ${res1.score}`);
    if (!res1.details || res1.details.length !== 2) throw new Error("Expected 2 details items");
    if (res1.details[0].is_correct !== true) throw new Error("Detail 0 should be correct");
    if (res1.details[1].is_correct !== false) throw new Error("Detail 1 should be incorrect");
    if (res1.details[0].term !== card1.term) throw new Error("Snapshot term mismatch");
    if (res1.details[0].definition !== card1.definition) throw new Error("Snapshot definition mismatch");
    if (!res1.incorrect_card_ids.includes(card2.card_id)) throw new Error("Incorrect card ids should contain card2");
    console.log("CASE 1, 2, 3: PASS");

    // CASE 4: GET result detail chính chủ -> 200 PASS
    console.log("Testing CASE 4: Owner can get test result with details...");
    const getRes = await testResultService.getTestResult(userA, testResult1Id);
    if (getRes.result_id !== testResult1Id) throw new Error("Retrieved wrong result");
    if (getRes.details.length !== 2) throw new Error("Details length mismatch on get");
    console.log("CASE 4: PASS");

    // CASE 5: User khác GET result -> 403 PASS
    console.log("Testing CASE 5: Another user cannot get result...");
    let forbiddenCaught = false;
    try {
      await testResultService.getTestResult(userB, testResult1Id);
    } catch (err) {
      if (err.statusCode === 403) {
        forbiddenCaught = true;
      } else {
        throw new Error(`Expected 403, got ${err.statusCode}: ${err.message}`);
      }
    }
    if (!forbiddenCaught) throw new Error("Failed to block unauthorized user");
    console.log("CASE 5: PASS");

    // CASE 6: card không thuộc set -> reject PASS
    console.log("Testing CASE 6: Reject card not belonging to set...");
    let cardNotInSetCaught = false;
    try {
      await testResultService.createTestResult(userA, {
        set_id: 1,
        details: [
          { card_id: 999999, question_order: 1, user_answer: "test" },
        ],
      });
    } catch (err) {
      if (err.statusCode === 400) {
        cardNotInSetCaught = true;
      }
    }
    if (!cardNotInSetCaught) throw new Error("Failed to reject card not in set");
    console.log("CASE 6: PASS");

    // CASE 7: duplicate card -> reject PASS
    console.log("Testing CASE 7: Reject duplicate card in test details...");
    let duplicateCardCaught = false;
    try {
      await testResultService.createTestResult(userA, {
        set_id: 1,
        details: [
          { card_id: card1.card_id, question_order: 1, user_answer: "test1" },
          { card_id: card1.card_id, question_order: 2, user_answer: "test2" },
        ],
      });
    } catch (err) {
      if (err.statusCode === 400) {
        duplicateCardCaught = true;
      }
    }
    if (!duplicateCardCaught) throw new Error("Failed to reject duplicate card");
    console.log("CASE 7: PASS");

    // CASE 8: Retry incorrect chỉ lấy card sai -> PASS
    // CASE 9: Retry tạo result mới -> PASS
    console.log("Testing CASE 8 & 9: Retry incorrect card creates new result...");
    const incorrectCards = res1.incorrect_card_ids;
    if (incorrectCards.length !== 1 || incorrectCards[0] !== card2.card_id) {
      throw new Error("Incorrect cards list unexpected");
    }

    // User retries card2, still gets it wrong
    const retryRes1 = await testResultService.createTestResult(userA, {
      set_id: 1,
      details: [
        {
          card_id: card2.card_id,
          question_order: 1,
          user_answer: "vẫn sai tiếp",
        },
      ],
    });
    testResult2Id = retryRes1.result_id;
    if (retryRes1.result_id === testResult1Id) throw new Error("Retry must create new result");
    if (retryRes1.total_questions !== 1) throw new Error("Retry should have 1 question");
    if (retryRes1.correct_answers !== 0) throw new Error("Retry should have 0 correct answers");
    if (retryRes1.score !== 0) throw new Error("Retry score should be 0");
    if (!retryRes1.incorrect_card_ids.includes(card2.card_id)) throw new Error("Card2 still in incorrect_card_ids");
    console.log("CASE 8 & 9: PASS");

    // CASE 10: Retry lần 2 -> PASS
    // CASE 11: Retry khi không còn câu sai -> incorrect_card_ids rỗng
    console.log("Testing CASE 10 & 11: Retry round 2 and 0 incorrect cards left...");
    const retryRes2 = await testResultService.createTestResult(userA, {
      set_id: 1,
      details: [
        {
          card_id: card2.card_id,
          question_order: 1,
          user_answer: card2.definition, // correct this time
        },
      ],
    });
    testResult3Id = retryRes2.result_id;
    if (retryRes2.score !== 100) throw new Error("Round 2 score should be 100%");
    if (retryRes2.incorrect_card_ids.length !== 0) throw new Error("Expected 0 incorrect cards");
    console.log("CASE 10 & 11: PASS");

    // CASE 12: Result cũ vẫn giữ snapshot sau khi card thay đổi -> PASS
    console.log("Testing CASE 12: Snapshot immutability when card is modified...");
    const originalDef = card1.definition;
    // Temporarily update card1 in DB
    await pool.execute("UPDATE cards SET definition = ? WHERE card_id = ?", [
      "Định nghĩa mới đã được giáo viên sửa đổi",
      card1.card_id,
    ]);

    // Check old test result 1
    const checkSnapshot = await testResultService.getTestResult(userA, testResult1Id);
    const detail0 = checkSnapshot.details.find(d => d.card_id === card1.card_id);
    if (!detail0) throw new Error("Card1 detail not found in old result");
    if (detail0.definition !== originalDef) {
      throw new Error(`Snapshot was modified! Expected "${originalDef}", got "${detail0.definition}"`);
    }

    // Revert card1
    await pool.execute("UPDATE cards SET definition = ? WHERE card_id = ?", [
      originalDef,
      card1.card_id,
    ]);
    console.log("CASE 12: PASS (Snapshot is immutable)");

    // CASE 13: Old request format vẫn không crash -> PASS
    console.log("Testing CASE 13: Backward compatibility with legacy payload...");
    const legacyRes = await testResultService.createTestResult(userA, {
      set_id: 1,
      total_questions: 6,
      correct_answers: 5,
      score: 83.33,
    });
    if (!legacyRes.result_id) throw new Error("Legacy creation failed");
    if (legacyRes.total_questions !== 6) throw new Error("Legacy total_questions mismatch");

    // Get legacy result via getTestResult
    const getLegacy = await testResultService.getTestResult(userA, legacyRes.result_id);
    if (!getLegacy || getLegacy.details.length !== 0) {
      throw new Error("Legacy details should be an empty array");
    }
    // Clean up legacy test
    await pool.execute("DELETE FROM test_results WHERE result_id = ?", [legacyRes.result_id]);
    console.log("CASE 13: PASS");

    console.log("--- ALL 13 TEST CASES PASSED SUCCESSFULLY ---");
  } finally {
    // Clean up test results created in test
    if (testResult1Id) {
      await pool.execute("DELETE FROM test_results WHERE result_id = ?", [testResult1Id]);
    }
    if (testResult2Id) {
      await pool.execute("DELETE FROM test_results WHERE result_id = ?", [testResult2Id]);
    }
    if (testResult3Id) {
      await pool.execute("DELETE FROM test_results WHERE result_id = ?", [testResult3Id]);
    }
    console.log("Cleaned up test records.");
  }
}

runTests().then(() => process.exit(0)).catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
