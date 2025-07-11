import mongoose from 'mongoose';

const { Schema } = mongoose;

const ShopSchema = new Schema({
  accountId: { type: Schema.Types.ObjectId, ref: 'Auth', required: true, unique: true },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  shopDescription: { type: String },
  shopLogoUrl: { type: String },
  businessLicenseNumber: { type: String, unique: true, sparse: true },
  taxId: { type: String, unique: true, sparse: true },
  contactEmail: { type: String, lowercase: true },
  contactPhone: { type: String },
  bankAccountNumber: { type: String },
  bankName: { type: String },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String },
  isActive: { type: Boolean, default: false },
  hasActivePackage: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ShopSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

const Shop = mongoose.model('Shop', ShopSchema);
export default Shop;

/**
 * @swagger
 * components:
 *   schemas:
 *     Shop:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         accountId:
 *           type: string
 *           description: ID tài khoản Auth
 *         shopName:
 *           type: string
 *         shopAddress:
 *           type: string
 *         shopDescription:
 *           type: string
 *         shopLogoUrl:
 *           type: string
 *         businessLicenseNumber:
 *           type: string
 *         taxId:
 *           type: string
 *         contactEmail:
 *           type: string
 *         contactPhone:
 *           type: string
 *         bankAccountNumber:
 *           type: string
 *         bankName:
 *           type: string
 *         approvalStatus:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejectionReason:
 *           type: string
 *         isActive:
 *           type: boolean
 *         hasActivePackage:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */ 