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
  approveOrRejectRequest
} = require("../../controllers/admin/astrologerController");

router.post('/', authenticateAdmin, createAstrologer);
router.put('/:id', authenticateAdmin, updateAstrologer);
router.delete('/:id', authenticateAdmin, deleteAstrologer);
router.get('/', authenticateAdmin, getAllAstrologers);
router.get('/:id', authenticateAdmin, getAstrologerById);
router.put('/:id/status', authenticateAdmin, updateAstrologerStatus);
router.get('/bank_request', authenticateAdmin, getAllRequests);
router.post('/approveOrRejectRequest', authenticateAdmin, approveOrRejectRequest);

module.exports = router;