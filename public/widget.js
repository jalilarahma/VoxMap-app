/**
 * VoxMap Live Pulse Widget
 * Embed the daily question on any website.
 *
 * Usage:
 * <div id="voxmap-widget"></div>
 * <script src="https://vox-map-app.vercel.app/widget.js"></script>
 *
 * Or with options:
 * <script src="https://vox-map-app.vercel.app/widget.js"
 *   data-theme="dark"
 *   data-size="full"
 *   data-container="my-widget">
 * </script>
 */
(function() {
  "use strict";

  // Find the script tag to read data attributes
  var scripts = document.getElementsByTagName("script");
  var currentScript = scripts[scripts.length - 1];

  var theme = currentScript.getAttribute("data-theme") || "dark";
  var size = currentScript.getAttribute("data-size") || "full";
  var containerId = currentScript.getAttribute("data-container") || "voxmap-widget";
  var widgetHost = currentScript.src.replace(/\/widget\.js.*$/, "");

  // Build widget URL
  var widgetUrl = widgetHost + "/widget?theme=" + theme + "&size=" + size;

  // Find or create container
  var container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    currentScript.parentNode.insertBefore(container, currentScript);
  }

  // Create iframe
  var iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.style.width = "100%";
  iframe.style.maxWidth = "480px";
  iframe.style.height = size === "compact" ? "220px" : "280px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "16px";
  iframe.style.overflow = "hidden";
  iframe.style.display = "block";
  iframe.style.margin = "0 auto";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("title", "VoxMap Live Poll");
  iframe.setAttribute("allow", "web-share");

  container.appendChild(iframe);

  // Listen for resize messages from widget
  window.addEventListener("message", function(event) {
    if (event.data && event.data.type === "voxmap-resize") {
      iframe.style.height = event.data.height + "px";
    }
  });
})();
