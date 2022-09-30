const { resolve } = require("express-hbs/lib/resolver")
const { Db } = require("mongodb")

module.exports = {
    isBlocked :(req,res,next)=>{
        if(req.session.loggedIn){
            new Promise(async(resolve,reject)=>{
                var user = await Db.findOne({email:req.session.isBlock})
                req.session.user_id = user.user_id
                resolve(user)
            }).then((user)=>{
                console.log("UserBlock Check @@@")
                if(user.isBlock){
                    res.render('blocked',{layout:'block-layout'})
                }else{
                    next()
                }
            })
        }else{
            next()
        }
    }
}