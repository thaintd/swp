import mongoose from 'mongoose';
const { Schema } = mongoose;

const ServiceReviewSchema = new Schema({
  serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Auth', required: true }, // Sửa ref sang Auth
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const ServiceReview = mongoose.model('ServiceReview', ServiceReviewSchema);
export default ServiceReview;