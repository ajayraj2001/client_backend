const testRoute = require('express').Router();

testRoute.get('/', test);

module.exports = testRoute;

async function test(req, res, next) {
  return res.status(200).json({ success: true });
}
