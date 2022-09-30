
var express = require('express');
const { response } = require('../app');
var router = express.Router();
const adminHelper = require('../helpers/admin-helper');
const productHelper = require('../helpers/product-helper');
const userHelpers = require('../helpers/user-helpers')

const verifyLogin = function (req, res, next) {
  if (req.session.adminLoggedIn) {
    next()
  } else {
    res.redirect('/admin')
  }
}


// router.get('/',  function (req, res, next) {
//   try{
//     if (req.session.adminLoggedIn) {
//       res.render('admin/adminhome', { layout: 'admin-layout', admin: true })
//     } else {
//       res.render('admin/adminlogin', { loginErr: req.session.loginErr, layout: 'admin-layout' })
//       req.session.loginErr = false
//     }
//   }catch(err){
//     next(err)
//   }
// });


router.get('/', async function (req, res, next) {
 
    try{
      if (req.session.adminLoggedIn) {
        let delivery = {}
        delivery.pending = 'pending'
        delivery.Placed = 'placed'
        delivery.Shipped = 'shipped'
        delivery.Delivered = 'delivered'
        delivery.Cancelled = 'cancelled'
        const allData = await Promise.all
          ([
            adminHelper.onlinePaymentCount(),
            adminHelper.totalUsers(),
            adminHelper.totalOrder(),
            adminHelper.cancelOrder(),
            adminHelper.totalCOD(),
            adminHelper.totalDelivered(),
            adminHelper.totalDeliveryStatus(delivery.Placed),
            adminHelper.totalDeliveryStatus(delivery.Shipped),
            adminHelper.totalDeliveryStatus(delivery.Delivered),
            adminHelper.totalDeliveryStatus(delivery.Cancelled),
          ])
        res.render('admin/adminhome', {
          layout: 'admin-layout', admin: true,
  
          OnlinePaymentcount: allData[0],
          totalUser: allData[1],
          totalOrder: allData[2],
          cancelOrder: allData[3],
          totalCod: allData[4],
          totalDelivered: allData[5],
          Placed: allData[6],
          Shipped: allData[7],
          Delivered: allData[8],
          Cancelled: allData[9]
  
        })
      } else {
        res.render('admin/adminlogin', { loginErr: req.session.loginErr,layout:'admin-layout' })
        req.session.loginErr = false
      }
    }catch(err){
      next(err)
    }
 
});



router.post('/adminlogin', (req, res, next) => {
 
   try{
    adminHelper.adminLogin(req.body).then((response) => {
      console.log('jjjjjjjjjjjjjjjj');
      console.log(response);
  
      if (response.status) {
        req.session.adminLoggedIn = true
        req.session.admin = response.admin
        res.redirect('/admin')
      } else {
        req.session.loginErr = "Invalid input"
        res.redirect('/admin')
      }
    })
   }catch(err){
    next(err)
   }
 

})



router.get('/userdetails', (req, res, next) => {
 try{
  adminHelper.getAllUsers().then((userdetails) => {
    if (req.session.adminLoggedIn) {
      res.render('admin/userdetails', { layout: 'admin-layout', admin: true, userdetails })
    } else {
      res.redirect('/admin')
    }
  })
 }catch(err){
  next(err)
 }
})


router.get('/adminhome', (req, res, next) => {
  try{
    res.redirect('/admin')
  }catch (err){
    next(err)
  }
})


router.get('/block-user/:id', (req, res, next) => {
  try{
    if (req.session.adminLoggedIn) {
      adminHelper.blockAuser(req.params.id).then((response) => {
        res.redirect('/admin/userdetails')
      })
    } else {
      res.redirect('/admin')
    }
  }catch(err){
    next(err)
  }
})

router.get('/unblock-user/:id', (req, res, next) => {
  try{
    adminHelper.unblockUser(req.params.id).then((response) => {
      res.redirect('/admin/userdetails')
    })
  }catch(err){
    next(err)
  }
})


router.get('/logout', (req, res, next) => {
 try{
  req.session.destroy()
  res.redirect('/admin')
 }catch(err){
  next(err)
 }
})


router.get('/productdetails', (req, res, next) => {
  try{
    productHelper.getAllProducts().then((products) => {
      if (req.session.adminLoggedIn) {
        res.render('admin/productDetails', { layout: 'admin-layout', admin: true, products })
      } else {
        res.redirect('/admin')
      }
    })
  }catch(err){
    next(err)
  }
})

