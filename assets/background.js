/* Background cartographic animation — illustrative, accessible, and pointer transparent. */
(()=>{if(document.body.classList.contains('admin-body'))return;
 const cv=document.createElement('canvas');cv.id='site-map-background';cv.setAttribute('aria-hidden','true');document.body.prepend(cv);
 const ctx=cv.getContext('2d');if(!ctx)return;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let w=0,h=0,dpr=1,frame=0,visible=true;
 const nodes=[[.08,.27],[.16,.52],[.25,.16],[.31,.73],[.43,.39],[.51,.67],[.63,.25],[.72,.58],[.85,.28],[.93,.76]];
 const links=[[0,1],[0,2],[1,3],[2,4],[3,4],[3,5],[4,5],[4,6],[5,7],[6,7],[6,8],[7,8],[7,9],[8,9]];
 function resize(){dpr=Math.min(window.devicePixelRatio||1,2);w=innerWidth;h=innerHeight;cv.width=Math.ceil(w*dpr);cv.height=Math.ceil(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0)}
 function draw(t){ctx.clearRect(0,0,w,h);let phase=t*.00018;
 for(let k=0;k<23;k++){ctx.beginPath();for(let x=-10;x<=w+10;x+=12){let y=h*(k/22)+Math.sin(x*.007+k*.63+phase)*19+Math.cos(x*.0029+k*.35)*30;if(x===-10)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.strokeStyle='rgba(31,109,70,.12)';ctx.lineWidth=1;ctx.stroke()}
 links.forEach(([i,j],n)=>{let a=nodes[i],b=nodes[j],ax=a[0]*w,ay=a[1]*h,bx=b[0]*w,by=b[1]*h;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.strokeStyle='rgba(28,108,71,.13)';ctx.stroke();let p=(phase*.5+n*.14)%1;ctx.beginPath();ctx.arc(ax+(bx-ax)*p,ay+(by-ay)*p,2.1,0,Math.PI*2);ctx.fillStyle='rgba(39,132,82,.42)';ctx.fill()});
 nodes.forEach((n,i)=>{let x=n[0]*w,y=n[1]*h;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=i%3===0?'rgba(42,130,77,.48)':'rgba(26,95,65,.3)';ctx.fill()});
 if(!reduced&&visible)frame=requestAnimationFrame(draw)}
 document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(visible&&!reduced){cancelAnimationFrame(frame);frame=requestAnimationFrame(draw)}else cancelAnimationFrame(frame)});
 window.addEventListener('resize',resize,{passive:true});resize();if(reduced)draw(0);else frame=requestAnimationFrame(draw);
})();
