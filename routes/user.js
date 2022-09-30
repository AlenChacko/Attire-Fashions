const express = require('express');
const session = require('express-session');
const twilio = require('twilio');
const productHelper = require('../helpers/product-helper');
const twilioHelpers = require('../helpers/twilio-helpers');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers')
const adminHelper = require('../helpers/admin-helper')
const { resolve } = require('express-hbs/lib/resolver');
const swal = require('sweetalert2');
const { response } = require('../app');
const verifyLogin=function(req,res,next){
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/')
  }
}

// const blockCheck = function(req,res,next){
//   if(req.session.loggedIn){
//     userHelpers.blockOrNot(user._id).then((response)=>{
//       if(res.status){
//         res.render('users/user-blocked')
//         req.session.destroy()
//         user = null
//       }else{
//         next()
//       }
//     })
//   }else{
//     res.redirect('/')
//   }
// }


/* GET home page. */
router.get('/', async function(req, res, next) {
  try{
  let user = req.session.user
  let category = await productHelper.viewCategory() 
  let banner = await adminHelper.getBanner()
  console.log("********",banner)
  let cartCount = null;
  let wishCount = null;
  if(req.session.user){
     cartCount = await userHelpers.getCartCount(req.session.user._id)
     wishCount = await userHelpers.getListCount(req.session.user._id)
  }
  productHelper.getAllProducts().then(async(products) => {
  res.render('users/home',{user,layout:'user-layout',users:true,category,cartCount,products,wishCount,banner});
})
  }catch (err){
    next(err)
  }
});




// GET login page
router.get('/login',(req,res,next)=>{
  try{
    if(req.session.loggedIn){
      res.redirect('/')
    }else{
      res.render('users/login',{loginErr:req.session.loginErr,layout:'user-layout'})
      req.session.loginErr = false
  
    }
  }catch (err){
    next(err)
  }
  
})





// POST login and redirecting to user home page
router.post('/login',(req,res,next)=>{
  try{
    userHelpers.doLogin(req.body).then((response)=>{
      if(response.status){
        req.session.loggedIn = true
        req.session.user = response.user
        res.redirect('/')
      }else{
        if(response.blockStatus){
          req.session.loginErr = "You were blocked by the admin"
          req.session.loggedIn = false
          res.redirect('/login')
        }else{
          req.session.loginErr = "Invalid username or password"
          res.redirect('/login')
        }
      }
    })
  }catch (err){
    next(err)
  }

})





router.get('/logout', (req, res, next) => {
 try{
  req.session.user = null
  req.session.loggedIn = null
  res.redirect('/')
 }catch (err){
  next(err)
 }
})



// GET signup page
router.get('/signup',(req,res,next)=>{
  
 try{
  if(req.session.loggedIn){
    res.redirect('/')
  }else{
    res.render('users/signup',{signupErr:req.session.signupErr,layout:'user-layout'})
    req.session.signupErr = false
  }
 }catch(err){
  next()
 }

})



// Post signup 
router.post('/signup',(req,res,next)=>{
  try{
    userHelpers.existingUser(req.body).then((response)=>{
      if(response.status){
        req.session.signUp = true
        req.session.user = req.body
        num = req.body.phone
        number = num.slice(6)
        console.log(number)
        req.session.number = number
        twilioHelpers.doSms(req.body).then((data)=>{
         
          if(data) {
            req.session.user = req.body
            res.redirect('/otp')
          }else {
            res.redirect('/signup')
          }
        })
      }else{
        req.session.signupErr = "Email or Phone number already registered"
        res.redirect('/signup')
      }
    })
  }catch(err){
    next(err)
  }
  
})

// RESEND otp

// router.get('/resend',(req,res)=>{
//   twilioHelpers.doSms(req.body).then((data)=>{
    
//   })

// })



// GET otp verification page
router.get('/otp',(req,res)=>{
  try{
    if(req.session.loggedIn){
      res.redirect('/')
    }else{
      res.render('users/otp',{otpErr:req.session.otpErr,number:req.session.number,layout:'user-layout'})
      req.session.otpErr = false
    
    }
  }catch(err){
    next(err)
  }
 
})




// OTP verified and redirecting to login page
router.post('/otp',(req,res,next)=>{
   try{
    console.log(req.session.user);
  twilioHelpers.otpVerify(req.body,req.session.user).then((response)=>{
    
    if(response.valid){
      console.log('response.valid');
      req.session.user.isBlock = false
      userHelpers.doSignup(req.session.user).then((response)=>{
        console.log(response)
        res.redirect('/login')
      })

    }else {
      req.session.otpErr = "Invalid OTP, Please try again"
      res.redirect('/otp')
      
    }
  })
   }catch(err){
    next(err)
   }
 
 
})






