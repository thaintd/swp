import asyncHandler from 'express-async-handler';
import Service from '../models/Service.model.js';
import Shop from '../models/Shop.model.js';
import ProductType from '../models/ProductType.model.js';
import mongoose from 'mongoose';

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: API để quản lý dịch vụ
 */

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Tạo dịch vụ mới (Chỉ Shop)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - description
 *               - categories
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên dịch vụ
 *                 example: Chụp ảnh chân dung
 *               description:
 *                 type: string
 *                 description: Mô tả dịch vụ
 *                 example: Dịch vụ chụp ảnh chân dung chuyên nghiệp
 *               price:
 *                 type: number
 *                 description: Giá dịch vụ (không âm)
 *                 example: 500000
 *               duration:
 *                 type: number
 *                 description: Thời gian thực hiện dịch vụ (phút)
 *                 example: 120
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Mảng các ID của loại sản phẩm
 *                 example: ["60f0a9c1a6b7c3001f123457", "60f0a9c1a6b7c3001f123458"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách các URL hình ảnh dịch vụ
 *                 example: ["http://example.com/img1.jpg"]
 *               serviceType:
 *                 type: string
 *                 enum: ['onsite', 'offsite', 'both']
 *                 description: Loại dịch vụ
 *                 example: both
 *               maxBookings:
 *                 type: number
 *                 description: Số lượng đặt lịch tối đa mỗi ngày
 *                 example: 5
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Yêu cầu của khách hàng
 *                 example: ["Khách hàng cần đặt lịch trước 24h"]
 *               includes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Dịch vụ bao gồm
 *                 example: ["Chụp ảnh", "Chỉnh sửa", "In ảnh"]
 *               excludes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Dịch vụ không bao gồm
 *                 example: ["Trang điểm", "Thay trang phục"]
 *               notes:
 *                 type: string
 *                 description: Ghi chú thêm
 *                 example: "Dịch vụ có thể thực hiện tại studio hoặc tại nhà"
 *     responses:
 *       201:
 *         description: Tạo dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *                 message:
 *                   type: string
 *                   example: "Tạo dịch vụ thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền tạo dịch vụ
 *       500:
 *         description: Lỗi server
 */

// @desc    Tạo dịch vụ mới
// @route   POST /api/services
// @access  Private/Shop
const createService = asyncHandler(async (req, res) => {
  // Kiểm tra quyền: Chỉ shop mới có thể tạo dịch vụ
  if (req.user.role !== 'shop') {
    res.status(403);
    throw new Error('Chỉ shop mới có thể tạo dịch vụ');
  }

  // Kiểm tra shop có tồn tại và được duyệt không
  const shop = await Shop.findOne({ accountId: req.user._id });
  if (!shop || !shop.isActive || shop.approvalStatus !== 'approved') {
    res.status(403);
    throw new Error('Shop của bạn chưa được duyệt hoặc không hoạt động');
  }

  const {
    name,
    description,
    price,
    duration,
    categories,
    images,
    serviceType,
    maxBookings,
    requirements,
    includes,
    excludes,
    notes,
  } = req.body;

  // Validate required fields
  if (!name || price === undefined || price === null) {
    res.status(400);
    throw new Error('Vui lòng cung cấp đủ các trường bắt buộc: tên, giá');
  }

  // Validate price is non-negative
  if (price < 0) {
    res.status(400);
    throw new Error('Giá dịch vụ không được âm');
  }

  // Validate categories: must be an array of valid ProductType IDs
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    res.status(400);
    throw new Error('Vui lòng cung cấp ít nhất một danh mục cho dịch vụ (dưới dạng mảng các ID loại sản phẩm).');
  }

  for (const categoryId of categories) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      res.status(400);
      throw new Error(`ID loại sản phẩm không hợp lệ: ${categoryId}`);
    }
    const productType = await ProductType.findById(categoryId);
    if (!productType) {
      res.status(400);
      throw new Error(`Không tìm thấy loại sản phẩm với ID: ${categoryId}`);
    }
  }

  const service = new Service({
    name,
    shopId: shop._id,
    description,
    price,
    duration,
    categories,
    images,
    serviceType,
    maxBookings,
    requirements,
    includes,
    excludes,
    notes,
  });

  const createdService = await service.save();
  res.status(201).json({
    success: true,
    data: createdService,
    message: 'Tạo dịch vụ thành công',
  });
});

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Lấy tất cả dịch vụ (có phân trang, tìm kiếm và lọc)
 *     tags: [Services]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tên dịch vụ
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang (mặc định là 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số lượng dịch vụ trên mỗi trang (mặc định là 10)
 *       - in: query
 *         name: shopId
 *         schema:
 *           type: string
 *         description: Lọc theo ID shop
 *       - in: query
 *         name: categories
 *         schema:
 *           type: string
 *         description: Lọc theo ID loại sản phẩm (có thể truyền nhiều ID cách nhau bằng dấu phẩy)
 *         example: 60f0a9c1a6b7c3001f123457,60f0a9c1a6b7c3001f123458
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Lọc theo giá tối thiểu
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Lọc theo giá tối đa
 *       - in: query
 *         name: serviceType
 *         schema:
 *           type: string
 *           enum: ['onsite', 'offsite', 'both']
 *         description: Lọc theo loại dịch vụ
 *       - in: query
 *         name: availability
 *         schema:
 *           type: string
 *           enum: ['available', 'unavailable']
 *         description: Lọc theo trạng thái có sẵn
 *     responses:
 *       200:
 *         description: Danh sách dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 pages:
 *                   type: integer
 *                   example: 5
 *                 total:
 *                   type: integer
 *                   example: 50
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách dịch vụ thành công"
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy tất cả dịch vụ (có phân trang, tìm kiếm và lọc)
// @route   GET /api/services
// @access  Public
const getServices = asyncHandler(async (req, res) => {
  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;

  const filter = {};

  // Search by keyword (on name)
  if (req.query.keyword) {
    const keyword = req.query.keyword;
    filter.name = {
      $regex: keyword,
      $options: 'i', // Case-insensitive
    };
  }

  // Filter by shop ID
  if (req.query.shopId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.shopId)) {
      res.status(400);
      throw new Error('ID shop không hợp lệ');
    }
    filter.shopId = req.query.shopId;
  }

  // Filter by categories (expecting comma-separated IDs)
  if (req.query.categories) {
    const categoryIds = req.query.categories.split(',').map(id => id.trim()).filter(id => mongoose.Types.ObjectId.isValid(id));
    if (categoryIds.length > 0) {
      filter.categories = { $in: categoryIds };
    } else if (req.query.categories.split(',').map(id => id.trim()).filter(id => id).length > 0) {
      // If there were inputs but none were valid ObjectIds
      res.status(400);
      throw new Error('Một hoặc nhiều ID danh mục không hợp lệ.');
    }
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice) {
      const minPrice = parseFloat(req.query.minPrice);
      if (!isNaN(minPrice) && minPrice >= 0) {
        filter.price.$gte = minPrice;
      } else {
        res.status(400);
        throw new Error('Giá tối thiểu không hợp lệ');
      }
    }
    if (req.query.maxPrice) {
      const maxPrice = parseFloat(req.query.maxPrice);
      if (!isNaN(maxPrice) && maxPrice >= 0) {
        filter.price.$lte = maxPrice;
      } else {
        res.status(400);
        throw new Error('Giá tối đa không hợp lệ');
      }
    }
  }

  // Filter by service type
  if (req.query.serviceType) {
    const allowedTypes = ['onsite', 'offsite', 'both'];
    if (allowedTypes.includes(req.query.serviceType)) {
      filter.serviceType = req.query.serviceType;
    } else {
      res.status(400);
      throw new Error('Loại dịch vụ không hợp lệ');
    }
  }

  // Filter by availability
  if (req.query.availability) {
    const allowedStatus = ['available', 'unavailable'];
    if (allowedStatus.includes(req.query.availability)) {
      filter.availability = req.query.availability;
    } else {
      res.status(400);
      throw new Error('Trạng thái không hợp lệ');
    }
  }

  const count = await Service.countDocuments(filter);

  const services = await Service.find(filter)
    .populate('shopId', 'name address') // Lấy thông tin shop
    .populate('categories', 'name') // Lấy tên loại sản phẩm
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    success: true,
    data: services,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    message: 'Lấy danh sách dịch vụ thành công',
  });
});

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Lấy dịch vụ theo ID
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của dịch vụ cần lấy
 *     responses:
 *       200:
 *         description: Thông tin dịch vụ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *                 message:
 *                   type: string
 *                   example: "Lấy thông tin dịch vụ thành công"
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       400:
 *         description: ID dịch vụ không hợp lệ
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy dịch vụ theo ID
// @route   GET /api/services/:id
// @access  Public
const getServiceById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('ID dịch vụ không hợp lệ');
  }

  const service = await Service.findById(req.params.id)
    .populate('shopId', 'name address phone')
    .populate('categories', 'name'); // Lấy tên loại sản phẩm

  if (service) {
    res.json({
      success: true,
      data: service,
      message: 'Lấy thông tin dịch vụ thành công',
    });
  } else {
    res.status(404);
    throw new Error('Không tìm thấy dịch vụ');
  }
});

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Cập nhật dịch vụ theo ID (Chỉ Shop sở hữu)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của dịch vụ cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên dịch vụ
 *               description:
 *                 type: string
 *                 description: Mô tả dịch vụ
 *               price:
 *                 type: number
 *                 description: Giá dịch vụ
 *               duration:
 *                 type: number
 *                 description: Thời gian thực hiện dịch vụ (phút)
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Mảng các ID của loại sản phẩm
 *                 example: ["60f0a9c1a6b7c3001f123457"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách các URL hình ảnh dịch vụ
 *               serviceType:
 *                 type: string
 *                 enum: ['onsite', 'offsite', 'both']
 *                 description: Loại dịch vụ
 *               availability:
 *                 type: string
 *                 enum: ['available', 'unavailable']
 *                 description: Trạng thái có sẵn
 *               maxBookings:
 *                 type: number
 *                 description: Số lượng đặt lịch tối đa mỗi ngày
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Yêu cầu của khách hàng
 *               includes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Dịch vụ bao gồm
 *               excludes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Dịch vụ không bao gồm
 *               notes:
 *                 type: string
 *                 description: Ghi chú thêm
 *     responses:
 *       200:
 *         description: Cập nhật dịch vụ thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Service'
 *                 message:
 *                   type: string
 *                   example: "Cập nhật dịch vụ thành công"
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền cập nhật dịch vụ này
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       500:
 *         description: Lỗi server
 */

// @desc    Cập nhật dịch vụ theo ID
// @route   PUT /api/services/:id
// @access  Private/Shop
const updateService = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('ID dịch vụ không hợp lệ');
  }

  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error('Không tìm thấy dịch vụ');
  }

  // Kiểm tra quyền: Chỉ shop sở hữu dịch vụ mới có thể cập nhật
  if (req.user.role !== 'shop') {
    res.status(403);
    throw new Error('Chỉ shop mới có thể cập nhật dịch vụ');
  }

  // Kiểm tra shop có sở hữu dịch vụ này không
  const shop = await Shop.findOne({ accountId: req.user._id });
  if (!shop || service.shopId.toString() !== shop._id.toString()) {
    res.status(403);
    throw new Error('Bạn không có quyền cập nhật dịch vụ này');
  }

  const {
    name,
    description,
    price,
    duration,
    categories,
    images,
    serviceType,
    availability,
    maxBookings,
    requirements,
    includes,
    excludes,
    notes,
  } = req.body;

  // Validate price if provided
  if (price !== undefined && price !== null) {
    if (isNaN(price) || price < 0) {
      res.status(400);
      throw new Error('Giá phải là số không âm');
    }
    service.price = price;
  }

  // Validate categories if provided: must be an array of valid ProductType IDs
  if (categories !== undefined) { // Check if categories is provided in the update request
    if (!Array.isArray(categories) || categories.length === 0) {
      res.status(400);
      throw new Error('Danh mục dịch vụ phải là một mảng chứa ít nhất một ID loại sản phẩm.');
    }
    for (const categoryId of categories) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        res.status(400);
        throw new Error(`ID loại sản phẩm không hợp lệ: ${categoryId}`);
      }
      const productType = await ProductType.findById(categoryId);
      if (!productType) {
        res.status(400);
        throw new Error(`Không tìm thấy loại sản phẩm với ID: ${categoryId}`);
      }
    }
    service.categories = categories;
  }

  // Update fields
  service.name = name !== undefined ? name : service.name;
  service.description = description !== undefined ? description : service.description;
  service.duration = duration !== undefined ? duration : service.duration;
  service.images = images !== undefined ? images : service.images;
  service.serviceType = serviceType !== undefined ? serviceType : service.serviceType;
  service.availability = availability !== undefined ? availability : service.availability;
  service.maxBookings = maxBookings !== undefined ? maxBookings : service.maxBookings;
  service.requirements = requirements !== undefined ? requirements : service.requirements;
  service.includes = includes !== undefined ? includes : service.includes;
  service.excludes = excludes !== undefined ? excludes : service.excludes;
  service.notes = notes !== undefined ? notes : service.notes;

  const updatedService = await service.save();
  res.json({
    success: true,
    data: updatedService,
    message: 'Cập nhật dịch vụ thành công',
  });
});

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Xóa dịch vụ theo ID (Chỉ Shop sở hữu)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của dịch vụ cần xóa
 *     responses:
 *       200:
 *         description: Dịch vụ đã được xóa thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Dịch vụ đã được xóa thành công"
 *       400:
 *         description: ID dịch vụ không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không có quyền xóa dịch vụ này
 *       404:
 *         description: Không tìm thấy dịch vụ
 *       500:
 *         description: Lỗi server
 */

