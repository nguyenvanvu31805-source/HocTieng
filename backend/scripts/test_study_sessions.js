require("dotenv").config({path: __dirname + "/../.env"});
const http = require("http");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const app = require("../app");
const {jwtSecret} = require("../config/env");

function generateToken(payload) {
  return jwt.sign(payload, jwtSecret, {expiresIn: "1h"});
}

async function runTests() {
  console.log("============================================================");
  console.log("TEST SUITE: LEARNING STREAK & STUDY SESSIONS");
  console.log("============================================================");

  // Start test server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  let userAId = null;
  let userBId = null;
  let tokenA = null;
  let tokenB = null;
  let testSetId = null;
  const createdSessionIds = [];

  try {
    // 0. Setup test users
    const [uARes] = await pool.execute(
      `INSERT INTO users (email, username, password_hash, role, status)
       VALUES ('test_streak_a_${Date.now()}@test.local', 'streak_user_a_${Date.now()}', 'hash', 'STUDENT', 'ACTIVE')`
    );
    userAId = uARes.insertId;
    tokenA = generateToken({user_id: userAId, role: "STUDENT"});

    const [uBRes] = await pool.execute(
      `INSERT INTO users (email, username, password_hash, role, status)
       VALUES ('test_streak_b_${Date.now()}@test.local', 'streak_user_b_${Date.now()}', 'hash', 'STUDENT', 'ACTIVE')`
    );
    userBId = uBRes.insertId;
    tokenB = generateToken({user_id: userBId, role: "STUDENT"});

    // Create test study set for user A
    const [sRes] = await pool.execute(
      `INSERT INTO study_sets (creator_id, title, description, visibility, status)
       VALUES (?, '[TEST_STREAK] Temporary Study Set', 'Desc', 'PUBLIC', 'ACTIVE')`,
      [userAId]
    );
    testSetId = sRes.insertId;

    // Helper for requests
    async function apiRequest(endpoint, options = {}) {
      const {token, method = "GET", body} = options;
      const headers = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => null);
      return {status: res.status, data};
    }

    // ------------------------------------------------------------
    // TEST 1: Authentication required (401)
    // ------------------------------------------------------------
    console.log("Checking TEST 1: Authentication required...");
    const res1a = await apiRequest("/study-sessions", {method: "POST", body: {mode: "FLASHCARDS"}});
    if (res1a.status !== 401) throw new Error(`Expected 401, got ${res1a.status}`);

    const res1b = await apiRequest("/study-sessions/stats");
    if (res1b.status !== 401) throw new Error(`Expected 401, got ${res1b.status}`);
    console.log("PASS 1: Authentication required (401)");

    // ------------------------------------------------------------
    // TEST 2: Start session authenticated (201)
    // ------------------------------------------------------------
    console.log("Checking TEST 2: Start session authenticated...");
    const res2 = await apiRequest("/study-sessions", {
      token: tokenA,
      method: "POST",
      body: {set_id: testSetId, mode: "FLASHCARDS"},
    });
    if (res2.status !== 201 || !res2.data.success) {
      throw new Error(`Expected 201, got ${res2.status} (${JSON.stringify(res2.data)})`);
    }
    const session1 = res2.data.data;
    createdSessionIds.push(session1.session_id);
    if (session1.user_id !== userAId || session1.set_id !== testSetId || session1.mode !== "FLASHCARDS") {
      throw new Error(`Session data mismatch: ${JSON.stringify(session1)}`);
    }
    if (session1.ended_at !== null) {
      throw new Error("New session ended_at must be null");
    }
    console.log("PASS 2: Start session authenticated (201)");

    // ------------------------------------------------------------
    // TEST 3: Complete session (200)
    // ------------------------------------------------------------
    console.log("Checking TEST 3: Complete session...");
    const res3 = await apiRequest(`/study-sessions/${session1.session_id}/complete`, {
      token: tokenA,
      method: "PATCH",
      body: {score: 95.5, cards_studied: 15},
    });
    if (res3.status !== 200 || !res3.data.success) {
      throw new Error(`Expected 200, got ${res3.status} (${JSON.stringify(res3.data)})`);
    }
    const completedS1 = res3.data.data;
    if (completedS1.ended_at === null) throw new Error("ended_at should be set on complete");
    if (Number(completedS1.score) !== 95.5) throw new Error(`Expected score 95.5, got ${completedS1.score}`);
    if (completedS1.cards_studied !== 15) throw new Error(`Expected cards_studied 15, got ${completedS1.cards_studied}`);
    console.log("PASS 3: Complete session (200)");

    // ------------------------------------------------------------
    // TEST 4: Stats endpoint
    // ------------------------------------------------------------
    console.log("Checking TEST 4: Stats endpoint...");
    const res4 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res4.status !== 200 || !res4.data.success) {
      throw new Error(`Expected 200, got ${res4.status}`);
    }
    const stats4 = res4.data.data;
    if (stats4.total_sessions !== 1) throw new Error(`Expected total_sessions 1, got ${stats4.total_sessions}`);
    if (stats4.total_study_days !== 1) throw new Error(`Expected total_study_days 1, got ${stats4.total_study_days}`);
    if (stats4.today_studied !== true) throw new Error("Expected today_studied to be true");
    if (stats4.current_streak !== 1) throw new Error(`Expected current_streak 1, got ${stats4.current_streak}`);
    if (stats4.longest_streak !== 1) throw new Error(`Expected longest_streak 1, got ${stats4.longest_streak}`);
    console.log("PASS 4: Stats endpoint returns expected structure and values");

    // ------------------------------------------------------------
    // TEST 5: User isolation
    // ------------------------------------------------------------
    console.log("Checking TEST 5: User isolation...");
    // User B tries to complete User A's session -> 403
    const res5a = await apiRequest(`/study-sessions/${session1.session_id}/complete`, {
      token: tokenB,
      method: "PATCH",
      body: {score: 100},
    });
    if (res5a.status !== 403) throw new Error(`Expected 403, got ${res5a.status}`);

    // User B stats must be 0
    const res5b = await apiRequest("/study-sessions/stats", {token: tokenB});
    const stats5b = res5b.data.data;
    if (stats5b.total_sessions !== 0 || stats5b.current_streak !== 0) {
      throw new Error("User B stats contaminated with User A sessions");
    }
    console.log("PASS 5: User isolation verified (403 for unauthorized session modification, isolated stats)");

    // ------------------------------------------------------------
    // TEST 6: Invalid session ID
    // ------------------------------------------------------------
    console.log("Checking TEST 6: Invalid session ID handling...");
    const res6a = await apiRequest("/study-sessions/invalid_id/complete", {
      token: tokenA,
      method: "PATCH",
      body: {score: 50},
    });
    if (res6a.status !== 400) throw new Error(`Expected 400 for non-numeric session ID, got ${res6a.status}`);

    const res6b = await apiRequest("/study-sessions/99999999/complete", {
      token: tokenA,
      method: "PATCH",
      body: {score: 50},
    });
    if (res6b.status !== 404) throw new Error(`Expected 404 for non-existent session ID, got ${res6b.status}`);
    console.log("PASS 6: Invalid session ID properly rejected (400 / 404)");

    // ------------------------------------------------------------
    // TEST 7: Duplicate completion handling
    // ------------------------------------------------------------
    console.log("Checking TEST 7: Duplicate completion handling...");
    const res7 = await apiRequest(`/study-sessions/${session1.session_id}/complete`, {
      token: tokenA,
      method: "PATCH",
      body: {cards_studied: 20},
    });
    if (res7.status !== 200) throw new Error(`Expected 200 on duplicate completion, got ${res7.status}`);
    if (res7.data.data.cards_studied !== 20) throw new Error("Expected updated cards_studied 20");
    console.log("PASS 7: Duplicate completion handled idempotently and safely");

    // ------------------------------------------------------------
    // Clean up sessions for User A before streak simulation
    // ------------------------------------------------------------
    await pool.execute("DELETE FROM study_sessions WHERE user_id = ?", [userAId]);

    // ------------------------------------------------------------
    // TEST 8: Streak with 1 day
    // ------------------------------------------------------------
    console.log("Checking TEST 8: Streak with 1 day (today)...");
    const [sToday] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'LEARN', DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW(), 5)`,
      [userAId, testSetId]
    );
    createdSessionIds.push(sToday.insertId);

    const res8 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res8.data.data.current_streak !== 1 || res8.data.data.longest_streak !== 1) {
      throw new Error(`Expected streak 1, got current: ${res8.data.data.current_streak}, longest: ${res8.data.data.longest_streak}`);
    }
    console.log("PASS 8: Streak with 1 day yields current_streak = 1, longest_streak = 1");

    // ------------------------------------------------------------
    // TEST 9: Streak with consecutive days (today, yesterday, 2 days ago)
    // ------------------------------------------------------------
    console.log("Checking TEST 9: Streak with consecutive days...");
    const [sYesterday] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'LEARN', DATE_SUB(NOW(), INTERVAL '1 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 1 DAY), 10)`,
      [userAId, testSetId]
    );
    const [sTwoDaysAgo] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'LEARN', DATE_SUB(NOW(), INTERVAL '2 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 2 DAY), 10)`,
      [userAId, testSetId]
    );
    createdSessionIds.push(sYesterday.insertId, sTwoDaysAgo.insertId);

    const res9 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res9.data.data.current_streak !== 3 || res9.data.data.longest_streak !== 3) {
      throw new Error(`Expected streak 3, got current: ${res9.data.data.current_streak}, longest: ${res9.data.data.longest_streak}`);
    }
    if (res9.data.data.total_study_days !== 3) {
      throw new Error(`Expected total_study_days 3, got ${res9.data.data.total_study_days}`);
    }
    console.log("PASS 9: Streak with 3 consecutive days correctly computed as 3");

    // ------------------------------------------------------------
    // TEST 10: Gap day breaks current streak
    // ------------------------------------------------------------
    console.log("Checking TEST 10: Gap day breaks current streak...");
    // Let's create a user with a past streak, then a gap of 2 days, and NO sessions today or yesterday
    await pool.execute("DELETE FROM study_sessions WHERE user_id = ?", [userAId]);
    // Sessions 3 days ago, 4 days ago, 5 days ago (gap at yesterday and today)
    const [sG1] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'MATCH', DATE_SUB(NOW(), INTERVAL '3 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 3 DAY), 8)`,
      [userAId, testSetId]
    );
    const [sG2] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'MATCH', DATE_SUB(NOW(), INTERVAL '4 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 4 DAY), 8)`,
      [userAId, testSetId]
    );
    const [sG3] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'MATCH', DATE_SUB(NOW(), INTERVAL '5 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 5 DAY), 8)`,
      [userAId, testSetId]
    );
    createdSessionIds.push(sG1.insertId, sG2.insertId, sG3.insertId);

    const res10 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res10.data.data.current_streak !== 0) {
      throw new Error(`Expected current_streak 0 after gap, got ${res10.data.data.current_streak}`);
    }
    if (res10.data.data.longest_streak !== 3) {
      throw new Error(`Expected longest_streak 3, got ${res10.data.data.longest_streak}`);
    }
    console.log("PASS 10: Gap day breaks current streak (current_streak = 0, longest_streak = 3)");

    // ------------------------------------------------------------
    // TEST 11: Multiple sessions same day count as one study day
    // ------------------------------------------------------------
    console.log("Checking TEST 11: Multiple sessions same day count as one study day...");
    await pool.execute("DELETE FROM study_sessions WHERE user_id = ?", [userAId]);
    // Insert 4 sessions today
    for (let i = 0; i < 4; i++) {
      const [mRes] = await pool.execute(
        `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
         VALUES (?, ?, 'FLASHCARDS', DATE_SUB(NOW(), INTERVAL ${i * 30 + 10} MINUTE), DATE_SUB(NOW(), INTERVAL ${i * 30} MINUTE), 5)`,
        [userAId, testSetId]
      );
      createdSessionIds.push(mRes.insertId);
    }
    const res11 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res11.data.data.total_sessions !== 4) {
      throw new Error(`Expected total_sessions 4, got ${res11.data.data.total_sessions}`);
    }
    if (res11.data.data.total_study_days !== 1) {
      throw new Error(`Expected total_study_days 1, got ${res11.data.data.total_study_days}`);
    }
    if (res11.data.data.current_streak !== 1) {
      throw new Error(`Expected current_streak 1, got ${res11.data.data.current_streak}`);
    }
    console.log("PASS 11: 4 sessions on the same day count as 1 study day");

    // ------------------------------------------------------------
    // TEST 12: Longest streak calculation
    // ------------------------------------------------------------
    console.log("Checking TEST 12: Longest streak calculation...");
    // Current streak: today + yesterday = 2 days
    // Past streak: 5 days ago, 6 days ago, 7 days ago, 8 days ago = 4 days
    const [p1] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
       VALUES (?, ?, 'TEST', DATE_SUB(NOW(), INTERVAL '1 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL 1 DAY), 10)`,
      [userAId, testSetId]
    );
    const pastDays = [5, 6, 7, 8];
    for (const d of pastDays) {
      const [pRes] = await pool.execute(
        `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at, cards_studied)
         VALUES (?, ?, 'TEST', DATE_SUB(NOW(), INTERVAL '${d} 0:10' DAY_MINUTE), DATE_SUB(NOW(), INTERVAL ${d} DAY), 10)`,
        [userAId, testSetId]
      );
      createdSessionIds.push(pRes.insertId);
    }
    createdSessionIds.push(p1.insertId);

    const res12 = await apiRequest("/study-sessions/stats", {token: tokenA});
    if (res12.data.data.current_streak !== 2) {
      throw new Error(`Expected current_streak 2, got ${res12.data.data.current_streak}`);
    }
    if (res12.data.data.longest_streak !== 4) {
      throw new Error(`Expected longest_streak 4, got ${res12.data.data.longest_streak}`);
    }
    console.log("PASS 12: Longest streak correctly calculated as 4 while current streak is 2");

    // ------------------------------------------------------------
    // TEST 13: Incomplete session does not count towards stats/streak
    // ------------------------------------------------------------
    console.log("Checking TEST 13: Incomplete session does not count...");
    const [incRes] = await pool.execute(
      `INSERT INTO study_sessions (user_id, set_id, mode, started_at, ended_at)
       VALUES (?, ?, 'WEAK_REVIEW', NOW(), NULL)`,
      [userAId, null]
    );
    createdSessionIds.push(incRes.insertId);

    const res13 = await apiRequest("/study-sessions/stats", {token: tokenA});
    // Incomplete session shouldn't increment total_sessions
    if (res13.data.data.total_sessions !== res12.data.data.total_sessions) {
      throw new Error("Incomplete session (ended_at IS NULL) must NOT count towards total_sessions");
    }
    console.log("PASS 13: Incomplete session (ended_at IS NULL) does not count towards stats or streak");

    // ------------------------------------------------------------
    // TEST 14: No user_id query/body IDOR
    // ------------------------------------------------------------
    console.log("Checking TEST 14: No user_id query/body IDOR...");
    // Attempt to pass user_id = userAId while authenticated as userB
    const res14 = await apiRequest(`/study-sessions/stats?user_id=${userAId}`, {
      token: tokenB,
      method: "GET",
    });
    if (res14.data.data.total_sessions !== 0) {
      throw new Error("Query parameter user_id allowed IDOR access to another user's stats!");
    }
    console.log("PASS 14: Query param user_id cannot override authenticated user identity (no IDOR)");

    // ------------------------------------------------------------
    // TEST 15: WEAK_REVIEW session without set_id works seamlessly
    // ------------------------------------------------------------
    console.log("Checking TEST 15: WEAK_REVIEW session with set_id = null...");
    const res15 = await apiRequest("/study-sessions", {
      token: tokenA,
      method: "POST",
      body: {mode: "WEAK_REVIEW"}, // set_id is omitted
    });
    if (res15.status !== 201) throw new Error(`Expected 201 for WEAK_REVIEW, got ${res15.status}`);
    if (res15.data.data.mode !== "WEAK_REVIEW" || res15.data.data.set_id !== null) {
      throw new Error(`WEAK_REVIEW session mismatch: ${JSON.stringify(res15.data.data)}`);
    }
    const weakSessId = res15.data.data.session_id;
    createdSessionIds.push(weakSessId);

    const res15Complete = await apiRequest(`/study-sessions/${weakSessId}/complete`, {
      token: tokenA,
      method: "PATCH",
      body: {cards_studied: 12},
    });
    if (res15Complete.status !== 200) {
      throw new Error(`Failed to complete WEAK_REVIEW session: ${res15Complete.status}`);
    }
    console.log("PASS 15: Global WEAK_REVIEW session (null set_id) creates and completes smoothly");

    console.log("============================================================");
    console.log("ALL 15 TESTS PASSED SUCCESSFULLY!");
    console.log("============================================================");
  } finally {
    // Teardown
    if (createdSessionIds.length > 0) {
      await pool.query(
        `DELETE FROM study_sessions WHERE session_id IN (${createdSessionIds.join(",")})`
      );
    }
    if (testSetId) {
      await pool.execute("DELETE FROM study_sets WHERE set_id = ?", [testSetId]);
    }
    if (userAId) {
      await pool.execute("DELETE FROM users WHERE user_id = ?", [userAId]);
    }
    if (userBId) {
      await pool.execute("DELETE FROM users WHERE user_id = ?", [userBId]);
    }
    server.close();
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  });
