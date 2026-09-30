import 'dotenv/config';import express from 'express';import cors from 'cors';import mongoose from 'mongoose';import jwt from 'jsonwebtoken';
const {MONGO_URI,JWT_SECRET,ADMIN_EMAIL,ADMIN_PASSWORD,PORT=5000}=process.env;
const FREE_SHIP=5000,SHIP=150;
const mk=(n,d,o)=>mongoose.model(n,new mongoose.Schema(d,{timestamps:true,...o}));
const Product=mk('Product',{name:String,category:String,price:Number,mrp:Number,hot:{type:Boolean,default:false},moq:{type:Number,default:1},fabric:String,work:String,rating:{type:Number,default:4.5},badge:String,image:String,active:{type:Boolean,default:true}});
const Order=mk('Order',{orderNo:String,customer:{name:String,phone:String,email:String,address:String,city:String,pincode:String},items:[{product:String,name:String,price:Number,qty:Number,image:String}],subtotal:Number,shipping:Number,total:Number,payment:String,status:{type:String,default:'placed'}});
const Inquiry=mk('Inquiry',{name:String,phone:String,email:String,collection:String,message:String,status:{type:String,default:'new'}},{strict:true});
const Post=mk('Post',{title:String,excerpt:String,body:String,image:String,author:{type:String,default:'XYZ'}});
const Sub=mk('Subscriber',{email:{type:String,unique:true}});
const M={products:Product,orders:Order,inquiries:Inquiry,subscribers:Sub,posts:Post};
const auth=(q,s,n)=>{try{jwt.verify((q.headers.authorization||'').replace('Bearer ',''),JWT_SECRET);n()}catch{s.status(401).json({error:'Unauthorized'})}};
const mod=(q,s,n)=>M[q.params.m]?n():s.sendStatus(404);
const app=express();app.use(cors({origin:['http://localhost:5173','https://xyz-company-one.vercel.app']}),express.json());
const wrap=f=>(q,s)=>f(q,s).catch(e=>s.status(400).json({error:e.message}));
app.post('/api/login',(q,s)=>q.body.email===ADMIN_EMAIL&&q.body.password===ADMIN_PASSWORD?s.json({token:jwt.sign({a:1},JWT_SECRET,{expiresIn:'7d'})}):s.status(401).json({error:'Wrong email or password'}));
app.get('/api/products',wrap(async(q,s)=>s.json(await Product.find({active:true}).sort('createdAt'))));
app.get('/api/posts',wrap(async(q,s)=>s.json(await Post.find().sort('-createdAt'))));
app.post('/api/orders',wrap(async(q,s)=>{const{customer:c={},items=[],payment='COD'}=q.body;
if(!c.name||!c.phone||!c.address||!c.city||!c.pincode)throw new Error('Please fill all delivery details');if(!items.length)throw new Error('Cart is empty');
const list=[];for(const it of items){const p=await Product.findById(it.id);if(!p||!p.active)throw new Error('A product in your cart is no longer available');const qty=Math.floor(+it.qty);if(!(qty>=p.moq))throw new Error(`${p.name}: minimum order is ${p.moq} pcs`);list.push({product:p.id,name:p.name,price:p.price,qty,image:p.image})}
const subtotal=list.reduce((a,i)=>a+i.price*i.qty,0),shipping=subtotal>=FREE_SHIP?0:SHIP;
s.json(await Order.create({orderNo:'XYZ'+Date.now().toString().slice(-8),customer:c,items:list,subtotal,shipping,total:subtotal+shipping,payment}))}));
app.post('/api/inquiries',wrap(async(q,s)=>{const{name,phone}=q.body;if(!name||!phone)throw new Error('Name and phone required');s.json(await Inquiry.create(q.body))}));
app.post('/api/subscribe',wrap(async(q,s)=>{await Sub.updateOne({email:q.body.email},{email:q.body.email},{upsert:true});s.json({ok:1})}));
app.get('/api/admin/stats',auth,wrap(async(q,s)=>{const r=await Order.aggregate([{$match:{status:{$ne:'cancelled'}}},{$group:{_id:null,t:{$sum:'$total'}}}]);s.json({products:await Product.countDocuments(),orders:await Order.countDocuments(),newOrders:await Order.countDocuments({status:'placed'}),inquiries:await Inquiry.countDocuments({status:'new'}),subscribers:await Sub.countDocuments(),revenue:r[0]?.t||0})}));
app.post('/api/admin/:m',auth,mod,wrap(async(q,s)=>s.json(await M[q.params.m].create(q.body))));
app.get('/api/admin/:m',auth,mod,wrap(async(q,s)=>s.json(await M[q.params.m].find().sort('-createdAt'))));
app.patch('/api/admin/:m/:id',auth,mod,wrap(async(q,s)=>s.json(await M[q.params.m].findByIdAndUpdate(q.params.id,{$set:q.body},{new:true}))));
app.delete('/api/admin/:m/:id',auth,mod,wrap(async(q,s)=>{await M[q.params.m].findByIdAndDelete(q.params.id);s.json({ok:1})}));
await mongoose.connect(MONGO_URI);
const u=i=>`https://images.unsplash.com/${i}?auto=format&fit=crop&w=800&q=80`;
if(!await Product.countDocuments()){await Product.insertMany([
['Designer Roman Silk Embroidered Festive Wear Suit Set','Readymade Suits',6495,7795,1,'/media/suit-red.jpg','Roman Silk','Embroidery'],
['Party Wear Two Tone Roman Silk Suit','Readymade Suits',6625,7950,1,'/media/suit-teal.jpg','Roman Silk','Two Tone'],
['Festive Roman Silk Plazo Suit With Dupatta','Readymade Suits',6495,7795,1,'/media/suit-blue.jpg','Roman Silk','Plazo Set'],
['Mull Chanderi Handwork Designer Suit With Roman Silk','Readymade Suits',6250,7500,1,'photo-1612423284934-2850a4ea6b0f','Mull Chanderi','Handwork'],
['Printed Co-ord Set (sample)','Co-ord Sets',899,0,0,'/media/coord.jpg','Linen Blend','Printed'],
['Festive Kaftan (sample)','Kaftans',980,0,0,'/media/kaftan.jpg','Georgette','Embroidery'],
['Printed Western Top (sample)','Tops & Western',380,0,0,'/media/tops.jpg','Satin','Printed'],
['Rayon Printed Kurti (sample)','Kurtis',315,0,0,'photo-1591369822096-ffd140ec948f','Rayon','Printed']
].map(([name,category,price,mrp,hot,i,fabric,work])=>({name,category,price,mrp,hot:!!hot,moq:hot?1:3,image:i.startsWith('/')?i:u(i),fabric,work,rating:4.7,badge:hot?'Hot Selling':''})))}
if(!await Post.countDocuments())await Post.insertMany([
{title:'Navigating the World of Seasonal Fashion',excerpt:'How retailers can plan stock around seasons, festivals and wedding months.',image:'/media/tops.jpg',body:'Seasonal buying decides how fast your stock moves. Plan light cottons and rayon for summer, richer silks and embroidery ahead of festive and wedding months, and reorder best sellers early so you never run out during peak demand.'},
{title:'The Evolution of Ladies Garments: From Traditional Kurtis to Modern Co-Ords',excerpt:'A look at how everyday ethnic wear evolved into modern matching sets.',image:'/media/coord.jpg',body:'Kurtis remain a daily staple, but co-ord sets, kaftans and fusion silhouettes now sit next to them on every shelf. Retailers who mix both styles cater to traditional and modern buyers at once.'}]);
app.listen(PORT,()=>console.log('API on '+PORT));
