import express from 'express';
import {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getServicesByShop,
} from '../controllers/service.controller.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes for services (anyone can view services)
router.route('/').get(getServices);
router.route('/:id').get(getServiceById);
router.route('/shop/:shopId').get(getServicesByShop); // Lấy dịch vụ theo shop

// Protected routes (require authentication)
// Shop-only routes
router.route('/').post(protect, createService); // Chỉ Shop mới có thể tạo dịch vụ
router.route('/:id').put(protect, updateService); // Shop sở hữu mới có thể cập nhật dịch vụ
router.route('/:id').delete(protect, deleteService); // Shop sở hữu mới có thể xóa dịch vụ

export default router; 