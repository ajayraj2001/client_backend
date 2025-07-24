const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../../middlewares");

const {
  createAstrologer,
  updateAstrologer,
  deleteAstrologer,
  getAllAstrologers,
  getAstrologerById,
  updateAstrologerStatus,
  getAllRequests,
  approveOrRejectRequest,
  getSignupRequests,
  getSignupRequestDetails,
  approveAstrologerSignup,
  getWalletHistory,
  getAstrologerReviews,
} = require("../../controllers/admin/astrologerController");

router.post('/', authenticateAdmin, createAstrologer);
router.put('/:id', authenticateAdmin, updateAstrologer);
router.delete('/:id', authenticateAdmin, deleteAstrologer);
router.get('/', authenticateAdmin, getAllAstrologers);
router.get('/:id', authenticateAdmin, getAstrologerById);
router.put('/:id/status', authenticateAdmin, updateAstrologerStatus);
router.get('/bank_request', authenticateAdmin, getAllRequests);
router.put('/bank_request_status', authenticateAdmin, approveOrRejectRequest);
router.post('/getSignupRequests', authenticateAdmin, getSignupRequests);
router.post('/getSignupRequestDetails/:requestId', authenticateAdmin, getSignupRequestDetails);
router.post('/approveAstrologerSignup', authenticateAdmin, approveAstrologerSignup);
router.get('/getWalletHistory/:id', authenticateAdmin, getWalletHistory);
router.get("/getReviews/:id", authenticateAdmin, getAstrologerReviews);

module.exports = router;