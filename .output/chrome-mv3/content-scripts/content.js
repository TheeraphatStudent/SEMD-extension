var content=(function(){"use strict";function D(e){return e}const a=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,b="semd-warning-overlay",v={OVERLAY_QUESTION:"คุณต้องการเข้าเว็บไซต์",OVERLAY_PROCEED:"ใช่, ดำเนินการต่อ",OVERLAY_CLOSE:"ไม่, ปิดเว็บไซต์นี้"},h={SAFE_GREEN:"#4CAF50",DANGER_RED:"#F44336"};function R(e){const{url:t,accuracy:n,onProceed:o,onClose:r}=e,l=document.createElement("div");l.id=b,l.innerHTML=`
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(244, 67, 54, 0.2);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Thai', sans-serif;
    ">
      <div style="
        background: white;
        border-radius: 16px;
        padding: 32px 40px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
      ">
        <div style="
          width: 80px;
          height: 80px;
          margin: 0 auto 20px;
          background: ${h.DANGER_RED};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L4 6V12C4 16.42 7.4 20.74 12 22C16.6 20.74 20 16.42 20 12V6L12 2Z" fill="white" fill-opacity="0.3"/>
            <text x="12" y="16" text-anchor="middle" fill="white" font-size="14" font-weight="bold">!</text>
          </svg>
        </div>

        <p style="
          font-size: 18px;
          color: #333;
          margin: 0 0 12px 0;
          font-weight: 500;
        ">${v.OVERLAY_QUESTION}</p>

        <p style="
          font-size: 14px;
          color: ${h.DANGER_RED};
          margin: 0 0 8px 0;
          word-break: break-all;
          text-decoration: underline;
        ">${t}</p>

        <p style="
          font-size: 12px;
          color: #666;
          margin: 0 0 24px 0;
        ">ความแม่นยำ: ${(n*100).toFixed(1)}%</p>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="semd-overlay-proceed" style="
            background: transparent;
            color: ${h.DANGER_RED};
            border: 2px solid ${h.DANGER_RED};
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${v.OVERLAY_PROCEED}</button>

          <button id="semd-overlay-close" style="
            background: ${h.SAFE_GREEN};
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${v.OVERLAY_CLOSE}</button>
        </div>
      </div>
    </div>
  `;const w=l.querySelector("#semd-overlay-proceed"),d=l.querySelector("#semd-overlay-close");return w?.addEventListener("click",()=>{o(),c()}),d?.addEventListener("click",()=>{r()}),l}function y(e){c();const t=R(e);document.body?document.body.appendChild(t):document.addEventListener("DOMContentLoaded",()=>{document.body.appendChild(t)})}function c(){const e=document.getElementById(b);e&&e.remove()}const g={CHECK_URL:"CHECK_URL",SHOW_OVERLAY:"SHOW_OVERLAY",DISMISS_OVERLAY:"DISMISS_OVERLAY"},C={matches:["<all_urls>"],runAt:"document_start",main(e){console.log("[SEMD] Content script loaded");let t=window.location.href,n=null;o();function o(){r(t),w(),O()}function r(i){console.log(`[SEMD] Checking URL: ${i}`),a.runtime.sendMessage({type:g.CHECK_URL,url:i},s=>{if(a.runtime.lastError){console.warn("[SEMD] Message error:",a.runtime.lastError.message);return}s?.success&&s.data?.result?.isMalicious&&l(i,s.data.result)})}function l(i,s){console.log("[SEMD] Malicious URL detected:",i),y({url:i,accuracy:s.accuracy,onProceed:()=>{console.log("[SEMD] User chose to proceed"),c()},onClose:()=>{console.log("[SEMD] User chose to close tab"),a.runtime.sendMessage({type:g.DISMISS_OVERLAY,action:"close"}),window.close()}})}function w(){window.addEventListener("popstate",()=>d()),window.addEventListener("hashchange",()=>d());const i=history.pushState.bind(history),s=history.replaceState.bind(history);history.pushState=(...u)=>{i(...u),d()},history.replaceState=(...u)=>{s(...u),d()},n=new MutationObserver(()=>{t!==window.location.href&&d()}),document.body&&n.observe(document.body,{childList:!0,subtree:!0})}function d(){const i=window.location.href;i!==t&&(console.log(`[SEMD] URL changed: ${t} -> ${i}`),t=i,c(),r(i))}function O(){a.runtime.onMessage.addListener((i,s,u)=>{const p=i;return p.type===g.SHOW_OVERLAY&&p.url&&(y({url:p.url,accuracy:p.accuracy||0,onProceed:()=>c(),onClose:()=>window.close()}),u({success:!0})),p.type===g.DISMISS_OVERLAY&&(c(),u({success:!0})),!0})}e.onInvalidated(()=>{n&&(n.disconnect(),n=null),c()})}};function f(e,...t){}const A={debug:(...e)=>f(console.debug,...e),log:(...e)=>f(console.log,...e),warn:(...e)=>f(console.warn,...e),error:(...e)=>f(console.error,...e)};var x=class L extends Event{static EVENT_NAME=m("wxt:locationchange");constructor(t,n){super(L.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function m(e){return`${a?.runtime?.id}:content:${e}`}const I=typeof globalThis.navigation?.addEventListener=="function";function _(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),I?globalThis.navigation.addEventListener("navigate",o=>{const r=new URL(o.destination.url);r.href!==t.href&&(window.dispatchEvent(new x(r,t)),t=r)},{signal:e.signal}):e.setInterval(()=>{const o=new URL(location.href);o.href!==t.href&&(window.dispatchEvent(new x(o,t)),t=o)},1e3))}}}var T=class E{static SCRIPT_STARTED_MESSAGE_TYPE=m("wxt:content-script-started");id;abortController;locationWatcher=_(this);constructor(t,n){this.contentScriptName=t,this.options=n,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return a.runtime?.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,n){const o=setInterval(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearInterval(o)),o}setTimeout(t,n){const o=setTimeout(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearTimeout(o)),o}requestAnimationFrame(t){const n=requestAnimationFrame((...o)=>{this.isValid&&t(...o)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(t,n){const o=requestIdleCallback((...r)=>{this.signal.aborted||t(...r)},n);return this.onInvalidated(()=>cancelIdleCallback(o)),o}addEventListener(t,n,o,r){n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),t.addEventListener?.(n.startsWith("wxt:")?m(n):n,o,{...r,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),A.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(E.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),window.postMessage({type:E.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},"*")}verifyScriptStartedEvent(t){const n=t.detail?.contentScriptName===this.contentScriptName,o=t.detail?.messageId===this.id;return n&&!o}listenForNewerScripts(){const t=n=>{!(n instanceof CustomEvent)||!this.verifyScriptStartedEvent(n)||this.notifyInvalidated()};document.addEventListener(E.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(E.SCRIPT_STARTED_MESSAGE_TYPE,t))}};function U(){}function S(e,...t){}const M={debug:(...e)=>S(console.debug,...e),log:(...e)=>S(console.log,...e),warn:(...e)=>S(console.warn,...e),error:(...e)=>S(console.error,...e)};return(async()=>{try{const{main:e,...t}=C;return await e(new T("content",t))}catch(e){throw M.error('The content script "content" crashed on startup!',e),e}})()})();
content;