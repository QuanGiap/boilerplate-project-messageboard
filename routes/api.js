'use strict';
const {ThreadModel,ReplyModel,BoardModel} = require('../mongooseModel');
const brypt = require('bcrypt');
const saltRound = Number(process.env.saltRound);
function checkMissing(array=[],arrayName=[]){
  const missingError = [];
  if(array.length!==arrayName.length){
    throw new Error('Invalid length')
  }
  array.forEach((val,i)=>{
    if(val===null|val===undefined||val===''){
      missingError.push(arrayName[i]);
    }
  })
  return missingError.join(', ');
}

async function getReply(threadId,limit=0){
  let query = ReplyModel.find({thread_id:threadId},{delete_password:0,reported:0}).sort({created_on:-1});
  if(limit>0){
    query.limit(limit);
  }
  const replyData = await query.exec();
  return replyData;
}

async function getThread(board_name,limit=0){
  let board = await BoardModel.findOne({name:board_name}).exec();
  if(!board){
    return {errMessage:'Board not exist',threadData:null};
  }
  let query = ThreadModel.find({board_id:board._id},{delete_password:0,reported:0}).sort({bumped_on:-1})
  if(limit>0){
    query.limit(limit);
  }
  const threadData = await query.exec();
  return {errMessage:null,threadData};
}

async function createThread({board_name,text,delete_password,date}) {
  let board = await BoardModel.findOne({name:board_name}).exec();
  if(!board){
    board = await BoardModel.create({name:board_name});
  }
  const newThread = await ThreadModel.create({
    board_id:board._id,
    delete_password,
    text,
    created_on:date,
    bumped_on:date,
  })
  return newThread;
}
module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .get(async function(req,res){
      const board_name = req.params.board;
      const threads = await getThread(board_name,10);
      if(threads.errMessage){
        return res.send(threads.errMessage);
      }
      const replyThreadData = await Promise.all(threads.threadData.map((thread)=>getReply(thread._id)));
      return res.send(threads.threadData.map((thread,i)=>{
        return{
          ...thread.toObject(),
          replies:replyThreadData[i].filter((val,index)=>index<3),
          replies_count:replyThreadData[i].length,
        }
      }))
    })
    .post(async function(req,res){
      const date = new Date();
      const board_name = req.params.board;
      const {text,delete_password} = req.body;
      const errMes = checkMissing([text,delete_password],['text','delete_password']);
      const hashPassword= brypt.hashSync(delete_password,saltRound);
      if(errMes){
        return res.send('Missing '+errMes);
      }
      const thread = await createThread({board_name:board_name.replace(' ','_'),text,delete_password:hashPassword,date})
      return res.json(thread);
    })
    .put(async function(req,res){
      const board_name = req.params.board;
      const {thread_id} = req.body;
      if(!thread_id){
        return res.send('Missing thread_id');
      }
      const thread = await ThreadModel.findById(thread_id);
      if(!thread){
        return res.send('No thread found');
      }
      thread.reported = true;
      await thread.save();
      return res.send('reported')
    })
    .delete(async function(req,res){
      const board_name = req.params.board;
      const {thread_id,delete_password} = req.body;
      const errMes = checkMissing([thread_id,delete_password],['thread_id','delete_password']);
      if(errMes){
        return res.send('Missing '+errMes);
      }
      const thread = await ThreadModel.findById(thread_id);
      if(!thread){
        return res.send('Thread not found');
      }
      //compare password
      const result = brypt.compareSync(delete_password,thread.delete_password);
      if(result){
        //delete thread and replies
        const repliesDeletePromise = ReplyModel.deleteMany({thread_id});
        const threadDeletePromise = ThreadModel.findByIdAndDelete(thread_id);
        await Promise.all([repliesDeletePromise,threadDeletePromise]);
        return res.send('success');
      }else{
        return res.send('incorrect password')
      }
    });
    
  app.route('/api/replies/:board')
    .get(async function(req,res){
      const board_name = req.params.board;
      const {thread_id} = req.query;
      if(!thread_id){
        return res.send('Missing thread_id');
      }
      const thread = await ThreadModel.findById(thread_id,{delete_password:0,reported:0});
      if(!thread){
        return res.send('Thread not found');
      }
      const replies = await getReply(thread_id);
      return res.json({
        ...thread.toObject(),
        replies:replies.map(reply=>reply.toObject()),
      });
    })
    .post(async function(req,res){
      const board_name = req.params.board;
      const date = new Date();
      const {text,delete_password,thread_id} = req.body;
      const errMes = checkMissing([text,thread_id,delete_password],['text','thread_id','delete_password']);
      if(errMes){
        return res.send('Missing '+errMes);
      }
      const thread = await ThreadModel.findById(thread_id);
      if(!thread){
        return res.send('Thread not found');
      }
      //update time for thread
      thread.bumped_on= date;
      //create reply
      const hashPassword= brypt.hashSync(delete_password,saltRound);
      const replyPromise = ReplyModel.create({
        text,
        delete_password:hashPassword,
        thread_id,
        created_on:date,
      })
      const [reply] = await Promise.all([replyPromise,thread.save()]);
      return res.json(reply.toObject());
    })
    .put(async function(req,res){
      const board_name = req.params.board;
      const {reply_id,thread_id} = req.body;
      const errMes = checkMissing([thread_id,reply_id],['reply_id','thread_id']);
      if(errMes){
        return res.send('Missing '+errMes);
      }
      const reply = await ReplyModel.findById(reply_id);
      if(!reply){
        return res.send('Reply not found')
      }
      reply.reported = true;
      await reply.save();
      return res.send('reported')
    })
    .delete(async function(req,res){
      const board_name = req.params.board;
      const {thread_id, reply_id, delete_password} = req.body;
      const errMes = checkMissing([thread_id,reply_id,delete_password],['thread_id','reply_id','delete_password']);
      if(errMes){
        return res.send('Missing '+errMes);
      }
      const reply = await ReplyModel.findById(reply_id);
      if(!reply){
        return res.send('Reply not found')
      }
      const result = brypt.compareSync(delete_password,reply.delete_password)
      if(result){
        reply.text = '[deleted]';
        await reply.save();
        return res.send('success')
      }else{
        return res.send('incorrect password');
      }
    });

};