router.get('/viewproduct/:id',async (req,res,next)=>{
 try{
 let product=await productHelper.viewProduct(req.params.id)
 let category = await productHelper.viewCategory() 
 console.log(product);
 console.log("PRPPPPPPPPPPPPPPPPPPRRRRRRRRRRR");
    let user = req.session.user
    res.render('users/singleProduct',{users:true,layout:'user-layout',product,user,category})
  
 }catch (err){
 
  next(err)
 }
})

router.get('/getproducts/:name',async(req,res,next)=>{
  try{
    let category = await productHelper.viewCategory()
  let user = req.session.user
  productHelper.getProducts(req.params.name).then((product)=>{
    res.render('users/productCategory',{layout:'user-layout',users:true,product,category,user})
  })
  }catch(err){
    next(err)
  }
})



router.get('/addToCart/:id',(req,res,next)=>{
 try{
  console.log('Sadhanam keri');
  userHelpers.addtoCart(req.params.id,req.session.user._id).then(()=>{
    // res.redirect('/')
    res.json({status:true})
  })
 }catch(err){
  next(err)
 }
})


// router.post('/change-product-quantity',(req,res,next)=>{
//  try{
//   userHelpers.changeProductQuantity(req.body).then(async(response)=>{
//     // let user = req.session.user
//     response.total = await userHelpers.getTotalAmount(req.body.user)
//     res.json(response)
//   })
//  }catch(err){
//   next(err)
//  }
// })

router.post('/change-product-quantity', (req, res, next) => {
  try{
    userHelpers.changeProductQuantity(req.body).then((response) => {
      res.json({ response })
    })
  }catch(err){
    next(err)
  }
 
})


router.get('/deletecart/:id', (req, res, next) => {
  try {
    userHelpers.removeFromCart(req.params.id, req.session.user._id).then((response) => {
      res.redirect('/cart')
    })
  } catch (err) {
    next(err)
  }
})



router.post('/remove-cart-product',(req,res,next)=>{
  try{
    console.log(req.body);
  console.log("@@@@@@@@@@@@@@@@@@@@@@");
  userHelpers.removeCartProduct(req.body).then((ress)=>{
    console.log(ress);
    
    res.json({removeProduct:true})
  

  })
  }catch(err){
    next(err)
  }
})





// router.get('/cart',async (req,res,next)=>{
  
//   try{
//     let category = await productHelper.viewCategory() 
//     if(req.session.loggedIn){
//       let coupon = await adminHelper.viewCoupon()
//       let products = await userHelpers.getCartProducts(req.session.user._id)
//       let banner = await adminHelper.getBanner()
//       let user = req.session.user
//       let cartCount = await userHelpers.getCartCount(req.session.user._id)
//       let wishCount = await userHelpers.getListCount(req.session.user._id)
//       let total = await userHelpers.getTotalAmount(req.session.user._id)
//       if(products.length == 0){
//         let cartCount = await userHelpers.getCartCount(req.session.user._id)
//         let wishCount = await userHelpers.getListCount(req.session.user._id)
//         res.render('users/emptycart',{layout:'user-layout',banner,users:true,user,category,cartCount,wishCount})
//       }else{
//         console.log(products);
//         let user2 = req.session.user._id
//         res.render('users/cart',{layout:'user-layout',users:true,products,user,cartCount,total,user2,banner,category,wishCount,coupon})
//       }
     
//     }else{
//       res.redirect('/login')
//     }
//   }catch(err){
//     next(err)
//   }
// })

router.get('/cart', async(req, res,next) => {
  try{
    let banner = await adminHelper.getBanner()
  
  req.session.coupon = null;
  if(req.session.loggedIn){
    let userCoupon = await adminHelper.viewCoupon()
    userHelpers.getCartProducts(req.session.user._id).then(async (response) => {
      let products = response.cartItems
      let cartEmpty = response.cartEmpty
      let user = req.session.user
      let CartCount = await userHelpers.getCartCount(req.session.user._id)
      let WishCount = await userHelpers.getListCount(req.session.user._id)
      let totalAmount = 0
      totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
      console.log(totalAmount,'total');
      res.render('users/cart', { layout:'user-layout',totalAmount, products, user: req.session.user, CartCount, cartEmpty,banner, users:true,WishCount,userCoupon })
    })
  }else{
    res.redirect('/')
  }
  }catch(err){
    next(err)
  }
  

})





