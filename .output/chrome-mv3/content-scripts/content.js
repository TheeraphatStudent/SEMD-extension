var content=(function(){"use strict";function N(e){return e}const b="semd-warning-overlay",m={OVERLAY_QUESTION:"คุณต้องการเข้าเว็บไซต์",OVERLAY_PROCEED:"ใช่, ดำเนินการต่อ",OVERLAY_CLOSE:"ไม่, ปิดเว็บไซต์นี้"},E={SAFE_GREEN:"#4CAF50",DANGER_RED:"#F44336"};function R(e){const{url:t,accuracy:n,onProceed:o,onClose:s}=e,u=document.createElement("div");u.id=b,u.innerHTML=`
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
          background: ${E.DANGER_RED};
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
        ">${m.OVERLAY_QUESTION}</p>

        <p style="
          font-size: 14px;
          color: ${E.DANGER_RED};
          margin: 0 0 8px 0;
          word-break: break-all;
          text-decoration: underline;
        ">${t}</p>

        <p style="
          font-size: 12px;
          color: #666;
          margin: 0 0 24px 0;
        ">ความแม่นยำ: ${n.toFixed(2)}%</p>

        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="semd-overlay-proceed" style="
            background: transparent;
            color: ${E.DANGER_RED};
            border: 2px solid ${E.DANGER_RED};
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${m.OVERLAY_PROCEED}</button>

          <button id="semd-overlay-close" style="
            background: ${E.SAFE_GREEN};
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">${m.OVERLAY_CLOSE}</button>
        </div>
      </div>
    </div>
  `;const w=u.querySelector("#semd-overlay-proceed"),h=u.querySelector("#semd-overlay-close");return w?.addEventListener("click",()=>{o(),l()}),h?.addEventListener("click",()=>{s()}),u}function y(e){l();const t=R(e);document.body?document.body.appendChild(t):document.addEventListener("DOMContentLoaded",()=>{document.body.appendChild(t)})}function l(){const e=document.getElementById(b);e&&e.remove()}const d={CHECK_URL:"CHECK_URL",SHOW_OVERLAY:"SHOW_OVERLAY",DISMISS_OVERLAY:"DISMISS_OVERLAY",CLOSE_TAB:"CLOSE_TAB"},r=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome,I={matches:["<all_urls>"],runAt:"document_start",main(e){console.log("[SEMD] Content script loaded");let t=window.location.href,n=null;o();function o(){s(t),w(),D()}function s(i){console.log(`[SEMD] Checking URL: ${i}`),r.runtime.sendMessage({type:d.CHECK_URL,payload:{url:i}},a=>{if(r.runtime.lastError){console.warn("[SEMD] Message error:",r.runtime.lastError.message);return}a?.success&&a.data?.result?.isMalicious&&u(i,a.data.result)})}function u(i,a){console.log("[SEMD] Malicious URL detected:",i),y({url:i,accuracy:a.accuracy,onProceed:()=>{console.log("[SEMD] User chose to proceed"),l()},onClose:()=>{console.log("[SEMD] User chose to close tab"),r.runtime.sendMessage({type:d.DISMISS_OVERLAY,action:"close"}),window.close()}})}function w(){window.addEventListener("popstate",()=>h()),window.addEventListener("hashchange",()=>h());const i=history.pushState.bind(history),a=history.replaceState.bind(history);history.pushState=(...p)=>{i(...p),h()},history.replaceState=(...p)=>{a(...p),h()},n=new MutationObserver(()=>{t!==window.location.href&&h()}),document.body&&n.observe(document.body,{childList:!0,subtree:!0})}function h(){const i=window.location.href;i!==t&&(console.log(`[SEMD] URL changed: ${t} -> ${i}`),t=i,l(),s(i))}function D(){r.runtime.onMessage.addListener((i,a,p)=>{const c=i;return c.type===d.CLOSE_TAB&&a.tab?.id?(r.tabs.remove(a.tab.id),p({success:!0}),!0):(c.type===d.SHOW_OVERLAY&&c.url&&(y({url:c.url,accuracy:c.accuracy||0,onProceed:()=>{r.runtime.sendMessage({type:d.DISMISS_OVERLAY,action:"proceed",requestId:c.requestId}),l()},onClose:()=>{r.runtime.sendMessage({type:d.DISMISS_OVERLAY,action:"close",requestId:c.requestId}),r.tabs.query({active:!0,currentWindow:!0}).then(x=>{x[0]&&r.tabs.remove(x[0].id)})}}),p({success:!0})),c.type===d.DISMISS_OVERLAY&&(l(),p({success:!0})),!0)})}e.onInvalidated(()=>{n&&(n.disconnect(),n=null),l()})}};function S(e,...t){}const A={debug:(...e)=>S(console.debug,...e),log:(...e)=>S(console.log,...e),warn:(...e)=>S(console.warn,...e),error:(...e)=>S(console.error,...e)};var L=class C extends Event{static EVENT_NAME=v("wxt:locationchange");constructor(t,n){super(C.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=n}};function v(e){return`${r?.runtime?.id}:content:${e}`}const _=typeof globalThis.navigation?.addEventListener=="function";function M(e){let t,n=!1;return{run(){n||(n=!0,t=new URL(location.href),_?globalThis.navigation.addEventListener("navigate",o=>{const s=new URL(o.destination.url);s.href!==t.href&&(window.dispatchEvent(new L(s,t)),t=s)},{signal:e.signal}):e.setInterval(()=>{const o=new URL(location.href);o.href!==t.href&&(window.dispatchEvent(new L(o,t)),t=o)},1e3))}}}var T=class g{static SCRIPT_STARTED_MESSAGE_TYPE=v("wxt:content-script-started");id;abortController;locationWatcher=M(this);constructor(t,n){this.contentScriptName=t,this.options=n,this.id=Math.random().toString(36).slice(2),this.abortController=new AbortController,this.stopOldScripts(),this.listenForNewerScripts()}get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return r.runtime?.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,n){const o=setInterval(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearInterval(o)),o}setTimeout(t,n){const o=setTimeout(()=>{this.isValid&&t()},n);return this.onInvalidated(()=>clearTimeout(o)),o}requestAnimationFrame(t){const n=requestAnimationFrame((...o)=>{this.isValid&&t(...o)});return this.onInvalidated(()=>cancelAnimationFrame(n)),n}requestIdleCallback(t,n){const o=requestIdleCallback((...s)=>{this.signal.aborted||t(...s)},n);return this.onInvalidated(()=>cancelIdleCallback(o)),o}addEventListener(t,n,o,s){n==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),t.addEventListener?.(n.startsWith("wxt:")?v(n):n,o,{...s,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),A.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){document.dispatchEvent(new CustomEvent(g.SCRIPT_STARTED_MESSAGE_TYPE,{detail:{contentScriptName:this.contentScriptName,messageId:this.id}})),window.postMessage({type:g.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:this.id},"*")}verifyScriptStartedEvent(t){const n=t.detail?.contentScriptName===this.contentScriptName,o=t.detail?.messageId===this.id;return n&&!o}listenForNewerScripts(){const t=n=>{!(n instanceof CustomEvent)||!this.verifyScriptStartedEvent(n)||this.notifyInvalidated()};document.addEventListener(g.SCRIPT_STARTED_MESSAGE_TYPE,t),this.onInvalidated(()=>document.removeEventListener(g.SCRIPT_STARTED_MESSAGE_TYPE,t))}};function V(){}function f(e,...t){}const O={debug:(...e)=>f(console.debug,...e),log:(...e)=>f(console.log,...e),warn:(...e)=>f(console.warn,...e),error:(...e)=>f(console.error,...e)};return(async()=>{try{const{main:e,...t}=I;return await e(new T("content",t))}catch(e){throw O.error('The content script "content" crashed on startup!',e),e}})()})();
content;