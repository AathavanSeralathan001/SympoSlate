const mongoose = require("mongoose")
const {Schema} = mongoose
const User=require('./user')

const eventSchema = new Schema({
        name:String,
        eventDate:Date,
        description:String,
        eventUrl:String,
        startTime:Date,
        endTime:Date,
})


eventSchema.post('findOneAndDelete', async function (doc) {
        if (doc) {
            await User.deleteMany({
                _id: {
                    $in: doc.users
                }
            })
        }
    })
    

module.exports=new mongoose.model("Event",eventSchema)