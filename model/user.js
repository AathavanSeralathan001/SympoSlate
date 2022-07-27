const mongoose = require("mongoose")
const {Schema}= mongoose
const passportLocalMongoose=require('passport-local-mongoose');
const userSchema = new Schema({
    email:{
        type:String,
        unique:true,
    },
    username:String,
    register:String,
    
    calendar:[
        {
            type:Schema.Types.ObjectId,
            ref:'Event'
        }
    ]
})

userSchema.plugin(passportLocalMongoose)

module.exports=new mongoose.model('User',userSchema)