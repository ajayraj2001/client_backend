'use strict';
const { Product, Cart } = require('../../models');
const mongoose = require('mongoose');
const { getCurrentIST } = require('../../utils/timeUtils');

const cartController = {
  /**
   * Get cart for the current user
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  // getCart: async (req, res) => {
  //   try {
  //     const userId = req.user._id;

  //     // Find or create cart for user
  //     let cart = await Cart.findOne({ userId }).populate({
  //       path: 'items.productId',
  //       select: 'name img displayedPrice actualPrice status rating',
  //     });


  //       // If no cart found, return empty cart response
  //   if (!cart) {
  //     return res.status(200).json({
  //       success: true,
  //       cart: {
  //         _id: "",
  //         items: [],
  //         summary: {}
  //       }
  //     });
  //   }

  //        // Filter out inactive/deleted products
  //   const validItems = cart.items.filter(
  //     item => item.productId && item.productId.status === 'Active'
  //   );

  //   // Update only if items were removed
  //   if (validItems.length !== cart.items.length) {
  //     cart.items = validItems;
  //     await cart.save();
  //   }

  //   const items = validItems.map(item => {
  //     const product = item.productId;
  //     const quantity = item.quantity;
  //     const actualPrice = product.actualPrice;
  //     const rating = product.rating;
  //     const displayedPrice = product.displayedPrice;

  //     const subtotal = actualPrice * quantity;
  //     const gstAmount = subtotal * 0.18;
  //     const total = subtotal + gstAmount;
  //     const savedAmount = (displayedPrice - actualPrice) * quantity;


  //     return {
  //       _id: item._id,
  //       productId: product._id,
  //       name: product.name,
  //       img: Array.isArray(product.img) && product.img.length > 0 ? product.img[0] : '',
  //       category: product.categoryId?.name || '',
  //       displayedPrice,
  //       actualPrice,
  //       rating,
  //       quantity,
  //       subtotal,
  //       gstAmount,
  //       total,
  //       savedAmount
  //     };
  //   });

  //   return res.status(200).json({
  //     success: true,
  //     cart: {
  //       _id: cart._id,
  //       items,
  //       summary: cart.summary || {}
  //     }
  //   });
  //   } catch (error) {
  //     console.error('Error fetching cart:', error);
  //     return res.status(500).json({
  //       success: false,
  //       message: 'Error fetching cart',
  //       error: error.message
  //     });
  //   }
  // },

  getCart: async (req, res) => {
    try {
      const userId = req.user._id;

      let cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'name img displayedPrice actualPrice status rating categoryId',
      });

      if (!cart) {
        return res.status(200).json({
          success: true,
          cart: {
            _id: "",
            items: [],
            summary: {
              totalItems: 0,
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
              savedAmount: 0,
            }
          }
        });
      }

      // Filter only active products
      const validItems = cart.items.filter(item => item.productId && item.productId.status === 'Active');

      let subtotal = 0;
      let gstAmount = 0;
      let savedAmount = 0;

      // totalItems should be count of unique products
      const totalItems = validItems.length;

      const items = validItems.map(item => {
        const product = item.productId;
        const quantity = item.quantity;

        const actualPrice = product.actualPrice;
        const displayedPrice = product.displayedPrice;
        const itemSubtotal = actualPrice * quantity;
        const itemGst = itemSubtotal * 0.18;
        const itemSaved = Math.max((displayedPrice - actualPrice) * quantity, 0);

        subtotal += itemSubtotal;
        gstAmount += itemGst;
        savedAmount += itemSaved;

        return {
          _id: item._id,
          productId: product._id,
          name: product.name,
          img: Array.isArray(product.img) && product.img.length > 0 ? product.img[0] : '',
          category: product.categoryId?.name || '',
          displayedPrice,
          actualPrice,
          rating: product.rating,
          quantity,
          subtotal: itemSubtotal,
          gstAmount: itemGst,
          total: itemSubtotal + itemGst,
          savedAmount: itemSaved
        };
      });

      return res.status(200).json({
        success: true,
        cart: {
          _id: cart._id,
          items,
          summary: {
            totalItems,
            subtotal,
            gstAmount,
            totalAmount: subtotal + gstAmount,
            savedAmount
          }
        }
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching cart',
        error: error.message
      });
    }
  },

  /**
   * Add item to cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  addToCart: async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.user._id;
      const { productId, quantity = 1 } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      // Validate product
      const product = await Product.findOne({
        _id: productId,
        status: 'Active'
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or inactive'
        });
      }

      // Find or create cart
      let cart = await Cart.findOne({ userId }).session(session);

      if (!cart) {
        cart = new Cart({
          userId,
          items: [{
            productId,
            quantity: parseInt(quantity)
          }]
        });
      } else {
        // Check if product already in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.productId.toString() === productId
        );

        if (existingItemIndex >= 0) {
          // Update quantity if item exists
          cart.items[existingItemIndex].quantity += parseInt(quantity);
          cart.items[existingItemIndex].addedAt = getCurrentIST();
        } else {
          // Add new item
          cart.items.push({
            productId,
            quantity: parseInt(quantity),
            addedAt: getCurrentIST()
          });
        }
      }

      await cart.save({ session });
      await session.commitTransaction();

      return res.status(200).json({
        success: true,
        message: 'Product added to cart',
        cartId: cart._id,
        itemCount: cart.summary.totalItems
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Error adding to cart:', error);
      return res.status(500).json({
        success: false,
        message: 'Error adding product to cart',
        error: error.message
      });
    } finally {
      session.endSession();
    }
  },

  /**
   * Update cart item quantity
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  updateCartItem: async (req, res) => {
    try {
      const userId = req.user._id;
      const { productId, quantity } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'Product ID and quantity are required'
        });
      }

      const parsedQuantity = parseInt(quantity);

      if (isNaN(parsedQuantity) || parsedQuantity < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be at least 1'
        });
      }

      // Find cart
      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Find product in cart
      const itemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
      );

      if (itemIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in cart'
        });
      }

      // Update quantity
      cart.items[itemIndex].quantity = parsedQuantity;
      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Cart updated successfully',
        summary: cart.summary
      });
    } catch (error) {
      console.error('Error updating cart:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating cart',
        error: error.message
      });
    }
  },

  /**
   * Remove item from cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  removeFromCart: async (req, res) => {
    try {
      const userId = req.user._id;
      const { productId } = req.params;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product ID is required'
        });
      }

      // Find cart
      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Remove item from cart
      cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
      );

      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Product removed from cart',
        summary: cart.summary
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      return res.status(500).json({
        success: false,
        message: 'Error removing product from cart',
        error: error.message
      });
    }
  },

  /**
   * Clear cart
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  clearCart: async (req, res) => {
    try {
      const userId = req.user._id;

      // Find cart
      const cart = await Cart.findOne({ userId });

      if (!cart) {
        return res.status(404).json({
          success: false,
          message: 'Cart not found'
        });
      }

      // Clear items
      cart.items = [];
      await cart.save();

      return res.status(200).json({
        success: true,
        message: 'Cart cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing cart:', error);
      return res.status(500).json({
        success: false,
        message: 'Error clearing cart',
        error: error.message
      });
    }
  }
};

module.exports = cartController;