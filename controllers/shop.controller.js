import asyncHandler from 'express-async-handler';
import Shop from '../models/Shop.model.js';
import Auth from '../models/Auth.model.js';

/**
 * @swagger
 * tags:
 *   name: Shops
 *   description: API để quản lý đăng ký và duyệt shop
 */

/**
 * @swagger
 * /api/shops/register:
 *   post:
 *     summary: Đăng ký shop mới (tạo luôn tài khoản shop)
 *     tags: [Shops]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *               - shopName
 *               - shopAddress
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               shopName:
 *                 type: string
 *               shopAddress:
 *                 type: string
 *               shopDescription:
 *                 type: string
 *               shopLogoUrl:
 *                 type: string
 *               businessLicenseNumber:
 *                 type: string
 *               taxId:
 *                 type: string
 *               contactEmail:
 *                 type: string
 *               contactPhone:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               bankName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đăng ký shop thành công, chờ admin duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *                 message:
 *                   type: string
 *       400:
 *         description: Tài khoản đã tồn tại hoặc dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/shops/pending:
 *   get:
 *     summary: Lấy danh sách shop chờ duyệt (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách shop chờ duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shop'
 */

/**
 * @swagger
 * /api/shops/{shopId}/approve:
 *   patch:
 *     summary: Duyệt shop (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     responses:
 *       200:
 *         description: Shop đã được duyệt
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/shops/{shopId}/reject:
 *   patch:
 *     summary: Từ chối shop (admin)
 *     tags: [Shops]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Lý do từ chối
 *     responses:
 *       200:
 *         description: Shop đã bị từ chối
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /api/shops/{shopId}:
 *   get:
 *     summary: Lấy chi tiết shop
 *     tags: [Shops]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của shop
 *     responses:
 *       200:
 *         description: Thông tin chi tiết shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Shop'
 *       404:
 *         description: Không tìm thấy shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

// Đăng ký shop mới
const registerShop = asyncHandler(async (req, res) => {
  const { username, email, password, firstName, lastName, shopName, shopAddress, shopDescription, shopLogoUrl, businessLicenseNumber, taxId, contactEmail, contactPhone, bankAccountNumber, bankName } = req.body;

  // Kiểm tra tài khoản đã tồn tại chưa
  const userExists = await Auth.findOne({ $or: [{ username }, { email }] });
  if (userExists) {
    res.status(400);
    throw new Error('Tài khoản đã tồn tại');
  }

  // Tạo tài khoản shop mới
  const account = await Auth.create({
    username,
    email,
    passwordHash: password,
    firstName,
    lastName,
    role: 'shop',
    isEmailVerified: false // hoặc true nếu không cần xác thực email
  });

  // Tạo shop liên kết với account vừa tạo
  const shop = await Shop.create({
    accountId: account._id,
    shopName,
    shopAddress,
    shopDescription,
    shopLogoUrl,
    businessLicenseNumber,
    taxId,
    contactEmail,
    contactPhone,
    bankAccountNumber,
    bankName,
    approvalStatus: 'pending',
    isActive: false
  });

  res.status(201).json({ success: true, data: shop, message: 'Đăng ký shop thành công, chờ admin duyệt.' });
});

// Lấy danh sách shop chờ duyệt
const getPendingShops = asyncHandler(async (req, res) => {
  const shops = await Shop.find({ approvalStatus: 'pending' }).populate('accountId', 'username email');
  res.json({ success: true, data: shops });
});

// Admin duyệt shop
const approveShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const shop = await Shop.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  shop.approvalStatus = 'approved';
  shop.isActive = true;
  await shop.save();
  res.json({ success: true, message: 'Shop đã được duyệt', data: shop });
});

// Admin từ chối shop
const rejectShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { reason } = req.body;
  const shop = await Shop.findById(shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  shop.approvalStatus = 'rejected';
  shop.rejectionReason = reason || '';
  shop.isActive = false;
  await shop.save();
  res.json({ success: true, message: 'Shop đã bị từ chối', data: shop });
});

// Lấy chi tiết shop
const getShopDetail = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const shop = await Shop.findById(shopId).populate('accountId', 'username email');
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }
  res.json({ success: true, data: shop });
});

export { registerShop, getPendingShops, approveShop, rejectShop, getShopDetail }; 