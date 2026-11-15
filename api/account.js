import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method!=='POST') return res.status(405).end();
  const { operation, name, pin } = req.body ?? {};
  const handle = typeof name==='string' ? name.trim() : '';
  if (!['create','login'].includes(operation) || handle.length<2 || handle.length>60 ||
      typeof pin!=='string' || !/^\d{4}$/.test(pin)) return res.status(400).json({error:'Enter a name and four-digit MPIN'});
  const secret=process.env.OPUS_MPIN_SECRET;
  if (!secret) return res.status(503).end();
  const normalized=handle.toLowerCase().replace(/^@/,'');
  if(operation==='login' && !/^[a-z0-9]{2,60}$/.test(normalized)) return res.status(400).json({error:'Enter a valid username'});
  const ip = (req.headers['x-vercel-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
  const credential=createHmac('sha256',secret).update('pin:'+pin).digest('hex');
  const bucket=createHmac('sha256',secret).update('ip:'+ip).digest('hex');
  const db=createClient(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
  const result=await db.rpc('opus_mpin',{secret,operation,handle:operation==='login'?normalized:handle,credential,bucket});
  if(result.error) return res.status(503).json({error:'Account service is unavailable'});
  if(result.data.status==='limited') return res.status(429).json({error:'Too many attempts. Try again later.'});
  if(result.data.status!=='ok') return res.status(401).json({error:'Username or MPIN is incorrect'});
  const auth=await db.auth.signInWithPassword({email:result.data.email,password:credential});
  if(auth.error) return res.status(503).json({error:'Could not start your session'});
  const {access_token,refresh_token}=auth.data.session;
  return res.json({username:result.data.username,access_token,refresh_token});
}
