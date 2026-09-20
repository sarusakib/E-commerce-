import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getPlatformFee, quoteShipping } from "@/lib/commerce/core";
import { rateLimit, requestFingerprint } from "@/lib/security/rate-limit";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function send(data:unknown,status:number,headers:Record<string,string>){return NextResponse.json(data,{status,headers});}

export async function POST(request:Request){
  const rl=rateLimit("commerce-quote:"+requestFingerprint(request),30,60000);
  const headers={"X-RateLimit-Limit":String(rl.limit),"X-RateLimit-Remaining":String(rl.remaining),"Retry-After":String(rl.retryAfterSeconds)};
  if(!rl.allowed) return send({error:"Too many quote requests."},429,headers);

  let body:unknown;
  try{body=await request.json();}catch{return send({error:"Invalid JSON body."},400,headers);}
  const input=body as Record<string,unknown>;
  const storeSlug=typeof input.storeSlug==="string"?input.storeSlug.trim().toLowerCase():"";
  const countryCode=typeof input.countryCode==="string"?input.countryCode.trim().toUpperCase():"";
  const subtotal=typeof input.subtotal==="number"?input.subtotal:Number(input.subtotal);
  if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(storeSlug))return send({error:"Invalid store slug."},400,headers);
  if(!/^[A-Z]{2}$/.test(countryCode))return send({error:"Invalid country code."},400,headers);
  if(!Number.isFinite(subtotal)||subtotal<0||subtotal>10000000)return send({error:"Invalid subtotal."},400,headers);

  const supabase=createPublicClient();
  const {data:store}=await supabase.from("stores").select("id,name,default_currency").eq("slug",storeSlug).eq("status","active").maybeSingle();
  if(!store)return send({error:"Store not found."},404,headers);

  const [{data:shippingMethods},{data:taxRules}]=await Promise.all([
    supabase.from("store_shipping_methods").select("id,code,provider,display_name,price,currency,countries").eq("store_id",store.id).eq("enabled",true).order("sort_order",{ascending:true}),
    supabase.from("store_tax_rules").select("id,country_code,rate,enabled,tax_inclusive").eq("store_id",store.id).eq("enabled",true).eq("country_code",countryCode).limit(1),
  ]);
  const shipping=quoteShipping(shippingMethods??[],countryCode);
  const rule=taxRules?.[0]??null;
  const tax=rule&&!rule.tax_inclusive?Math.round(subtotal*(Number(rule.rate)||0)/100*100)/100:0;
  const platformFee=getPlatformFee(subtotal);
  const total=Math.round((subtotal+shipping.amount+tax+platformFee)*100)/100;
  return send({
    store:{id:store.id,name:store.name,currency:store.default_currency},subtotal,
    shipping:{amount:shipping.amount,currency:shipping.method?.currency??store.default_currency,method:shipping.method?{code:shipping.method.code,provider:shipping.method.provider,displayName:shipping.method.display_name}:null},
    tax:{amount:tax,rate:rule?Number(rule.rate)||0:0,inclusive:rule?.tax_inclusive??false},
    platformFee,total,
  },200,headers);
}
