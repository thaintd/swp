import express from 'express';
import {
  getDashboardOverview,
  getUsersStats,
  getShopsStats,
  getRevenueStats,
} from '../controllers/dashboard.controller.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Tất cả routes đều yêu cầu authentication và quyền admin
router.use(protect, admin);

// Dashboard routes
router.route('/overview').get(getDashboardOverview); // Tổng quan dashboard
router.route('/users').get(getUsersStats); // Thống kê users
router.route('/shops').get(getShopsStats); // Thống kê shops
router.route('/revenue').get(getRevenueStats); // Thống kê doanh thu

export default router; 