router.get('/addproducts', async (req, res, next) => {
  try{
    if (req.session.adminLoggedIn) {
      let category = await productHelper.viewCategory()
      res.render('admin/addProduct', { layout: 'admin-layout', admin: true, category })
    } else {
      res.redirect('/admin')
    }
  }catch(err){
    next(err)
  }
})

router.post('/addproducts', (req, res, next) => {

  try{
    console.log(req.body);
  productHelper.addProduct(req.body).then((id) => {
    console.log("FFFFFFFFFF");
    console.log(id);
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.redirect('/admin/productDetails')
      } else {
        console.log(err);
      }
    })
  })
  }catch(err){
    next(err)
  }
})


router.get('/editproduct/:id', (req, res, next) => {
  try{
    productHelper.editProduct(req.params.id).then((products) => {
      productHelper.viewCategory().then((category) => {
        if (req.session.adminLoggedIn) {
          res.render('admin/editProduct', { products, layout: 'admin-layout', admin: true, category })
        } else {
          res.redirect('/admin')
        }
      })
    })
  }catch(err){
    next(err)
  }
})


router.post('/editProducts/:id', (req, res, next) => {
  try{
    productHelper.updateProduct(req.params.id, req.body).then(() => {
      if (req.session.adminLoggedIn) {
        let image = req.files.Image
        let id = req.params.id
        image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
          if (!err) {
            res.redirect('/admin/productDetails')
          } else {
            console.log(err);
          }
        })
      } else {
        res.redirect('/admin')
      }
    })
  }catch(err){
    next(err)
  }
})

router.get('/deleteproduct/:id', (req, res, next) => {
  try{
    productHelper.deleteProduct(req.params.id).then(() => {
      if (req.session.adminLoggedIn) {
        res.redirect('/admin/productDetails')
      } else {
        res.redirect('/admin')
      }
    })
  }catch(err){
    next(err)
  }
})

router.get('/category', (req, res, next) => {
 try{
  productHelper.viewCategory().then((category) => {
    if (req.session.adminLoggedIn) {
      res.render('admin/category', { layout: 'admin-layout', admin: true, category })
    } else {
      res.redirect('/admin')
    }
  })
 }catch(err){
  next(err)
 }
})


router.get('/addcategory', (req, res, next) => {
  try{
    if (req.session.adminLoggedIn) {
      res.render('admin/addcategory', { layout: 'admin-layout', admin: true, categoryErr: req.session.categoryErr })
      req.session.categoryErr = false
    } else {
      res.redirect('/admin')
    }
  }catch(err){
    next(err)
  }
})


router.post('/addcategory', (req, res, next) => {
  try{
    productHelper.existingCategory(req.body).then((response) => {
      console.log(req.body);
      if (response.status) {
        productHelper.addCategory(req.body).then(() => {
          if (req.session.adminLoggedIn) {
            res.redirect('/admin/category')
          } else {
            res.redirect('/admin')
          }
        })
      } else {
        req.session.categoryErr = "This Category already added"
        res.redirect('/admin/addcategory')
      }
    })
  }catch(err){
    next(err)
  }
})


router.get('/deletecategory/:id', (req, res, next) => {
  try{
    productHelper.deleteCategory(req.params.id).then(() => {
      if (req.session.adminLoggedIn) {
        res.redirect('/admin/category')
      } else {
        res.redirect('/admin')
      }
    })
  }catch(err){
    next(err)
  }
})



router.get('/view-banner',verifyLogin,(req,res,next)=>{
  try{
    adminHelper.getBanner().then((banner) => {
      res.render('admin/view-banner',{layout:'admin-layout',admin:true, banner:true, banner})
      })
  }catch(err){
    next(err)
  }
})

router.get('/add-banner',verifyLogin,(req,res,next)=>{
 try{
  res.render('admin/add-banner',{layout:'admin-layout',admin:true,banner:true})
 }catch(err){
  next(err)
 }
})


router.post('/add-banner',(req,res,next)=>{
  try{
    adminHelper.addBanner(req.body).then((id)=>{
      let image = req.files.Image;
      image.mv('./public/banner-images/' + id + '.jpg', (err,done)=>{
        if(!err){
          res.redirect('/admin/view-banner')
        }else{
          console.log(err);
        }
      })
    })
  }catch (err){
    next(err)
  }
})


