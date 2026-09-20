export type PaymentIntentInput = { amount:number; currency:string; orderId:string; customerEmail?:string };
export type PaymentProvider = {
  code:string; displayName:string;
  createIntent(input:PaymentIntentInput):Promise<{status:"pending"|"paid";reference:string|null;redirectUrl?:string}>;
};

export class CashOnDeliveryProvider implements PaymentProvider {
  code="cod"; displayName="Cash on delivery";
  async createIntent(input:PaymentIntentInput) {
    return { status:"pending" as const, reference:"COD-"+input.orderId.slice(0,8).toUpperCase() };
  }
}

export function getPlatformFee(amount:number) {
  const safe=Math.max(0,Number.isFinite(amount)?amount:0);
  const bps=Number(process.env.PLATFORM_FEE_BPS??"");
  if(Number.isFinite(bps)&&bps>0) return Math.round(safe*Math.min(bps,2000)/10000*100)/100;
  const fixed=Number(process.env.PLATFORM_TRANSACTION_FEE??"");
  if(Number.isFinite(fixed)&&fixed>0) return Math.round(Math.min(fixed,100000)*100)/100;
  return 0;
}

export type ShippingMethod={id:string;code:string;provider:string;display_name:string;price:number|string;currency:string;countries:unknown};
function countryAllowed(countries:unknown,code:string){return !Array.isArray(countries)||countries.length===0||countries.some((v)=>typeof v==="string"&&v.toUpperCase()===code);}
export function quoteShipping(methods:ShippingMethod[],countryCode:string){
  const method=methods.find((item)=>countryAllowed(item.countries,countryCode))??null;
  return {method,amount:method?Math.max(0,Number(method.price)||0):0};
}

export const SUPPORTED_CURRENCIES=["BDT","USD","EUR","GBP","CAD","AUD","JPY","CNY","INR","AED","SAR","SGD"] as const;
export function isSupportedCurrency(value:string){return (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase());}

export type RiskAssessment={score:number;severity:"low"|"medium"|"high"|"critical";reasons:string[]};
export function assessCheckoutRisk(input:{subtotal:number;quantity:number;checkoutAttempts:number;billingCountry?:string;shippingCountry?:string}):RiskAssessment{
  const subtotal=Math.max(0,Number(input.subtotal)||0), quantity=Math.max(0,Math.floor(Number(input.quantity)||0)), attempts=Math.max(0,Math.floor(Number(input.checkoutAttempts)||0));
  let score=0; const reasons:string[]=[];
  if(subtotal>=10000){score+=25;reasons.push("high_order_value");}
  if(quantity>=25){score+=20;reasons.push("high_item_quantity");}
  if(attempts>=5){score+=30;reasons.push("repeated_checkout_attempts");}
  if(input.billingCountry&&input.shippingCountry&&input.billingCountry.toUpperCase()!==input.shippingCountry.toUpperCase()){score+=15;reasons.push("billing_shipping_country_mismatch");}
  score=Math.min(score,100);
  return {score,severity:score>=80?"critical":score>=60?"high":score>=30?"medium":"low",reasons};
}

export const PLATFORM_FEATURE_KEYS=["checkout","product_variants","store_builder","coupons","reviews","analytics","custom_domains","pwa","online_payments","loyalty","ai","3d","ar","chat"] as const;
export function isPlatformFeatureKey(value:string){return (PLATFORM_FEATURE_KEYS as readonly string[]).includes(value);}

export type ModuleStatus="live"|"foundation"|"external";
export const COMMERCE_MODULES:{key:string;title:string;status:ModuleStatus;detail:string}[]=[
  {key:"stores",title:"Independent stores",status:"live",detail:"Tenant-isolated storefront and custom-domain routing."},
  {key:"catalog",title:"Products & variants",status:"live",detail:"Catalog, media and variant inventory."},
  {key:"orders",title:"Orders & checkout",status:"live",detail:"Server-validated order foundation with COD."},
  {key:"customers",title:"Customers",status:"live",detail:"Store-scoped customer and address data."},
  {key:"analytics",title:"Analytics",status:"live",detail:"Store-scoped funnel and order metrics."},
  {key:"developer",title:"API & webhooks",status:"live",detail:"Scoped API keys and queued delivery."},
  {key:"settings",title:"Store settings",status:"live",detail:"Currency, locale, timezone, country, theme and announcements."},
  {key:"security",title:"Security & RBAC",status:"live",detail:"RLS plus platform/store access boundaries."},
  {key:"payments",title:"Payment providers",status:"foundation",detail:"COD live; online gateways use the provider interface."},
  {key:"shipping",title:"Shipping engine",status:"foundation",detail:"Country-aware shipping quote abstraction."},
  {key:"localization",title:"International localization",status:"foundation",detail:"Currency and country primitives."},
  {key:"risk",title:"Fraud/risk",status:"foundation",detail:"Deterministic transaction-risk assessment."},
  {key:"loyalty",title:"Loyalty",status:"foundation",detail:"Points account and ledger schema."},
  {key:"marketing",title:"Marketing automation",status:"foundation",detail:"Campaign schema for future channels."},
  {key:"support",title:"Support",status:"foundation",detail:"Ownership-safe ticket schema."},
  {key:"experiments",title:"A/B testing",status:"foundation",detail:"Experiment allocation schema."},
  {key:"pwa",title:"PWA/offline",status:"live",detail:"Manifest and offline fallback."},
  {key:"ai",title:"AI commerce",status:"external",detail:"Provider configuration is still required."},
  {key:"3d",title:"AI 3D pipeline",status:"external",detail:"Python reconstruction worker is external."},
  {key:"ar",title:"AR viewer",status:"external",detail:"Consumes optimized GLB assets when available."},
  {key:"chat",title:"Customer chat",status:"external",detail:"Provider integration is intentionally not hard-wired."},
];

export function getCommerceAiStatus(){const provider=process.env.COMMERCE_AI_PROVIDER?.trim()||null;return {configured:Boolean(provider),provider};}
export function getThreeDWorkerStatus(){const workerUrl=process.env.THREED_WORKER_URL?.trim()||null;return {configured:Boolean(workerUrl),workerUrl};}
