const db = require('../config/connection')
const collection = require('../config/collection')
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('../app');
const { CART_COLLECTION, PRODUCT_COLLECTION, WISHLIST_COLLECTION } = require('../config/collection');
const { resolve } = require('express-hbs/lib/resolver');
const Razorpay = require('razorpay');
const instance = new Razorpay({
    key_id: process.env.KEY_ID,
    key_secret: process.env.KEY_SECRET
 });




module.exports = {
    doSignup: (userData) => {
        console.log(userData);
        return new Promise(async (resolve, reject) => {
           try{
            userData.password = await bcrypt.hash(userData.password, 10)
            userData.cpassword = null
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })
           }catch(err){
            reject(err)
           }

        })
    },

    existingUser: (userData) => {
        return new Promise(async(resolve,reject)=>{
            try{
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({email: userData.email,phone:userData.phone})
            if(user){
                resolve({status:false})
            }else{
                resolve({status:true})
            }
            }catch(er){
                reject(err)
            }
        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            try{
                let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email,isBlock:false })
            let blockUser = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email,isBlock:true })
            if (user) {

                bcrypt.compare(userData.password, user.password).then((status) => {
                    console.log(userData);
                    if (status) {
                        console.log('login success')
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed');
                        resolve({ status: false })
                    }

                })
            } else if(blockUser) {
                response.blockStatus = true
                response.status = false
                resolve(response)
               
            }else{
                console.log('login failed')
                resolve({ status: false })
            }
            }catch(err){
                reject(err)
            }
        })

    },

    
    addtoCart:(proId,userId)=>{
        let proObj = {
            item:ObjectId(proId),
            quantity:1,
            "status": 'placed',
            "placed": true,
            "shipped": false,
            "delivered": false,
            "cancelled": false
        }
        return new  Promise(async(resolve,reject)=>{
            try{
                let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if(proExist != -1){
                    db.get().collection(collection.CART_COLLECTION)
                    .updateOne({user:ObjectId(userId),'products.item':ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(CART_COLLECTION).
                updateOne({user:ObjectId(userId)},
                { 
                    $push:{products:proObj}

                 }).then((response)=>{
                    resolve()
                })
            }
            }else{
                let cartObj = {
                    user:ObjectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
            }catch(err){
                reject(err)
            }
        })

    },

    removeCartProduct:(data)=>{
        console.log(data);
        
        return new Promise((resolve,reject)=>{
           try{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:ObjectId(data.cart)},
                {
                    $pull:{products:{item:ObjectId(data.product)}}
                }
            ).then((res)=>{
                resolve(res)
            })
           }catch(err){
            reject(err)
           }
        })
    },

   

    // getCartProducts:(userId)=>{
    //     return new Promise(async(resolve,reject)=>{
    //         try{
    //             let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
    //                 {
    //                     $match:{user:ObjectId(userId)}
    //                 },
    //                 {
    //                     $unwind:'$products'
    //                 },
    //                 {
    //                     $project:{
    //                         item:'$products.item',
    //                         quantity:'$products.quantity'
    //                     }
    //                 },
    //                 {
    //                     $lookup:{
    //                         from:collection.PRODUCT_COLLECTION,
    //                         localField:'item',
    //                         foreignField:'_id',
    //                         as:'product'
    
    //                     }
    //                 },
    //                 {
    //                     $project:{
    //                         item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    //                     }
    //                 },
    //                 {
    //                     $addFields:{
    //                         productTotal:{
    //                             $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }]
    //                         }
    //                     }
    //                 }
    //             ]).toArray()
    //             resolve(cartItems)
    //         }catch(err){
    //             reject(err)
    //         }
    //     })
    // },
    getCartProducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userid) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $addFields: {
                        productTotal: {
                            $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }]
                        }
                    }
                }

            ]).toArray()



            if (cartItems.length > 0) {
                // response.cartItems = true
                response.cartItems = cartItems
                resolve(response)

            } else {
                response.cartEmpty = true
                resolve(response)
            }

        })
    },

    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(cart){
                count = cart.products.length
            }
            resolve(count)
            }catch(err){
                reject(err)
            }
        })
    },

    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart) },
                        {
                            $pull: { products: { item: ObjectId(details.product) } }

                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })

            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) },

                        {
                            $inc: { 'products.$.quantity': details.count }

                        }
                    ).then((response) => {
                        console.log(response, 'response');
                        resolve(true)
                    })
            }

        })

    },
    removeFromCart: (proid, userId) => {
        return new Promise((resolve, reject) => {
            try {
                db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectId(userId) },

                    {

                        $pull: { products: { item: ObjectId(proid) } }
                    }
                ).then((response) => {
                    resolve({ removeProduct: true })
                })

            } catch (err) {
                reject(err)
            }
        })
    },


    // changeProductQuantity:(details)=>{
    //     details.count = parseInt(details.count)
    //     details.quantity = parseInt(details.quantity)
    //     return new Promise((resolve,reject)=>{
    //         try{
    //             if(details.count == -1 && details.quantity == 1){
    //                 db.get().collection(collection.CART_COLLECTION)
    //                 .updateOne({_id:ObjectId(details.cart)},
    //                     {
    //                         $pull:{products:{item:ObjectId(details.product)}}
    //                     }
    //                 ).then((response)=>{
    //                     resolve({removeProduct:true})
    //                 })
    //             }else{
    //                 db.get().collection(collection.CART_COLLECTION)
    //                 .updateOne({_id:ObjectId(details.cart),'products.item':ObjectId(details.product)},
    //                 {
    //                     $inc:{'products.$.quantity':details.count}
    //                 }
    //                 ).then((response)=>{
    //                     resolve({status:true})
    //                 })
    //             }
    //         }catch(err){
    //             reject(err)
    //         }

    //     })
    // },

    // getTotalAmount:(userId)=>{
    //     console.log("UserId"+ userId);
    //     return new Promise(async(resolve,reject)=>{
            
    //         try{
    //             let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
    //                 {
    //                     $match:{user:ObjectId(userId)}
    //                 },
    //                 {
    //                     $unwind:'$products'
    //                 },
    //                 {
    //                     $project:{
    //                         item:'$products.item',
    //                         quantity:'$products.quantity'
    //                     }
    //                 },
    //                 {
    //                     $lookup:{
    //                         from:collection.PRODUCT_COLLECTION,
    //                         localField:'item',
    //                         foreignField:'_id',
    //                         as:'product'
    
    //                     }
    //                 },
    //                 {
    //                     $project:{
    //                         item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    //                     }
    //                 },
    //                 {
    //                     $group:{
    //                         _id:null,
    //                         total:{ $sum: { $multiply:[{$toInt: '$quantity'} , {$toInt:'$product.price'} ]}}
    //                     }
    //                 },
    //             ]).toArray()
    
                
    //             if(total.length==0){
    //                 resolve(total) 
    //             }else{
    //                 resolve(total[0].total)
    //             }
    //         }catch(err){
    //             reject(err)
    //         }

           
    //     })
    // },
    getTotalAmount: (userId) => {
        console.log("UserID",userId)
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: [{ $toInt: '$quantity' }, { $toInt: '$product.price' }] } }
                    }
                }

            ]).toArray()
            if (total[0]) {
                resolve(total[0].total)
            } else {
                resolve()
            }
        })


    },
    
    addToWishlist:(proId,userId)=>{
        let proObj = {
            item:ObjectId(proId)
        }

        return new Promise(async(resolve,reject)=>{

            try{
                let userList = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user:ObjectId(userId)})
                if(userList){ 
    
                    let prodExist = userList.products.findIndex(product => product.item == proId)
    
                    if(prodExist != -1){
                        console.log("XXXXXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXX XXXXXXXXXXXXXXXXX")
                        db.get().collection(collection.WISHLIST_COLLECTION)
                        // .updateOne({user:ObjectId(proId)},
                        .updateOne({user:ObjectId(userId)},
                            {
                                $pull:{products:{item:ObjectId(proId)}}
                            }
                        ).then(()=>{
                            resolve({status:false})
                        })
                    }else{
                        db.get().collection(collection.WISHLIST_COLLECTION)
                        .updateOne({user:ObjectId(userId)},
                            {
                                $push:{products:proObj}
                            }
                        ).then((response)=>{
                            resolve({status:true})
                        })
                    }
                }else{
                    let listObj = {
                        user:ObjectId(userId),
                        products:[proObj]
                    }
                    db.get().collection(collection.WISHLIST_COLLECTION).insertOne(listObj).then((response)=>{
                        resolve({status:true})
                    })
                }
            }catch(err){
                reject(err)
            }
           
        })
    },

    

    getWishlistProducts:(userId)=>{
        console.log(userId)
        return new Promise(async(resolve,reject)=>{
            try{
                let listItems = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                    {
                        $match:{user:ObjectId(userId)}
                    },
                    {
                        $unwind:'$products'
                    },
                    {
                        $project:{item:'$products.item'}
                    },
                    {
                        $lookup:{
                            from:PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as:'product'
                        }
                    },{
                        $project:{
                            item:1,product:{$arrayElemAt:['$product',0]}
                        }
                    }
                ]).toArray()
                // console.log("%%%List "+listItems[0])
                resolve(listItems)
            }catch(err){
                reject(err)
            }
        })
    },


    getListCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                let listCount = 0
            let list = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({user:ObjectId(userId)})
            if(list){
                listCount = list.products.length
            }
            resolve(listCount)
            }catch(err){
                reject(err)
            }
        })
    },


    removeWishlistProduct:(data)=>{
        // console.log(data);
        return new Promise((resolve,reject)=>{
           try{
            db.get().collection(collection.WISHLIST_COLLECTION)
            .updateOne({_id:ObjectId(data.wishlist)},
            {
                $pull:{products:{item:ObjectId(data.product)}}
            }
            ).then((response)=>{
                resolve({removeProduct:true})
        })
           }catch(err){
            reject(err)
           }
        })
    },
   

    placeOrder:(order,products,totalAmount,coupen,userId)=>{
        function formatDate(date) {
            var d = new Date(date),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();
          
            if (month.length < 2) 
                month = '0' + month;
            if (day.length < 2) 
                day = '0' + day;
          
            return [day, month, year].join('/');
        }
        return new Promise((resolve,reject)=>{
            try{
                // console.log(order,products,total);
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails : {
                    name:order.name,
                    phone:order.phone,
                    email:order.email,
                    buildingName:order.buildingName,
                    city:order.city,
                    pin:order.pin,
                    state:order.state,
                    country:order.country,
                    totalAmount:order.GrandTotal,
                    discountPercentage:parseInt(order.percentage),
                    discount:parseInt(order.discount),
                    
                    
                },
                userId:ObjectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:totalAmount,
                status:status,
                date: formatDate(new Date()),
                time: new Date().getTime()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                console.log("Prrrrrr",response)
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:ObjectId(order.userId)})
                resolve(response.insertedId)
            })
            if(coupen){
                db.get().collection(collection.COUPON_COLLECTION).updateOne({code:coupen.code},
                    {
                        $push:{'users':ObjectId(userId)}
                    }
                )
            }
            }catch(err){
                reject(err)
            }
        })
       
    },


    getCartProductsList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            // console.log(cart);
            resolve(cart.products)
            }catch(err){
                reject(err)
            }

        })
    },




    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                console.log(userId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    '$match': {
                      'userId':  ObjectId(userId)
                    }
                  }, {
                    '$unwind': {
                      'path': '$products'
                    }
                  }, {
                    '$lookup': {
                      'from': 'products', 
                      'localField': 'products.item', 
                      'foreignField': '_id', 
                      'as': 'productDetails'
                    }
                  }, {
                    '$project': {
                      'deliveryDetails': 1,
                      'paymentMethod':1,
                      'date':1,
                      'time':1,
                      'status':1, 
                      'products': 1, 
                      'productDetails': 1
                    }
                  },
                  {
                      $unwind:'$productDetails'
                  },
                  {
                      $project:{
                          'deliveryDetails':1,
                          'paymentMethod':1,
                          'date':1,
                          'time':1,
                          'status':1, 
                          'products':1,
                          'productDetails':1
                      }
                  },
                  {
                    $sort:{
                       
                        time:-1
                    }
                  }
            ]).toArray()
            console.log(orders);
            resolve(orders)
            }catch(err){
                reject(err)
            }
        })
    },

    
    orderInfo:(proId,orderId)=>{
        console.log(proId)
        console.log(orderId)
        return new Promise(async(resolve,reject)=>{
            try{
                console.log("VVVVVVVVVVVV");
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    '$match': {
                    '_id':   ObjectId(orderId)
                    }
                }, {
                    '$unwind': {
                    'path': '$products'
                    }
                }, {
                    '$match': {
                    'products.item':  ObjectId(proId)
                    }
                }, {
                    '$project': {
                    'paymentMethod': 1, 
                    'products': 1, 
                    'date': 1,
                    'status': 1,
                    'placed' : 1,
                    'shipped' : 1,
                    'delivered' : 1
                    }
                }, {
                    '$lookup': {
                    'from': 'products', 
                    'localField': 'products.item', 
                    'foreignField': '_id', 
                    'as': 'productDetails'
                    }
                }, {
                    '$unwind': {
                    'path': '$productDetails'
                    }
                },
                {
                    '$project': {
                        '_id': 1,
                        'paymentMethod': 1,
                        'products.quantity': 1,
                        'products.status': 1,
                        'products.placed': 1,
                        'products.shipped': 1,
                        'products.delivered': 1,
                        'products.deliveryDate': 1,
                        'products.cancelled': 1,
                        'date': 1,
                        'productDetails': 1,
                        'status': 1,
                    }
                }
            ]).toArray()
            console.log('FFFFFFFFF')
            resolve(orders[0])
            }catch(err){
                reject(err)
            }
        })
    },


    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
           try{
             // var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })
             var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
            };
            instance.orders.create(options, function (err, order) {
                console.log("GHGHGHG   +++  ===  ",order);
                if (err) {
                    console.log(err);
                } else {
                    resolve(order)
                }
            });
           }catch(err){
            reject(err)
           }
        })
    },

    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
           try{
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', '0g7mUf17hQbzAyAL8EezXSoC')
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex')
            if(hmac == details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
           }catch(err){
            reject(err)
           }
        })
    },

    changePaymentStatus:(orderId)=>{
        console.log("Order_________________ID",orderId)
        return new Promise((resolve,reject)=>{
           try{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
           }catch(err){
            reject(err)
           }
        })
    },


    getUserData:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(userId)})
            resolve(user)
            }catch(err){
                reject(err)
            }
        })
    },

    updateProfile:(data,userId)=>{
        if(data.gender === 'male'){
            Radio = true
        }else{
            Radio = false
        }
        return new Promise((resolve,reject)=>{
            try{
                db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId)},
                {
                    $set:{
                        name:data.name,
                        gender:data.gender,
                        radio:Radio
                    }
                }
            )
            resolve()
            }catch(err){
                reject(err)
            }
        })
    },
    addAddress:(data,userId)=>{
        console.log("DATA ",data)
        let addressObj = {
            name:data.name,
            phone:data.phone,
            email:data.email,
            buildingName:data.buildingName,
            city:data.city,
            pin:data.pin,
            state:data.state,
            country:data.country,
            time:Date.now()
        }
        return new Promise(async(resolve,reject)=>{
            try{
                let userAddress = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({user:ObjectId(userId)})
            if(userAddress){
                db.get().collection(collection.ADDRESS_COLLECTION)
                .updateOne({user:ObjectId(userId)},
                    {
                        $push:{address:addressObj}
                    }
                ).then((response)=>{
                    resolve()
                })
            }else{
                let Obj = {
                    user:ObjectId(userId),
                    address:[addressObj]
                }
                db.get().collection(collection.ADDRESS_COLLECTION)
                .insertOne(Obj).then(()=>{
                    resolve()
                })
            }
            }catch(err){
                reject(err)
            }
        })
    },


    getUserAddress:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            try{
                let address = await db.get().collection(collection.ADDRESS_COLLECTION).findOne({user:ObjectId(userId)})
            resolve(address)
            }catch(err){
                reject(err)
            }
        })
    },

    cancelOrder:(orderId,proId)=>{
        console.log("OrderID",orderId)
        return new Promise(async(resolve,reject)=>{
           try{
            let product = await db.get().collection(collection.ORDER_COLLECTION).updateOne(
                {_id:ObjectId(orderId),'products.item':ObjectId(proId)}, {
                    $set:{
                        "products.$.cancelled": true,
                        "products.$.placed": false,
                        "products.$.shipped": false,
                        "products.$.delivered": false,
                        "products.$.status": 'cancelled'
                    }
                }
            )
            console.log("&&&&&&&&&")
            resolve(product)
           }catch(err){
            reject(err)
           }
        })
       
    },

    // deleteAddress:(time,addressId)=>{
    //     db.get().collection(collection.ADDRESS_COLLECTION).updateOne({'address.time':time},
    //         {
    //             $pull:{'address.time':time}
    //         }
    //     ).then((response)=>{
    //         resolve(response)
    //     })
    // }



    
   

    

}