router.get('/wishlist',async(req,res,next)=>{
 try{
  let category = await productHelper.viewCategory() 
  if(req.session.loggedIn){
    let products = await userHelpers.getWishlistProducts(req.session.user._id)
    console.log(products)
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let wishCount = await userHelpers.getListCount(req.session.user._id)
    let user = req.session.user
    let banner = await adminHelper.getBanner()
    res.render('users/wishlist',{layout:'user-layout',users:true,products,banner,category,cartCount,wishCount,user})
  }else{
    res.redirect('/')
  }
 }catch(err){
  next(err)
 }
})



router.get('/add-to-wishlist/:id',(req,res,next)=>{

  try{

    if(req.session.loggedIn){
      let p = {}
      console.log(' *** Item added to wishlist ***');
      userHelpers.addToWishlist(req.params.id,req.session.user._id).then((response)=>{
        p.response = response
        res.json(p)
      })
    }

  }catch (err){
  next(err)
  }
  
})




//Remove product from wishlist
router.post('/remove-wishlist-product',(req,res,next)=>{

  try{

    userHelpers.removeWishlistProduct(req.body).then((response)=>{
   
      res.json(response)
    })

  }catch (err){
  next(err)
  }

 
})





router.get('/check-out',verifyLogin,async(req,res,next)=>{
  try{
    let category = await productHelper.viewCategory() 
    let userAddress = await userHelpers.getUserAddress(req.session.user._id)
    let products = await userHelpers.getCartProducts(req.session.user._id)
    
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let wishCount = await userHelpers.getListCount(req.session.user._id)
    
    if(req.session.coupen){
      let coupendiscount = req.session.discount
      let discountPrice = req.session.discountprice
      let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
      res.render('users/checkout',{layout:'user-layout',coupendiscount,discountPrice,users:true,user:req.session.user,totalAmount,products,userAddress,category,cartCount,wishCount})
    }else{
      // let products = response.cartItems
      // console.log(cartItems)
      let totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
      let cartCount = await userHelpers.getCartCount(req.session.user._id)
      let wishCount = await userHelpers.getListCount(req.session.user._id)
      let userAddress = await userHelpers.getUserAddress(req.session.user._id)
      res.render('users/checkout',{layout:'user-layout',users:true,user:req.session.user,totalAmount,products,userAddress,category,cartCount,wishCount})
    }
      
    
    
    
    
    
   
  }catch(err){
    next(err)
  }
  
})

/**
  router.get('/checkout', verifyLogin, async (req, res, next) => {
  try {
    userAddress = await userHelpers.getUserAddress(req.session.user._id)
    user = req.session.user
    let products = await userHelpers.getCartProducts(user._id)
    console.log(products);
    let banner = await adminHelpers.viewBanner()
    if (req.session.coupen) {
      let totalAmount = await userHelpers.getTotalAmount(user._id)
      let coupendiscount = req.session.discount
      let discountPrice = req.session.discountprice
      res.render('users/checkout', { user, totalAmount, products, layout: 'user-layout', users: true, coupendiscount, discountPrice, banner, userAddress })
    } else {
      let totalAmount = await userHelpers.getTotalAmount(user._id)
      res.render('users/checkout', { users: true, layout: 'user-layout', user, products, totalAmount, userAddress, banner })
    }
  } catch (err) {
    next(err)
  }
})
 */



router.post('/place-order',verifyLogin, async(req,res,next)=>{
  try{
    let products = await userHelpers.getCartProductsList(req.body.userId)
    let totalAmount = await userHelpers.getTotalAmount(req.body.userId)
    userHelpers.placeOrder(req.body,products,totalAmount,req.session.coupen,req.session.user._id).then((orderId)=>{
      console.log("OOORRRDDDEEERRR = "+ orderId)
      if(req.body['payment-method'] === 'COD'){
        res.json({CODsuccess:true})
      }else{
        userHelpers.generateRazorpay(orderId,req.body.GrandTotal).then((response)=>{
          res.json(response)
        })
      }
    })
  }catch(err){
    next(err)
  }

})

router.get('/order-success',(req,res,next)=>{
  try{
    if(req.session.loggedIn){
      res.render('users/order-success',{layout:'user-layout'})
    }
  }catch(err){
    next(err)
  }
})

