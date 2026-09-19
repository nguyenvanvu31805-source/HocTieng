const testResultService = require("../services/test-result.service");
const {success} = require("../utils/response");

const createTestResult = async (req, res) => {
  const result = await testResultService.createTestResult(req.user, req.body);
  return success(res, result, "Test result saved successfully", 201);
};

module.exports = {createTestResult};
