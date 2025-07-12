import asyncHandler from 'express-async-handler';
import Auth from '../models/Auth.model.js';
import Shop from '../models/Shop.model.js';
import Order from '../models/Order.model.js';
import Service from '../models/Service.model.js';
import mongoose from 'mongoose';

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: API dashboard cho admin
 */

/**
 * @swagger
 * /api/dashboard/overview:
 *   get:
 *     summary: Lấy tổng quan dashboard (Chỉ Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Tháng (1-12)
 *         example: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *         description: Năm
 *         example: 2024
 *     responses:
 *       200:
 *         description: Thông tin tổng quan dashboard
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       description: Tổng số người dùng
 *                     newUsersThisMonth:
 *                       type: integer
 *                       description: Số người dùng mới trong tháng
 *                     totalShops:
 *                       type: integer
 *                       description: Tổng số shop
 *                     newShopsThisMonth:
 *                       type: integer
 *                       description: Số shop mới trong tháng
 *                     pendingShops:
 *                       type: integer
 *                       description: Số shop chờ duyệt
 *                     totalOrders:
 *                       type: integer
 *                       description: Tổng số đơn hàng
 *                     ordersThisMonth:
 *                       type: integer
 *                       description: Số đơn hàng trong tháng
 *                     totalRevenue:
 *                       type: number
 *                       description: Tổng doanh thu
 *                     revenueThisMonth:
 *                       type: number
 *                       description: Doanh thu trong tháng
 *                     totalServices:
 *                       type: integer
 *                       description: Tổng số dịch vụ
 *                     activeServices:
 *                       type: integer
 *                       description: Số dịch vụ đang hoạt động
 *                 message:
 *                   type: string
 *                   example: "Lấy thông tin dashboard thành công"
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy tổng quan dashboard
// @route   GET /api/dashboard/overview
// @access  Private/Admin
const getDashboardOverview = asyncHandler(async (req, res) => {
  // Kiểm tra quyền admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Chỉ admin mới có thể truy cập dashboard');
  }

  const { month, year } = req.query;
  const currentDate = new Date();
  const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
  const currentYear = year ? parseInt(year) : currentDate.getFullYear();

  // Tạo date range cho tháng/năm được chọn
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  // Thống kê Users
  const totalUsers = await Auth.countDocuments();
  const newUsersThisMonth = await Auth.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Thống kê Shops
  const totalShops = await Shop.countDocuments();
  const newShopsThisMonth = await Shop.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const pendingShops = await Shop.countDocuments({ approvalStatus: 'pending' });

  // Thống kê Orders
  const totalOrders = await Order.countDocuments();
  const ordersThisMonth = await Order.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Thống kê Revenue
  const totalRevenueResult = await Order.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

  const revenueThisMonthResult = await Order.aggregate([
    { 
      $match: { 
        status: { $in: ['confirmed', 'completed'] },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      } 
    },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;

  // Thống kê Services
  const totalServices = await Service.countDocuments();
  const activeServices = await Service.countDocuments({ availability: 'available' });

  res.json({
    success: true,
    data: {
      totalUsers,
      newUsersThisMonth,
      totalShops,
      newShopsThisMonth,
      pendingShops,
      totalOrders,
      ordersThisMonth,
      totalRevenue,
      revenueThisMonth,
      totalServices,
      activeServices,
      selectedMonth: currentMonth,
      selectedYear: currentYear
    },
    message: 'Lấy thông tin dashboard thành công',
  });
});

/**
 * @swagger
 * /api/dashboard/users:
 *   get:
 *     summary: Lấy thống kê chi tiết về users (Chỉ Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Tháng (1-12)
 *         example: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *         description: Năm
 *         example: 2024
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *     responses:
 *       200:
 *         description: Thống kê chi tiết về users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         newUsersThisMonth:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         inactiveUsers:
 *                           type: integer
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê users thành công"
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy thống kê chi tiết về users
// @route   GET /api/dashboard/users
// @access  Private/Admin
const getUsersStats = asyncHandler(async (req, res) => {
  // Kiểm tra quyền admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Chỉ admin mới có thể truy cập dashboard');
  }

  const { month, year, page = 1, limit = 10 } = req.query;
  const currentDate = new Date();
  const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
  const currentYear = year ? parseInt(year) : currentDate.getFullYear();

  // Tạo date range cho tháng/năm được chọn
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const pageSize = parseInt(limit);
  const currentPage = parseInt(page);

  // Thống kê tổng quan
  const totalUsers = await Auth.countDocuments();
  const newUsersThisMonth = await Auth.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const activeUsers = await Auth.countDocuments({ isActive: true });
  const inactiveUsers = await Auth.countDocuments({ isActive: false });

  // Lấy danh sách users với phân trang
  const users = await Auth.find()
    .select('-password')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1));

  res.json({
    success: true,
    data: {
      users,
      page: currentPage,
      pages: Math.ceil(totalUsers / pageSize),
      total: totalUsers,
      stats: {
        totalUsers,
        newUsersThisMonth,
        activeUsers,
        inactiveUsers,
        selectedMonth: currentMonth,
        selectedYear: currentYear
      }
    },
    message: 'Lấy thống kê users thành công',
  });
});

/**
 * @swagger
 * /api/dashboard/shops:
 *   get:
 *     summary: Lấy thống kê chi tiết về shops (Chỉ Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Tháng (1-12)
 *         example: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *         description: Năm
 *         example: 2024
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *     responses:
 *       200:
 *         description: Thống kê chi tiết về shops
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shops:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           approvalStatus:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalShops:
 *                           type: integer
 *                         newShopsThisMonth:
 *                           type: integer
 *                         approvedShops:
 *                           type: integer
 *                         pendingShops:
 *                           type: integer
 *                         rejectedShops:
 *                           type: integer
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê shops thành công"
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy thống kê chi tiết về shops
// @route   GET /api/dashboard/shops
// @access  Private/Admin
const getShopsStats = asyncHandler(async (req, res) => {
  // Kiểm tra quyền admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Chỉ admin mới có thể truy cập dashboard');
  }

  const { month, year, page = 1, limit = 10 } = req.query;
  const currentDate = new Date();
  const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
  const currentYear = year ? parseInt(year) : currentDate.getFullYear();

  // Tạo date range cho tháng/năm được chọn
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const pageSize = parseInt(limit);
  const currentPage = parseInt(page);

  // Thống kê tổng quan
  const totalShops = await Shop.countDocuments();
  const newShopsThisMonth = await Shop.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });
  const approvedShops = await Shop.countDocuments({ approvalStatus: 'approved' });
  const pendingShops = await Shop.countDocuments({ approvalStatus: 'pending' });
  const rejectedShops = await Shop.countDocuments({ approvalStatus: 'rejected' });

  // Lấy danh sách shops với phân trang
  const shops = await Shop.find()
    .populate('accountId', 'email role')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1));

  res.json({
    success: true,
    data: {
      shops,
      page: currentPage,
      pages: Math.ceil(totalShops / pageSize),
      total: totalShops,
      stats: {
        totalShops,
        newShopsThisMonth,
        approvedShops,
        pendingShops,
        rejectedShops,
        selectedMonth: currentMonth,
        selectedYear: currentYear
      }
    },
    message: 'Lấy thống kê shops thành công',
  });
});

/**
 * @swagger
 * /api/dashboard/revenue:
 *   get:
 *     summary: Lấy thống kê chi tiết về doanh thu (Chỉ Admin)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Tháng (1-12)
 *         example: 12
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           minimum: 2020
 *         description: Năm
 *         example: 2024
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số lượng item trên mỗi trang
 *     responses:
 *       200:
 *         description: Thống kê chi tiết về doanh thu
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           totalAmount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           customerInfo:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalRevenue:
 *                           type: number
 *                         revenueThisMonth:
 *                           type: number
 *                         totalOrders:
 *                           type: integer
 *                         ordersThisMonth:
 *                           type: integer
 *                         averageOrderValue:
 *                           type: number
 *                         averageOrderValueThisMonth:
 *                           type: number
 *                         pendingRevenue:
 *                           type: number
 *                         completedRevenue:
 *                           type: number
 *                 message:
 *                   type: string
 *                   example: "Lấy thống kê doanh thu thành công"
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền admin
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy thống kê chi tiết về doanh thu
// @route   GET /api/dashboard/revenue
// @access  Private/Admin
const getRevenueStats = asyncHandler(async (req, res) => {
  // Kiểm tra quyền admin
  if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Chỉ admin mới có thể truy cập dashboard');
  }

  const { month, year, page = 1, limit = 10 } = req.query;
  const currentDate = new Date();
  const currentMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
  const currentYear = year ? parseInt(year) : currentDate.getFullYear();

  // Tạo date range cho tháng/năm được chọn
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const pageSize = parseInt(limit);
  const currentPage = parseInt(page);

  // Thống kê tổng quan doanh thu
  const totalRevenueResult = await Order.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

  const revenueThisMonthResult = await Order.aggregate([
    { 
      $match: { 
        status: { $in: ['confirmed', 'completed'] },
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      } 
    },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const revenueThisMonth = revenueThisMonthResult.length > 0 ? revenueThisMonthResult[0].total : 0;

  // Thống kê đơn hàng
  const totalOrders = await Order.countDocuments();
  const ordersThisMonth = await Order.countDocuments({
    createdAt: { $gte: startOfMonth, $lte: endOfMonth }
  });

  // Tính giá trị đơn hàng trung bình
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const averageOrderValueThisMonth = ordersThisMonth > 0 ? revenueThisMonth / ordersThisMonth : 0;

  // Thống kê doanh thu theo trạng thái
  const pendingRevenueResult = await Order.aggregate([
    { $match: { status: 'pending' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const pendingRevenue = pendingRevenueResult.length > 0 ? pendingRevenueResult[0].total : 0;

  const completedRevenueResult = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  const completedRevenue = completedRevenueResult.length > 0 ? completedRevenueResult[0].total : 0;

  // Lấy danh sách orders với phân trang (chỉ những đơn có doanh thu)
  const orders = await Order.find({ status: { $in: ['confirmed', 'completed'] } })
    .populate('customer', 'email')
    .sort({ createdAt: -1 })
    .limit(pageSize)
    .skip(pageSize * (currentPage - 1));

  const totalRevenueOrders = await Order.countDocuments({ status: { $in: ['confirmed', 'completed'] } });

  res.json({
    success: true,
    data: {
      orders,
      page: currentPage,
      pages: Math.ceil(totalRevenueOrders / pageSize),
      total: totalRevenueOrders,
      stats: {
        totalRevenue,
        revenueThisMonth,
        totalOrders,
        ordersThisMonth,
        averageOrderValue,
        averageOrderValueThisMonth,
        pendingRevenue,
        completedRevenue,
        selectedMonth: currentMonth,
        selectedYear: currentYear
      }
    },
    message: 'Lấy thống kê doanh thu thành công',
  });
});

export { 
  getDashboardOverview, 
  getUsersStats, 
  getShopsStats, 
  getRevenueStats 
}; 