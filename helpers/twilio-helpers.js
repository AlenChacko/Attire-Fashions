 //accountSid, authToken
const  client = require('twilio')(process.env.ACCOUNT_SID,process.env.AUTH_TOCKEN);
const serviceSid = process.env.SERVICE_SID    

module.exports={
    doSms:(noData)=>{
        let res={}
        return new Promise(async(resolve,reject)=>{
           try{
            await client.verify.services(serviceSid).verifications.create({
                to :`+91${noData.phone}`,
                channel:"sms"
            }).then((res)=>{
                res.valid=true;
                resolve(res)
                // console.log(res);
            })
           }catch(err){
            reject(err)
           }
        })
    },
    otpVerify:(otpData,nuData)=>{
        console.log(nuData);
        let resp={}

        // console.log(otpData.otp);
        // console.log(nuData.phone);
        return new Promise(async(resolve,reject)=>{
            try{
                await client.verify.services(serviceSid).verificationChecks.create({
                    to:   `+91${nuData.phone}`,
                    code:otpData.otp
                }).then((resp)=>{
                     console.log("verification success");
                    resolve(resp)
                })
            }catch(err){
                reject(err)
            }
        })
    }

   

 }
    