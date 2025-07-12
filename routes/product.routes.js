import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getProductsByShop,
} from '../controllers/product.controller.js';
import { protect,admin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for products (anyone can view products)
router.route('/').get(getProducts);
router.route('/:id').get(getProductById);
router.route('/shop/:shopId').get(getProductsByShop); // Lấy sản phẩm theo shop

// Protected routes (require authentication)
// Admin-only routes
router.route('/').post(protect, createProduct); // Chỉ Admin mới có thể tạo sản phẩm
router.route('/:id').delete(protect, deleteProduct); // Chỉ Admin mới có thể xóa sản phẩm

// Admin or Manager route for updating product
router.route('/:id').put(protect, updateProduct); // Admin hoặc Manager có thể cập nhật sản phẩm (logic phân quyền nằm trong controller)

export default router; 