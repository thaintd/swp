import express from 'express';
import { registerShop, getPendingShops, approveShop, rejectShop, getShopDetail } from '../controllers/shop.controller.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Đăng ký shop mới
router.post('/register', registerShop);

// Lấy danh sách shop chờ duyệt (admin)
router.get('/pending', protect, admin, getPendingShops);

// Duyệt shop (admin)
router.patch('/:shopId/approve', protect, admin, approveShop);

// Từ chối shop (admin)
router.patch('/:shopId/reject', protect, admin, rejectShop);

// Lấy chi tiết shop
router.get('/:shopId', getShopDetail);

export default router; 