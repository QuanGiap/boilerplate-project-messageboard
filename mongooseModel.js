const { stringify, type } = require('mocha/lib/utils');
const mongoose = require('mongoose');
mongoose.connect(process.env.DB).then((res)=>console.log('Database connected'));
const ReplySchema = new mongoose.Schema({
    thread_id:{type:mongoose.Types.ObjectId,required:true,index:true},
    created_on:{type:Date,default:()=>Date.now()},
    delete_password:{type:String,required:true},
    text:{type:String,required:''},
    reported:{type:Boolean,default:false},
})
const ThreadSchema = new mongoose.Schema({
    board_id:{type:mongoose.Types.ObjectId,required:true},
    created_on:{type:Date,default:()=>Date.now()},
    bumped_on:{type:Date,default:()=>Date.now(),index:true},
    delete_password:{type:String,required:true},
    text:{type:String,required:true},
    reported:{type:Boolean,default:false},
})
const BoardSchema = new mongoose.Schema({
    name:{type:String,required:true},
})
const ThreadModel = mongoose.model('Thread',ThreadSchema);
const ReplyModel = mongoose.model('Reply',ReplySchema)
const BoardModel = mongoose.model('Board',BoardSchema)
module.exports ={
    ThreadModel,
    ReplyModel,
    BoardModel
}