router.get('/myOrders',async(req,res,next)=>{
  try{
    let category = await productHelper.viewCategory() 
    if(req.session.loggedIn){
      let user = req.session.user
      let cartCount = await userHelpers.getCartCount(req.session.user._id)
      let wishCount = await userHelpers.getListCount(req.session.user._id)
      let orders = await userHelpers.getUserOrders(req.session.user._id)
      let total = await userHelpers.getTotalAmount(req.session.user._id)
      // let products = await userHelpers.getOrderItems(req.params.id)
      res.render('users/myorders',{layout:'user-layout',orders,users:true,user,total,category,wishCount,cartCount})
    }
  }catch(err){
    next(err)
  }
})



router.get('/track/:prId/:id',async(req,res,next)=>{
  try{
    let category = await productHelper.viewCategory() 
    console.log("Product Id = " + req.params.prId)
  console.log("User Id = " + req.params.id)
  // let status = userHelpers.deliveryStatus()
    let cartCount = await userHelpers.getCartCount(req.session.user._id)
    let wishCount = await userHelpers.getListCount(req.session.user._id)
  let orders = await userHelpers.orderInfo(req.params.prId,req.params.id)
  res.render('users/orderItems',{layout:'user-layout',users:true,orders,category,wishCount,cartCount})
  }catch(err){
    next(err)
  }
})


router.get('/cancelOrder/:id/:pd', (req, res, next) => {
 try{
  userHelpers.cancelOrder(req.params.id, req.params.pd).then(() => {
    res.redirect('back')
  })
 }catch(err){
  next(err)
 }
})


router.post('/verify-payment',(req,res,next)=>{
 try{
  console.log(req.body)
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log("Online payment Successfull")
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:"Failed"})
  })
 }catch(err){
  next(err)
 }
})


router.get('/profile',async(req,res,next)=>{
  let category = await productHelper.viewCategory() 
  try{
    if(req.session.loggedIn){
      let user = req.session.user
      let cartCount = await userHelpers.getCartCount(req.session.user._id)
      let wishCount = await userHelpers.getListCount(req.session.user._id)
      let userInfo = await userHelpers.getUserData(req.session.user._id)
      res.render('users/userProfile',{layout:'user-layout',users:true,user,userInfo,category,cartCount,wishCount})
      console.log("USERINFO",userInfo)
    }else{
      res.redirect('/')
    }
  }catch(err){
    next(err)
  }
})

router.post('/updateProfile',(req,res,next)=>{
 try{
  userHelpers.updateProfile(req.body,req.session.user._id).then(()=>{
    res.redirect('/profile')
   })
 }catch(err){
  next(err)
 }
})


router.get('/address',async(req,res,next)=>{
  let category = await productHelper.viewCategory() 
  try{
    if(req.session.loggedIn){
      let user = req.session.user
      let userInfo = await userHelpers.getUserData(req.session.user._id)
      let userAddress = await userHelpers.getUserAddress(req.session.user._id)
      let cartCount = await userHelpers.getCartCount(req.session.user._id)
      let wishCount = await userHelpers.getListCount(req.session.user._id)
    res.render('users/manageAddress',{layout:'user-layout',userInfo,userAddress,users:true,category,user,cartCount,wishCount})
    }else{
      res.redirect('/')
    }
  }catch(err){
    next(err)
  }
})



router.post('/add-address',(req,res,next)=>{
  try{
    console.log(req.body)
  if(req.session.loggedIn){
    userHelpers.addAddress(req.body,req.session.user._id).then(()=>{
      res.redirect('/address')
    })
  }
  }catch(err){
    next(err)
  }
})

// router.get('/delete-address/:time', (req, res, next) => {
//     userHelpers.deleteAddress(req.params.time).then((response) => {
//       res.redirect('/address')
//     })
// })



router.post('/profilePhoto',(req,res,next)=>{
  try{
    if(req.session.loggedIn){
      if (req.files.Image) {
        let image = req.files.Image
        let id = req.session.user._id
        image.mv('./public/user-images/' + id + '.jpg')
      }
      res.redirect('/profile')
    }
  }catch(err){
    next(err)
  }
})

router.post('/apply-coupen', (req, res) => {
  // console.log(req.body,'6666')
  try{
    adminHelper.ApplyCoupen(req.body, req.session.user._id).then((response) => {
      console.log(req.body,'1111111')
      if (response.status) {
        console.log('true');
        req.session.coupen = response.coupen
        req.session.discount = response.discount
        //console.log(req.session.discount,' *** *** ***')
        req.session.discountprice=response.discountPrice
        res.json({response})
        //console.log(req.session.discountprice,'^^^ ^^^ ^^^')
        
      }else{
          res.json({response})
       
      }
    
     
    })
  }catch(err){
    next(err)
  }
})









module.exports = router;



