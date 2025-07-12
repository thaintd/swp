// models/Service.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const ServiceSchema = new Schema({
    name:         { type: String, required: true, trim: true }, // Tên dịch vụ
    shopId:       { type: Schema.Types.ObjectId, ref: 'Shop', required: true }, // ID của shop cung cấp dịch vụ
    description:  { type: String, default: '' }, // Mô tả dịch vụ
    price:        { type: Number, required: true, min: 0 }, // Giá dịch vụ
    duration:     { type: Number, min: 1 }, // Thời gian thực hiện dịch vụ (phút)
    categories:   [{ type: Schema.Types.ObjectId, ref: 'ProductType' }], // Danh mục dịch vụ, tham chiếu đến ProductType
    images:       { type: [String], default: [] }, // Danh sách link ảnh dịch vụ
    
    // Thông tin về dịch vụ
    serviceType:  { type: String, enum: ['onsite', 'offsite', 'both'], default: 'both' }, // Loại dịch vụ: tại chỗ, tại nhà, hoặc cả hai
    availability: { type: String, enum: ['available', 'unavailable'], default: 'available' }, // Trạng thái có sẵn
    maxBookings:  { type: Number, default: 10 }, // Số lượng đặt lịch tối đa mỗi ngày
    
    // Thông tin về thời gian làm việc
    workingHours: {
        monday:    { type: String, default: '09:00-18:00' },
        tuesday:   { type: String, default: '09:00-18:00' },
        wednesday: { type: String, default: '09:00-18:00' },
        thursday:  { type: String, default: '09:00-18:00' },
        friday:    { type: String, default: '09:00-18:00' },
        saturday:  { type: String, default: '09:00-18:00' },
        sunday:    { type: String, default: '09:00-18:00' }
    },
    
    // Thông tin bổ sung
    requirements: { type: [String], default: [] }, // Yêu cầu của khách hàng
    includes:     { type: [String], default: [] }, // Dịch vụ bao gồm
    excludes:     { type: [String], default: [] }, // Dịch vụ không bao gồm
    notes:        { type: String }, // Ghi chú thêm
    
    // Đánh giá và review
    rating:       { type: Number, default: 0, min: 0, max: 5 }, 
    reviews:      [{ type: Schema.Types.ObjectId, ref: 'Review' }],
    
    // Timestamps
    createdAt:    { type: Date, default: Date.now },
    updatedAt:    { type: Date, default: Date.now }, 
});

ServiceSchema.pre('save', function(next) { 
    this.updatedAt = Date.now(); 
    next(); 
});

const Service = mongoose.model('Service', ServiceSchema);
export default Service; 