/**
 * Askbase embeddable widget loader.
 * Usage:
 *   <script src="https://yourdomain.com/widget.js"
 *           data-token="EMBED_TOKEN"
 *           data-position="bottom-right|bottom-left"
 *           data-color="#7c5cff" async></script>
 */
(function () {
  "use strict";

  if (window.__askbaseWidgetLoaded) return;
  window.__askbaseWidgetLoaded = true;

  var script =
    document.currentScript ||
    document.querySelector("script[data-token][src*='widget.js']");
  if (!script) return;

  var token = script.getAttribute("data-token");
  if (!token) {
    console.warn("[Askbase] Missing data-token attribute");
    return;
  }

  var position = script.getAttribute("data-position") === "bottom-left"
    ? "bottom-left"
    : "bottom-right";
  var color = script.getAttribute("data-color") || "#7c5cff";
  var origin = new URL(script.src).origin;

  var sideProp = position === "bottom-left" ? "left" : "right";
  var Z = "2147483000";

  /* ---- floating bubble ---- */
  var bubble = document.createElement("button");
  bubble.setAttribute("aria-label", "Open chat");
  bubble.style.cssText =
    "position:fixed;bottom:20px;" + sideProp + ":20px;width:56px;height:56px;" +
    "border-radius:50%;border:none;cursor:pointer;z-index:" + Z + ";" +
    "background:" + color + ";box-shadow:0 8px 24px rgba(0,0,0,.28);" +
    "display:flex;align-items:center;justify-content:center;" +
    "transition:transform .2s ease,opacity .2s ease;padding:0;";
  bubble.onmouseenter = function () { bubble.style.transform = "scale(1.06)"; };
  bubble.onmouseleave = function () { bubble.style.transform = "scale(1)"; };

  var chatIcon =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var closeIcon =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  bubble.innerHTML = chatIcon;

  /* ---- iframe panel ---- */
  var frame = document.createElement("iframe");
  frame.title = "Askbase chat";
  frame.allow = "clipboard-write";
  frame.src =
    origin + "/widget/" + encodeURIComponent(token) +
    "?embedded=1&color=" + encodeURIComponent(color);
  frame.style.cssText =
    "position:fixed;bottom:90px;" + sideProp + ":20px;width:380px;height:600px;" +
    "max-height:calc(100vh - 110px);border:none;border-radius:16px;z-index:" + Z + ";" +
    "box-shadow:0 12px 48px rgba(0,0,0,.35);background:#fff;" +
    "opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;" +
    "transition:opacity .25s ease,transform .25s ease;";

  /* mobile: full screen */
  function applyMobileStyles() {
    if (window.innerWidth < 480) {
      frame.style.width = "100vw";
      frame.style.height = "100dvh";
      frame.style.maxHeight = "100dvh";
      frame.style.bottom = "0";
      frame.style[sideProp] = "0";
      frame.style.borderRadius = "0";
    } else {
      frame.style.width = "380px";
      frame.style.height = "600px";
      frame.style.maxHeight = "calc(100vh - 110px)";
      frame.style.bottom = "90px";
      frame.style[sideProp] = "20px";
      frame.style.borderRadius = "16px";
    }
  }
  applyMobileStyles();
  window.addEventListener("resize", applyMobileStyles);

  var open = false;
  function toggle() {
    open = !open;
    bubble.innerHTML = open ? closeIcon : chatIcon;
    bubble.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    if (open) {
      frame.style.opacity = "1";
      frame.style.transform = "translateY(0) scale(1)";
      frame.style.pointerEvents = "auto";
    } else {
      frame.style.opacity = "0";
      frame.style.transform = "translateY(12px) scale(.98)";
      frame.style.pointerEvents = "none";
    }
  }
  bubble.addEventListener("click", toggle);

  /* allow the iframe to request closing (mobile X button) */
  window.addEventListener("message", function (e) {
    if (e.origin !== origin) return;
    if (e.data && e.data.type === "askbase:close" && open) toggle();
  });

  document.body.appendChild(frame);
  document.body.appendChild(bubble);
})();