router.get('/edit-banner/:id',verifyLogin,async(req,res,next)=>{
  try{
    let bannerDetails = await adminHelper.getBannerDetails(req.params.id)
  res.render('admin/edit-banner',{layout:'admin-layout',admin:true,bannerDetails, banner: true})
  }catch(err){
    next(err)
  }
})


router.post('/edit-banner/:id', (req, res, next) => {
    try{
      adminHelper.updateBanner(req.body, req.params.id).then(() => {
     
        // if (req.files.Image) {
        //   let image = req.files.Image
        //   let id = req.params.id
        //   image.mv('./public/banner-images/' + id + '.jpg')
        // }
        // res.redirect('/admin/view-banner')
        if (req.session.adminLoggedIn) {
          let image = req.files.Image;
          console.log("Image ",image)
          let id = req.params.id
          console.log("ID____",req.params.id)
          image.mv('./public/banner-images/' + id + '.jpg', (err, done) => {
            if (!err) {
              res.redirect('/admin/view-banner')
            } else {
              console.log(err);
            }
          })
        } else {
          res.redirect('/admin')
        }
      })
    }catch(err){
      next(err)
    }
})


router.get('/delete-banner/:id', (req, res, next) => {
  try{
    adminHelper.deleteBanner(req.params.id).then(() => {
      res.redirect('back')
    })
  }catch(err){
    next(err)
  }
})


router.get('/view-orders',verifyLogin,async(req,res,next)=>{
 try{
  let orders = await adminHelper.viewOrders()
  let orderStatus = await adminHelper.viewStatus()
  console.log(orders);
  res.render('admin/view-orders',{layout:'admin-layout',admin:true,orders,orderStatus})
 }catch(err){
  next(err)
 }
})


router.get('/changeStatus/:id/:pd/:status',(req,res,next)=>{
  try{
    console.log(req.params.id);
    req.session.orderId = req.params.id
  adminHelper.changeStatus(req.params.id,req.params.pd,req.params.status).then(()=>{
    res.redirect('/admin/view-orders')
  })
  }catch (err){
    next(err)
  }
})

router.get('/cancelOrder/:id/:pd',(req,res,next)=>{
 try{
  userHelpers.cancelOrder(req.params.id,req.params.pd).then(()=>{
    res.redirect('back')
  })
 }catch(err){
  next(err)
 }
})









router.get('/add-coupon',verifyLogin,(req,res,next)=>{
 try{
  res.render('admin/add-coupon',{layout:'admin-layout',admin:true})
 }catch(err){
  next(err)
 }
})



router.post('/add-coupon',(req,res,next)=>{
 try{
  adminHelper.addCoupon(req.body).then((response)=>{
    console.log("Adding coupon",req.body)
    res.redirect('/admin/view-coupon')
  })
 }catch(err){
  next(err)
 }
})

router.get('/view-coupon',verifyLogin,async(req,res,next)=>{
  // adminHelper.getCoupon().then((coupon)=>{
  //   res.render('admin/view-coupons',{layout:'admin-layout',admin:true,coupon})
  // })
 try{
  let allCoupen = await adminHelper.getCoupon()
  res.render('admin/view-coupons',{layout:'admin-layout',admin:true,allCoupen})
 }catch(err){
  next(err)
 }
  
})

router.get('/edit-coupon/:id',verifyLogin,async(req,res,next)=>{
 try{
  let couponDetails = await adminHelper.getCouponDetails(req.params.id)
  res.render('admin/edit-coupon',{layout:'admin-layout',admin:true,couponDetails})
 }catch(err){
  next(err)
 }
})

router.post('/edit-coupon/:id',verifyLogin,(req,res,next)=>{
  try{
    adminHelper.updateCoupon(req.body,req.params.id).then(()=>{
      res.redirect('/admin/view-coupon')
    })
  }catch(err){
    next(err)
  }
})

router.get('/delete-coupon/:id',verifyLogin,(req,res,next)=>{
 try{
  adminHelper.deleteCoupon(req.params.id).then(()=>{
    res.redirect('/admin/view-coupon')
  })
 }catch(err){
  next(err)
 }
})


/*


router.get('/delete-banner/:id', (req, res, next) => {
  try{
    adminHelper.deleteBanner(req.params.id).then(() => {
      res.redirect('back')
    })
  }catch(err){
    next(err)
  }
})

*/


module.exports = router;
