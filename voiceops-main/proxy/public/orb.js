/* ===== VoiceOps — Orb (WebGL) + flare embers =====
   Zero-dependency vanilla port of the OGL <Orb/> component, recolored to the
   VoiceOps grass-green / lime palette, with short-range flare embers licking
   off the orb's rim. Renders on #orb (WebGL) + #orbflares (2D) inside the hero.
   Falls back gracefully (hides both) if WebGL is unavailable. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
  }

  var VERT = [
    'precision highp float;',
    'attribute vec2 position;',
    'attribute vec2 uv;',
    'varying vec2 vUv;',
    'void main(){ vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform float iTime;',
    'uniform vec3 iResolution;',
    'uniform float hue;',
    'uniform float hover;',
    'uniform float rot;',
    'uniform float hoverIntensity;',
    'uniform vec3 backgroundColor;',
    'varying vec2 vUv;',
    'vec3 rgb2yiq(vec3 c){ float y=dot(c,vec3(0.299,0.587,0.114)); float i=dot(c,vec3(0.596,-0.274,-0.322)); float q=dot(c,vec3(0.211,-0.523,0.312)); return vec3(y,i,q); }',
    'vec3 yiq2rgb(vec3 c){ float r=c.x+0.956*c.y+0.621*c.z; float g=c.x-0.272*c.y-0.647*c.z; float b=c.x-1.106*c.y+1.703*c.z; return vec3(r,g,b); }',
    'vec3 adjustHue(vec3 color, float hueDeg){ float hueRad=hueDeg*3.14159265/180.0; vec3 yiq=rgb2yiq(color); float cosA=cos(hueRad); float sinA=sin(hueRad); float i=yiq.y*cosA-yiq.z*sinA; float q=yiq.y*sinA+yiq.z*cosA; yiq.y=i; yiq.z=q; return yiq2rgb(yiq); }',
    'vec3 hash33(vec3 p3){ p3=fract(p3*vec3(0.1031,0.11369,0.13787)); p3+=dot(p3,p3.yxz+19.19); return -1.0+2.0*fract(vec3(p3.x+p3.y,p3.x+p3.z,p3.y+p3.z)*p3.zyx); }',
    'float snoise3(vec3 p){ const float K1=0.333333333; const float K2=0.166666667; vec3 i=floor(p+(p.x+p.y+p.z)*K1); vec3 d0=p-(i-(i.x+i.y+i.z)*K2); vec3 e=step(vec3(0.0),d0-d0.yzx); vec3 i1=e*(1.0-e.zxy); vec3 i2=1.0-e.zxy*(1.0-e); vec3 d1=d0-(i1-K2); vec3 d2=d0-(i2-K1); vec3 d3=d0-0.5; vec4 h=max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0); vec4 n=h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0))); return dot(vec4(31.316),n); }',
    'vec4 extractAlpha(vec3 colorIn){ float a=max(max(colorIn.r,colorIn.g),colorIn.b); return vec4(colorIn.rgb/(a+1e-5),a); }',
    // --- VoiceOps grass-green / lime palette ---
    'const vec3 baseColor1 = vec3(0.52549, 0.83529, 0.09804);', // #86d519
    'const vec3 baseColor2 = vec3(0.84706, 0.90980, 0.10196);', // #d8e81a
    'const vec3 baseColor3 = vec3(0.05882, 0.23922, 0.10980);', // #0f3d1c (deep green core)
    'const float innerRadius = 0.6;',
    'const float noiseScale = 0.65;',
    'float light1(float intensity, float attenuation, float dist){ return intensity/(1.0+dist*attenuation); }',
    'float light2(float intensity, float attenuation, float dist){ return intensity/(1.0+dist*dist*attenuation); }',
    'vec4 draw(vec2 uv){',
    '  vec3 color1=adjustHue(baseColor1,hue); vec3 color2=adjustHue(baseColor2,hue); vec3 color3=adjustHue(baseColor3,hue);',
    '  float ang=atan(uv.y,uv.x); float len=length(uv); float invLen=len>0.0?1.0/len:0.0;',
    '  float bgLuminance=dot(backgroundColor,vec3(0.299,0.587,0.114));',
    '  float n0=snoise3(vec3(uv*noiseScale,iTime*0.5))*0.5+0.5;',
    '  float r0=mix(mix(innerRadius,1.0,0.4),mix(innerRadius,1.0,0.6),n0);',
    '  float d0=distance(uv,(r0*invLen)*uv); float v0=light1(1.0,10.0,d0);',
    '  v0*=smoothstep(r0*1.05,r0,len);',
    '  float innerFade=smoothstep(r0*0.8,r0*0.95,len);',
    '  v0*=mix(innerFade,1.0,bgLuminance*0.7);',
    '  float cl=cos(ang+iTime*2.0)*0.5+0.5;',
    '  float a=iTime*-1.0; vec2 pos=vec2(cos(a),sin(a))*r0; float d=distance(uv,pos);',
    '  float v1=light2(1.5,5.0,d); v1*=light1(1.0,50.0,d0);',
    '  float v2=smoothstep(1.0,mix(innerRadius,1.0,n0*0.5),len);',
    '  float v3=smoothstep(innerRadius,mix(innerRadius,1.0,0.5),len);',
    '  vec3 colBase=mix(color1,color2,cl); float fadeAmount=mix(1.0,0.1,bgLuminance);',
    '  vec3 darkCol=mix(color3,colBase,v0); darkCol=(darkCol+v1)*v2*v3; darkCol=clamp(darkCol,0.0,1.0);',
    '  vec3 lightCol=(colBase+v1)*mix(1.0,v2*v3,fadeAmount); lightCol=mix(backgroundColor,lightCol,v0); lightCol=clamp(lightCol,0.0,1.0);',
    '  vec3 finalCol=mix(darkCol,lightCol,bgLuminance);',
    '  return extractAlpha(finalCol);',
    '}',
    'vec4 mainImage(vec2 fragCoord){',
    '  vec2 center=iResolution.xy*0.5; float size=min(iResolution.x,iResolution.y);',
    '  vec2 uv=(fragCoord-center)/size*2.0;',
    '  float angle=rot; float s=sin(angle); float c=cos(angle);',
    '  uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);',
    '  uv.x+=hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);',
    '  uv.y+=hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);',
    '  return draw(uv);',
    '}',
    'void main(){ vec2 fragCoord=vUv*iResolution.xy; vec4 col=mainImage(fragCoord); gl_FragColor=vec4(col.rgb*col.a,col.a); }'
  ].join('\n');

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      if (window.console) console.warn('[orb] shader error:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  function initOrb() {
    var canvas = document.getElementById('orb');
    if (!canvas) return;
    var flares = document.getElementById('orbflares');

    var opts = { hue: 0, hoverIntensity: 1.0, rotateOnHover: true, forceHoverState: false, background: '#02140f' };
    var ANIM = 0.8;   // hero orb animation speed — 80% of full (1 = 100%)
    var glAttrs = { alpha: true, premultipliedAlpha: false, antialias: true };
    var gl = canvas.getContext('webgl', glAttrs) || canvas.getContext('experimental-webgl', glAttrs);
    if (!gl) { canvas.style.display = 'none'; if (flares) flares.style.display = 'none'; return; }

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.style.display = 'none'; if (flares) flares.style.display = 'none'; return; }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.style.display = 'none'; if (flares) flares.style.display = 'none'; return; }
    gl.useProgram(prog);

    // Full-screen triangle (matches OGL's Triangle geometry)
    var posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 2, 0, 0, 2]), gl.STATIC_DRAW);
    var uvLoc = gl.getAttribLocation(prog, 'uv');
    gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

    var U = {
      iTime: gl.getUniformLocation(prog, 'iTime'),
      iResolution: gl.getUniformLocation(prog, 'iResolution'),
      hue: gl.getUniformLocation(prog, 'hue'),
      hover: gl.getUniformLocation(prog, 'hover'),
      rot: gl.getUniformLocation(prog, 'rot'),
      hoverIntensity: gl.getUniformLocation(prog, 'hoverIntensity'),
      backgroundColor: gl.getUniformLocation(prog, 'backgroundColor')
    };
    var bg = hexToRgb(opts.background);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      W = Math.max(1, Math.floor(w * dpr)); H = Math.max(1, Math.floor(h * dpr));
      canvas.width = W; canvas.height = H; gl.viewport(0, 0, W, H);
    }
    resize();
    window.addEventListener('resize', resize);

    // Hover — listen on the hero (the orb-wrap is click-through). Warp when the
    // pointer is over/near the orb, gauged by distance to the orb's centre so
    // hovering the copy that sits inside the ring counts too.
    var targetHover = 0, hover = 0, rot = 0;
    var host = canvas.closest('.hero') || canvas.parentElement || canvas;
    host.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      var size = Math.min(r.width, r.height) || 1;
      var uvx = ((e.clientX - r.left - r.width / 2) / size) * 2.0;
      var uvy = ((e.clientY - r.top - r.height / 2) / size) * 2.0;
      targetHover = (Math.sqrt(uvx * uvx + uvy * uvy) < 0.9) ? 1 : 0;
    });
    host.addEventListener('pointerleave', function () { targetHover = 0; });

    // Flare embers on a 2D overlay canvas
    var fx = flares ? flares.getContext('2d') : null, fw = 0, fh = 0, embs = [];
    var fcolors = ['#d8e81a', '#b9e01b', '#86d519'];
    function fresize() {
      if (!flares) return;
      fw = flares.clientWidth; fh = flares.clientHeight;
      flares.width = Math.max(1, Math.floor(fw * dpr));
      flares.height = Math.max(1, Math.floor(fh * dpr));
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (flares) { fresize(); window.addEventListener('resize', fresize); }
    function spawnEmber() {
      var cx = fw / 2, cy = fh / 2;
      var R = Math.min(fw, fh) * 0.42;             // near the orb's bright rim
      var a = Math.random() * Math.PI * 2;
      var rr = R + (Math.random() * 2 - 1) * 8;
      var sp = 0.38 + Math.random() * 0.9;         // motion speed (0.75x of the earlier tuning)
      embs.push({
        x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.22,   // gentle upward bias, like fire
        life: 1, decay: 0.012 + Math.random() * 0.016, r: 1.3 + Math.random() * 1.8,
        c: fcolors[(Math.random() * fcolors.length) | 0]
      });
    }

    function loop(t) {
      // --- orb ---
      var eff = opts.forceHoverState ? 1 : targetHover;
      hover += (eff - hover) * 0.1;
      rot += 0.016 * 0.06 * ANIM;                       // slow idle spin for life
      if (opts.rotateOnHover && eff > 0.5) rot += 0.016 * 0.3 * ANIM;
      gl.uniform1f(U.iTime, t * 0.001 * ANIM);
      gl.uniform3f(U.iResolution, W, H, W / H);
      gl.uniform1f(U.hue, opts.hue);
      gl.uniform1f(U.hover, hover);
      gl.uniform1f(U.rot, rot);
      gl.uniform1f(U.hoverIntensity, opts.hoverIntensity);
      gl.uniform3f(U.backgroundColor, bg[0], bg[1], bg[2]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // --- flare embers ---
      if (fx) {
        fx.clearRect(0, 0, fw, fh);
        // spawn a few per frame so the rim always has flares licking off it
        if (Math.random() < 0.9) spawnEmber();
        if (Math.random() < 0.6) spawnEmber();
        if (Math.random() < 0.35) spawnEmber();
        fx.globalCompositeOperation = 'lighter';
        for (var i = embs.length - 1; i >= 0; i--) {
          var p = embs[i];
          p.vy += 0.005; p.vx *= 0.99; p.vy *= 0.99;       // low friction → drifts a bit further out
          p.x += p.vx; p.y += p.vy; p.life -= p.decay;
          if (p.life <= 0) { embs.splice(i, 1); continue; }
          var e = p.life * p.life;                          // smooth ease-out fade before it vanishes
          fx.globalAlpha = e;
          fx.fillStyle = p.c;
          fx.beginPath(); fx.arc(p.x, p.y, p.r * (0.5 + p.life * 0.7), 0, Math.PI * 2); fx.fill();
        }
        fx.globalCompositeOperation = 'source-over';
        fx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(loop);
    }

    var raf;
    if (reduce) {
      // one static frame, no animation / no embers
      gl.uniform1f(U.iTime, 0); gl.uniform3f(U.iResolution, W, H, W / H);
      gl.uniform1f(U.hue, opts.hue); gl.uniform1f(U.hover, 0); gl.uniform1f(U.rot, 0);
      gl.uniform1f(U.hoverIntensity, opts.hoverIntensity);
      gl.uniform3f(U.backgroundColor, bg[0], bg[1], bg[2]);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(loop);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initOrb);
  else initOrb();
})();
