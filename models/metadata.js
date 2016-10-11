var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var InfoSchema = new Schema({
		id:{type:Number, unique: true},
		url:{type:String},
		domain:{type:String},
    title:{type:String },
    description:{type:String},
    media_id:{type:Number},
		date_add:{type: Date, default: Date.now},
    original_image_url:{type:String},
    width:{type:Number},
    height:{type:Number},
    is_video:{type:Boolean},
    aspect_ratio:{type:Number},
}, { versionKey: false });

module.exports = mongoose.model('Info' , InfoSchema);
