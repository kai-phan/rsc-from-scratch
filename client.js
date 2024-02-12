import { hydrateRoot } from "react-dom/client";

const root = hydrateRoot(document, getInitialClientJSX());

function getInitialClientJSX() {
  const clientJSX = JSON.parse(window.__INITIAL_CLIENT_JSX_STRING__, parseJSX);
  return clientJSX;
}

async function fetchClientJSX(pathname) {
  const response = await fetch(pathname + "?jsx");
  const jsxString = await response.text();
  const clientJSX = JSON.parse(jsxString, parseJSX);

  console.log(clientJSX)
  return clientJSX;
}

function parseJSX(key, value) {
  if (value === "$RE") {
    // This is our special marker we added on the server.
    // Restore the Symbol to tell React that this is valid JSX.
    return Symbol.for("react.element");
  } else if (typeof value === "string" && value.startsWith("$$")) {
    // This is a string starting with $. Remove the extra $ added by the server.
    return value.slice(1);
  } else {
    return value;
  }
}

async function navigate(pathname) {
  let currentPath = window.location.pathname;

  const clientJSX = await fetchClientJSX(pathname);

  if (pathname === currentPath) {
    root.render(clientJSX);
  }
}

window.addEventListener("click", (e) => {
  // Only listen to link clicks.
  if (e.target.tagName !== "A") {
    return;
  }
  // Ignore "open in a new tab".
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
    return;
  }
  // Ignore external URLs.
  const href = e.target.getAttribute("href");
  if (!href.startsWith("/")) {
    return;
  }
  // Prevent the browser from reloading the page but update the URL.
  e.preventDefault();
  window.history.pushState(null, null, href);
  // Call our custom logic.
  navigate(href);
}, true);

window.addEventListener("popstate", () => {
  // When the user presses Back/Forward, call our custom logic too.
  navigate(window.location.pathname);
});