// @desc    Xóa dịch vụ theo ID
// @route   DELETE /api/services/:id
// @access  Private/Shop
const deleteService = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('ID dịch vụ không hợp lệ');
  }

  const service = await Service.findById(req.params.id);

  if (!service) {
    res.status(404);
    throw new Error('Không tìm thấy dịch vụ');
  }

  // Kiểm tra quyền: Chỉ shop sở hữu dịch vụ mới có thể xóa
  if (req.user.role !== 'shop') {
    res.status(403);
    throw new Error('Chỉ shop mới có thể xóa dịch vụ');
  }

  // Kiểm tra shop có sở hữu dịch vụ này không
  const shop = await Shop.findOne({ accountId: req.user._id });
  if (!shop || service.shopId.toString() !== shop._id.toString()) {
    res.status(403);
    throw new Error('Bạn không có quyền xóa dịch vụ này');
  }

  await service.deleteOne();
  res.json({
    success: true,
    message: 'Dịch vụ đã được xóa thành công',
  });
});

/**
 * @swagger
 * /api/services/shop/{shopId}:
 *   get:
 *     summary: Lấy tất cả dịch vụ của một shop
 *     tags: [Services]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của shop
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số trang (mặc định là 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Số lượng dịch vụ trên mỗi trang (mặc định là 10)
 *     responses:
 *       200:
 *         description: Danh sách dịch vụ của shop
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Service'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 pages:
 *                   type: integer
 *                   example: 2
 *                 total:
 *                   type: integer
 *                   example: 15
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách dịch vụ của shop thành công"
 *       400:
 *         description: ID shop không hợp lệ
 *       404:
 *         description: Không tìm thấy shop
 *       500:
 *         description: Lỗi server
 */

// @desc    Lấy tất cả dịch vụ của một shop
// @route   GET /api/services/shop/:shopId
// @access  Public
const getServicesByShop = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.shopId)) {
    res.status(400);
    throw new Error('ID shop không hợp lệ');
  }

  // Kiểm tra shop có tồn tại không
  const shop = await Shop.findById(req.params.shopId);
  if (!shop) {
    res.status(404);
    throw new Error('Không tìm thấy shop');
  }

  const pageSize = parseInt(req.query.limit) || 10;
  const page = parseInt(req.query.page) || 1;

  const filter = { shopId: req.params.shopId };

  const count = await Service.countDocuments(filter);

  const services = await Service.find(filter)
    .populate('shopId', 'name address')
    .populate('categories', 'name') // Lấy tên loại sản phẩm
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  res.json({
    success: true,
    data: services,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
    message: 'Lấy danh sách dịch vụ của shop thành công',
  });
});

export { 
  createService, 
  getServices, 
  getServiceById, 
  updateService, 
  deleteService, 
  getServicesByShop 
}; 