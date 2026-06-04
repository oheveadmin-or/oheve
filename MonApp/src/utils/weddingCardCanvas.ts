import type { WeddingClientData, WeddingOverlay } from '@/src/types/weddingCard';

const SERIF_IDS = [
  'main_invitation','subtitle','weekday','date_full','date_short',
  'ceremony_time','reception_time','venue_name','address_line_1',
  'address_line_2','city','country','rsvp','rsvp_phone',
  'dress_code','custom_note','website','bride_parents','groom_parents',
];
const CURSIVE_IDS = [
  'bride_first_name','bride_last_name','bride_full_name',
  'groom_first_name','groom_last_name','groom_full_name',
];

export function generateWeddingCardCanvasHTML(
  imageBase64: string,
  mimeType: string,
  overlays: WeddingOverlay[],
  clientData: WeddingClientData = {},
  isCleanedImage = false,
): string {
  const safeBase64 = imageBase64.replace(/`/g, '').replace(/\$/g, '');
  const OVS     = JSON.stringify(overlays);
  const CD      = JSON.stringify(clientData);
  const SID     = JSON.stringify(SERIF_IDS);
  const CID     = JSON.stringify(CURSIVE_IDS);
  const IS_CLEAN= String(isCleanedImage);
  const MIME    = mimeType || 'image/jpeg';
  const CURSIVE_FONTS = [
    'Great+Vibes','Pinyon+Script','Allura','Alex+Brush',
    'Parisienne','Dancing+Script','Herr+Von+Muellerhoff',
    'Tangerine','Meie+Script','Monsieur+La+Doulaise',
  ].join('&family=');
  const fontLink =
    '<link rel="preconnect" href="https://fonts.googleapis.com">' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + CURSIVE_FONTS +
    '&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400' +
    '&family=Playfair+Display:wght@400;600;700' +
    '&family=Noto+Serif+Hebrew:wght@300;400;600&display=swap">';

  return [
    '<!DOCTYPE html><html><head><meta charset="utf-8">',
    fontLink,
    '<style>*{margin:0;padding:0;}body{background:#000;overflow:hidden;}</style>',
    '</head><body><canvas id="c"></canvas><script>',
    'document.fonts.ready.then(function(){',
    'var canvas=document.getElementById("c");',
    'var ctx=canvas.getContext("2d");',
    'var OVS=' + OVS + ';',
    'var CD=' + CD + ';',
    'var SERIF_IDS=' + SID + ';',
    'var CURSIVE_IDS=' + CID + ';',
    'var isClean=' + IS_CLEAN + ';',
    'var GUT=null;',

    /* Gouttière centre : défaut 48/52 %, ou milieu réel entre zone mariée et zone marié (toutes cartes) */
    'function computeGutters(){',
    '  var ml=canvas.width*0.48,mr=canvas.width*0.52;',
    '  var brMax=0,grMin=canvas.width;',
    '  for(var i=0;i<OVS.length;i++){',
    '    var ov=OVS[i];var id=ov.id||"";',
    '    var isC=CURSIVE_IDS.indexOf(id)>=0||ov.font_family==="cursive";',
    '    if(!isC)continue;',
    '    var b=getBox(ov,"source");',
    '    if(id.indexOf("groom")>=0){grMin=Math.min(grMin,b.x);}',
    '    else if(id.indexOf("bride")>=0){brMax=Math.max(brMax,b.x+b.w);}',
    '  }',
    '  if(brMax>8&&grMin<canvas.width-8&&grMin>brMax+4){',
    '    var mid=(brMax+grMin)/2;ml=Math.min(ml,mid);mr=Math.max(mr,mid);',
    '  }',
    '  return{ml:ml,mr:mr};',
    '}',

    /* fontFamily */
    'function fontFamily(ov){',
    '  var id=ov.id||"";',
    '  if(ov.font_family==="hebrew"||id.indexOf("religious")>=0) return \'"Noto Serif Hebrew",serif\';',
    '  if(SERIF_IDS.indexOf(id)>=0||ov.font_family==="serif") return \'"Cormorant Garamond","Playfair Display",serif\';',
    '  if(CURSIVE_IDS.indexOf(id)>=0||ov.font_family==="cursive"){',
    '    if(ov.font_match&&ov.font_match.length>2) return \'"\'+ov.font_match+\'","Great Vibes",cursive\';',
    '    return \'"Great Vibes","Pinyon Script","Allura",cursive\';',
    '  }',
    '  return \'"Cormorant Garamond","Playfair Display",serif\';',
    '}',

    /* getBox */
    'function getBox(ov,type){',
    '  var b=(type==="source"?ov.source_box:ov.render_box)||{x_pct:ov.x_pct,y_pct:ov.y_pct,width_pct:ov.width_pct,height_pct:ov.height_pct};',
    '  return{x:Math.max(0,(b.x_pct/100)*canvas.width),y:Math.max(0,(b.y_pct/100)*canvas.height),',
    '         w:Math.max(1,(b.width_pct/100)*canvas.width),h:Math.max(1,(b.height_pct/100)*canvas.height)};',
    '}',

    /* sampleBg */
    'function sampleBg(box){',
    '  var s=[];',
    '  function px(sx,sy){',
    '    sx=Math.max(0,Math.min(canvas.width-1,Math.floor(sx)));',
    '    sy=Math.max(0,Math.min(canvas.height-1,Math.floor(sy)));',
    '    var d=ctx.getImageData(sx,sy,1,1).data;',
    '    if(d[3]<10||(d[0]<55&&d[1]<55&&d[2]<55))return;',
    '    s.push([d[0],d[1],d[2]]);',
    '  }',
    '  var step=Math.max(1,Math.floor(box.w/10));',
    '  for(var x=box.x;x<box.x+box.w;x+=step){px(x,box.y-8);px(x,box.y+box.h+8);}',
    '  var ys=Math.max(1,Math.floor(box.h/6));',
    '  for(var y=box.y;y<box.y+box.h;y+=ys){px(box.x-8,y);px(box.x+box.w+8,y);}',
    '  if(!s.length)return"#ffffff";',
    '  var r=s.map(function(p){return p[0];}).sort(function(a,b){return a-b;});',
    '  var g=s.map(function(p){return p[1];}).sort(function(a,b){return a-b;});',
    '  var bl=s.map(function(p){return p[2];}).sort(function(a,b){return a-b;});',
    '  var m=Math.floor(s.length/2);',
    '  return"rgb("+r[m]+","+g[m]+","+bl[m]+")";',
    '}',

    /* erase — rognage centre basé sur l’id (mariée à gauche / marié à droite), pas de bande fixe 43–57 */
    'function erase(src,isCursive,id){',
    '  var padX=src.w*0.04;',
    '  var padY=isCursive?src.h*0.42:src.h*0.16;',
    '  var ex=Math.max(0,src.x-padX);',
    '  var ey=Math.max(0,src.y-padY);',
    '  var ew=Math.min(canvas.width-ex,src.w+padX*2);',
    '  var eh=Math.min(canvas.height-ey,src.h+padY*2);',
    '  var idStr=id||"";',
    '  if(isCursive&&GUT){',
    '    var midL=GUT.ml,midR=GUT.mr,right=ex+ew;',
    '    if(idStr.indexOf("groom")>=0){',
    '      if(ex<midR){ex=midR;ew=right-ex;if(ew<1)return;}',
    '    }else if(idStr.indexOf("bride")>=0){',
    '      if(right>midL){ew=midL-ex;if(ew<1)return;}',
    '    }',
    '  }',
    '  if(ew<=0||eh<=0)return;',
    '  var bg=sampleBg({x:ex,y:ey,w:ew,h:eh});',
    '  ctx.globalAlpha=1.0;ctx.fillStyle=bg;ctx.fillRect(ex,ey,ew,eh);',
    '  ctx.globalAlpha=0.35;ctx.fillRect(ex-1,ey-1,ew+2,eh+2);',
    '  ctx.globalAlpha=0.12;ctx.fillRect(ex-3,ey-3,ew+6,eh+6);',
    '  ctx.globalAlpha=1.0;',
    '}',

    /* wrapLines — regex inline évite les problèmes d'échappement */
    'function wrapLines(text,maxW){',
    '  var words=[];var tmp="";',
    '  for(var i=0;i<text.length;i++){',
    '    if(text[i]===" "||text[i]==="\\n"){if(tmp.length)words.push(tmp);tmp="";}',
    '    else{tmp+=text[i];}',
    '  }',
    '  if(tmp.length)words.push(tmp);',
    '  if(!words.length)return[""];',
    '  var lines=[];var cur="";',
    '  for(var j=0;j<words.length;j++){',
    '    var test=cur?cur+" "+words[j]:words[j];',
    '    if(cur&&ctx.measureText(test).width>maxW){lines.push(cur);cur=words[j];}',
    '    else{cur=test;}',
    '  }',
    '  if(cur)lines.push(cur);',
    '  return lines.length?lines:[""];',
    '}',

    /* drawText */
    'function drawText(text,rb,ov){',
    '  var id=ov.id||"";',
    '  var isCursive=CURSIVE_IDS.indexOf(id)>=0||ov.font_family==="cursive";',
    '  var isHebrew=ov.font_family==="hebrew"||id.indexOf("religious")>=0;',
    '  var ff=fontFamily(ov);',
    '  var fw=ov.font_weight||"400";',
    '  var lhF=isCursive?1.55:1.28;',
    '  var disp=ov.uppercase?text.toUpperCase():text;',
    '  var base=Math.max(12,(ov.font_size_pct/100)*canvas.height);',
    '  var fs=base;var lines=[""];var lh=fs*lhF;',
    '  while(fs>=base*0.45){',
    '    ctx.font=fw+" "+fs+"px "+ff;',
    '    lines=wrapLines(disp,rb.w*0.90);',
    '    lh=fs*lhF;',
    '    var mxW=0;for(var i=0;i<lines.length;i++){var w=ctx.measureText(lines[i]).width;if(w>mxW)mxW=w;}',
    '    if(mxW<=rb.w*0.93&&lines.length*lh<=rb.h*0.95)break;',
    '    fs-=0.5;',
    '  }',
    '  ctx.font=fw+" "+fs+"px "+ff;',
    '  ctx.fillStyle=ov.color||"#6b7280";',
    '  ctx.textAlign=ov.text_align||"center";',
    '  ctx.textBaseline="middle";',
    '  ctx.direction=isHebrew?"rtl":"ltr";',
    '  var tx=rb.x+rb.w/2;',
    '  if(ov.text_align==="left")tx=rb.x+5;',
    '  if(ov.text_align==="right")tx=rb.x+rb.w-5;',
    '  var totalH=lines.length*lh;',
    '  var sy=rb.y+rb.h/2-totalH/2+lh/2;',
    '  for(var j=0;j<lines.length;j++)ctx.fillText(lines[j],tx,sy+j*lh);',
    '}',

    /* main */
    'var img=new Image();',
    'img.onload=function(){',
    '  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;',
    '  ctx.drawImage(img,0,0,canvas.width,canvas.height);',
    '  GUT=computeGutters();',
    /* PASSE 1 effacement */
    '  if(!isClean){',
    '    for(var i=0;i<OVS.length;i++){',
    '      var ov=OVS[i];',
    '      var txt=String(CD[ov.id]||ov.new_text||ov.text||ov.original_text||"").trim();',
    '      if(!txt)continue;',
    '      var isCurs=CURSIVE_IDS.indexOf(ov.id||"")>=0||ov.font_family==="cursive";',
    '      erase(getBox(ov,"source"),isCurs,ov.id||"");',
    '    }',
    '  }',
    /* PASSE 2 écriture */
    '  for(var k=0;k<OVS.length;k++){',
    '    var ov2=OVS[k];',
    '    var txt2=String(CD[ov2.id]||ov2.new_text||ov2.text||ov2.original_text||"").trim();',
    '    if(!txt2)continue;',
    '    drawText(txt2,getBox(ov2,"render"),ov2);',
    '  }',
    '  try{window.ReactNativeWebView.postMessage(JSON.stringify({type:"EXPORT_READY",data:canvas.toDataURL("image/png")}));}',
    '  catch(e){window.ReactNativeWebView.postMessage(JSON.stringify({type:"EXPORT_ERROR",message:String(e)}));}',
    '};',
    'img.onerror=function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:"EXPORT_ERROR",message:"Image non chargeable"}));};',
    'img.src="data:' + MIME + ';base64,' + safeBase64 + '";',
    '});',
    '</script></body></html>',
  ].join('\n');
}
