import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createClient } from "@/utils/supabase/server";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const TTL = 60 * 60 * 24 * 30; // 30 days

function id() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function injectCart(html: string, publishId: string): string {
  const script = `<script>
(function(){
var cart=[];
function initCart(){
  var s=document.createElement('div');
  s.innerHTML='<div id="vc-ov" onclick="vcClose()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99998;"></div><div id="vc-panel" style="position:fixed;right:-420px;top:0;width:400px;height:100vh;background:#fff;z-index:99999;transition:right .3s ease;display:flex;flex-direction:column;box-shadow:-4px 0 24px rgba(0,0,0,.15);font-family:system-ui,sans-serif;"><div style="padding:20px 24px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;"><h2 style="font-size:18px;font-weight:600;margin:0;color:#111;">Your Cart</h2><button onclick="vcClose()" style="background:none;border:none;cursor:pointer;font-size:24px;color:#6B7280;line-height:1;">&times;</button></div><div id="vc-items" style="flex:1;overflow-y:auto;padding:16px 24px;"></div><div style="padding:20px 24px;border-top:1px solid #E5E7EB;"><div style="display:flex;justify-content:space-between;margin-bottom:16px;"><span style="font-size:15px;font-weight:500;color:#111;">Total</span><span id="vc-total" style="font-size:15px;font-weight:700;color:#111;">$0.00</span></div><button onclick="vcCheckout()" id="vc-btn" style="width:100%;padding:14px;background:#2563EB;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">Checkout</button></div></div>';
  document.body.appendChild(s);
  document.querySelectorAll('.add-to-cart,[class*="add-to-cart"],button[data-price]').forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.preventDefault();
      var price=parseFloat(this.dataset.price||'0');
      var card=this.closest('[data-product-id]')||this.closest('.product-card');
      var name=((card&&card.querySelector('h3,h4,[class*="product-name"]'))||{}).textContent||'Product';
      name=name.trim().slice(0,80);
      var pid=(card&&card.dataset.productId)||name;
      vcAdd({id:pid,name:name,price:price});
    });
  });
  vcRender();
}
function vcAdd(item){
  var ex=cart.find(function(i){return i.id===item.id;});
  if(ex){ex.qty++;}else{cart.push({id:item.id,name:item.name,price:item.price,qty:1});}
  vcRender();vcOpen();
}
function vcRemoveItem(id){cart=cart.filter(function(i){return i.id!==id;});vcRender();}
function vcRender(){
  var el=document.getElementById('vc-items');
  var tot=document.getElementById('vc-total');
  if(!el)return;
  if(cart.length===0){el.innerHTML='<p style="color:#9CA3AF;text-align:center;margin-top:48px;font-size:14px;">Your cart is empty</p>';if(tot)tot.textContent='$0.00';return;}
  var total=cart.reduce(function(s,i){return s+i.price*i.qty;},0);
  if(tot)tot.textContent='$'+total.toFixed(2);
  el.innerHTML=cart.map(function(item){
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #F3F4F6;"><div><p style="font-size:14px;font-weight:500;margin:0 0 2px;color:#111;">'+item.name+'</p><p style="font-size:12px;color:#6B7280;margin:0;">$'+item.price.toFixed(2)+' &times; '+item.qty+'</p></div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;font-weight:600;color:#111;">$'+(item.price*item.qty).toFixed(2)+'</span><button onclick="vcRemoveItem(\''+item.id+'\')" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:18px;line-height:1;">&times;</button></div></div>';
  }).join('');
}
window.vcOpen=function(){var p=document.getElementById('vc-panel');var o=document.getElementById('vc-ov');if(p)p.style.right='0';if(o)o.style.display='block';};
window.vcClose=function(){var p=document.getElementById('vc-panel');var o=document.getElementById('vc-ov');if(p)p.style.right='-420px';if(o)o.style.display='none';};
window.vcRemoveItem=vcRemoveItem;
window.vcCheckout=async function(){
  if(cart.length===0)return;
  var btn=document.getElementById('vc-btn');
  if(btn){btn.textContent='Processing...';btn.disabled=true;}
  try{
    var res=await fetch('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cart:cart.map(function(i){return{name:i.name,price:i.price,quantity:i.qty};}),publishId:'${publishId}'})});
    var data=await res.json();
    if(data.url){(window.top||window).location.href=data.url;}
    else{throw new Error(data.error||'Checkout failed');}
  }catch(err){
    if(btn){btn.textContent='Error — Try Again';btn.disabled=false;setTimeout(function(){btn.textContent='Checkout';},2000);}
  }
};
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',initCart);}else{initCart();}
})();
</script>`;
  // Inject before </body>, falling back to end of string
  return html.includes('</body>')
    ? html.replace('</body>', script + '</body>')
    : html + script;
}

export async function POST(req: Request) {
  try {
    const { site } = await req.json();

    if (!site) {
      return NextResponse.json({ error: "Missing site" }, { status: 400 });
    }

    const publishId = id();

    // If this is an AI-generated store, inject the cart system with the publishId baked in
    let siteToStore = site;
    if (site?.generatedHtml && typeof site.generatedHtml === "string") {
      siteToStore = { ...site, generatedHtml: injectCart(site.generatedHtml, publishId) };
    }

    // Store site JSON for 30 days
    await redis.set(`site:${publishId}`, siteToStore, { ex: TTL });

    // Record which user owns this published site so webhooks can attribute orders
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      await redis.set(`site-owner:${publishId}`, user.id, { ex: TTL });
    }

    return NextResponse.json({ id: publishId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Publish failed" },
      { status: 500 }
    );
  }
}

