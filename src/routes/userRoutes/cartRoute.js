const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../../middlewares");
const cartController = require("../../controllers/user/cartController");


// Get cart
router.get('/', authenticateUser, cartController.getCart);

// Add to cart
router.post('/add',authenticateUser,  cartController.addToCart);

// Update cart item
router.put('/update', authenticateUser, cartController.updateCartItem);

// Remove item from cart
router.delete('/remove/:productId', authenticateUser, cartController.removeFromCart);

// Clear cart
router.delete('/clear', authenticateUser ,cartController.clearCart);

module.exports = router;