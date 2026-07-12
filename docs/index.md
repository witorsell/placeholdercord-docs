---
layout: default
title: placeholdercord native bridge
description: Call the native layer from your plugins
---

<p class="hero-kicker">placeholdercord &middot; native bridge</p>
<h1 class="hero-title">Call native from JS.</h1>
<p class="hero-sub">The native bridge lets a plugin call placeholdercord's native (Kotlin/placeholderxposed) layer from JavaScript. You call a method by name and get its result back as a promise.</p>

<div class="bridge-hero">
  <div class="bridge-node bridge-node--js">
    <span class="bridge-node-label">JS &middot; your plugin</span>
    <code>native.bubbles.configure({ avatarRadius: 30 })</code>
  </div>
  <div class="bridge-link"><span class="bridge-dot"></span></div>
  <div class="bridge-node bridge-node--native">
    <span class="bridge-node-label">Native &middot; placeholderxposed</span>
    <code>draws a rounded bubble in MessageView</code>
  </div>
</div>

## The boundary

Native code does the work JS cannot: drawing chat bubbles, rounding avatars, hooking Discord's
native views. Your plugin does not ship native code. It **drives** the knobs the native side
exposes. So a "chat bubble plugin" is JS calling `bubbles.configure(...)`; the drawing stays
native.

Every call is asynchronous. There is no synchronous path, on purpose, so a bridge call can never
block the JS thread or drop frames.

## Enabling it

The bridge is a built-in plugin called **Native Bridge**, and it is **off by default**. The user
enables it under placeholdercord settings, Plugins, Native Bridge. While it is on, the API lives
at `window.placeholder.native`. While it is off, `window.placeholder` is `undefined`.

## Never assume the bridge is on

Because the user can disable it, `window.placeholder` may be `undefined`. Destructuring it blindly
crashes the whole client.

<div class="callout callout-bad" markdown="1">
  <p class="callout-label">Wrong</p>

```js
const { native } = window.placeholder;
```

  <p class="callout-note">If the bridge is off this throws <code>TypeError: Cannot read properties of undefined (reading 'native')</code> and takes down the client.</p>
</div>

<div class="callout callout-good" markdown="1">
  <p class="callout-label">Right</p>

```js
const native = window.placeholder?.native;
if (!native) {
    showToast("Enable the Native Bridge plugin to use this feature");
    return;
}
await native.bubbles.configure({ avatarRadius: 30 });
```
</div>

## API

### native.call(method, ...args)

The generic caller. Sends any registered native method by name and resolves to its return value,
or throws if the native method throws.

```js
const info = await native.call("info");        // { name, version }
const names = await native.call("modules");     // string[] of every callable method
await native.call("app.reload");
```

### Typed wrappers

Convenience wrappers over `native.call` for the common methods.

```js
// bubbles
native.bubbles.setEnabled(true);          // or false
native.bubbles.configure({
    avatarRadius: 30,      // percent, 0 square to 50 circle
    bubbleRadius: 40,      // corner radius
    bubbleColor: "#5865F2" // hex string, converted for you
});

// camera (virtual camera)
native.camera.setMedia("/storage/emulated/0/DCIM/photo.jpg"); // path to jpg/mp4/gif
native.camera.setMedia(null);             // disable, restore real camera

// files (inside the app's files/pyoncord directory)
native.fs.read("bubbles.json").then(text => console.log(text));
native.fs.write("bubbles.json", JSON.stringify({ enabled: true }));
native.fs.exists("bubbles.json").then(there => console.log(there));

// app
native.app.reload();

// discovery
native.modules().then(methods => console.log(methods));
```

## Method catalog

The names below are what `native.modules()` returns. Anything here is callable via
`native.call(name, ...args)` even if it does not have a typed wrapper yet. Grouped by namespace.

<div class="catalog">
  <div class="catalog-group">
    <p class="catalog-group-name">core</p>
    <dl>
      <div class="catalog-row"><dt><code>info</code></dt><dd>Loader name and version code.</dd></div>
      <div class="catalog-row"><dt><code>modules</code></dt><dd>List of every registered method name.</dd></div>
      <div class="catalog-row"><dt><code>test</code></dt><dd>Echoes a sample object plus your args. Handy for a round-trip check.</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">bubbles</p>
    <dl>
      <div class="catalog-row"><dt><code>bubbles.hook</code> / <code>bubbles.unhook</code></dt><dd>Turn native chat bubbles on or off.</dd></div>
      <div class="catalog-row"><dt><code>bubbles.configure</code></dt><dd>Set avatar radius (percent), bubble radius, bubble color (int).</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">camera</p>
    <dl>
      <div class="catalog-row"><dt><code>camera.setMedia</code></dt><dd>Pass a file path (jpg/mp4/gif) to replace the live camera feed in video calls; pass <code>null</code> to restore the real camera.</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">fs</p>
    <dl>
      <div class="catalog-row"><dt><code>fs.read</code> / <code>fs.write</code> / <code>fs.exists</code> / <code>fs.delete</code></dt><dd>File access under files/pyoncord.</dd></div>
      <div class="catalog-row"><dt><code>fs.getConstants</code></dt><dd>Native file path constants.</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">app</p>
    <dl>
      <div class="catalog-row"><dt><code>app.reload</code></dt><dd>Reload the app.</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">plugins &amp; caches</p>
    <dl>
      <div class="catalog-row"><dt><code>plugins.states.read</code> / <code>plugins.states.write</code></dt><dd>Read or write plugin enabled state.</dd></div>
      <div class="catalog-row"><dt><code>caches.modules.read</code> / <code>caches.modules.write</code></dt><dd>Metro module cache.</dd></div>
      <div class="catalog-row"><dt><code>caches.assets.read</code> / <code>caches.assets.write</code></dt><dd>Asset cache.</dd></div>
    </dl>
  </div>
  <div class="catalog-group">
    <p class="catalog-group-name">system</p>
    <dl>
      <div class="catalog-row"><dt><code>alertError</code></dt><dd>Show a native error alert.</dd></div>
      <div class="catalog-row"><dt><code>showRecoveryAlert</code></dt><dd>Show the recovery alert.</dd></div>
      <div class="catalog-row"><dt><code>revenge.updater.clear</code></dt><dd>Clear the updater state.</dd></div>
    </dl>
  </div>
</div>

## Quick test with /eval

To try the bridge without writing a plugin, enable the **Eval Command** (placeholdercord
settings, Developer), then run the `/eval` command with its **async** option set to `true`.

Two rules for the `/eval` box, both verified on device:

1. **Do not use the `await` keyword.** With **async = true**, the command already awaits the value
   you return (`await AsyncFunction(code)()`), so just `return` the promise. This build's runtime
   `Function`-constructor parser rejects a literal `await` and throws `SyntaxError ... ';' expected`.
2. **One `return <expression>` per run.** Multi-statement bodies (a `const` line, then an `if`,
   then more) and `import`/`export` also fail in this sandbox.

So `return <promise>`, async = true, one at a time:

```js
return window.placeholder.native.modules()
```
```js
return window.placeholder.native.bubbles.setEnabled(true)
```
```js
return window.placeholder.native.bubbles.configure({ avatarRadius: 50, bubbleRadius: 40, bubbleColor: "#5865F2" })
```

`modules()` returns the method list. `setEnabled` and `configure` return `undefined` with no
error, which means the call went through; scroll the channel and the bubbles restyle. To check the
off path, disable the plugin and run `return typeof window.placeholder` (prints `"undefined"`, no
crash).

## Async/await is unsupported

<div class="callout callout-warn">
  <p class="callout-label">Warning</p>
  <p class="callout-note">Do NOT use <code>async</code> or <code>await</code> anywhere in your plugin code. The Hermes JavaScript engine used in this build of Discord does not natively support <code>async</code>/<code>await</code>, and the default SWC compiler configuration excludes generator transformations to avoid bloated bundle sizes. The engine throws <code>SyntaxError: async functions are unsupported</code> immediately on evaluation, and your plugin silently fails to load. Use raw Promise chains (<code>.then()</code> and <code>.catch()</code>) instead.</p>
</div>

## Full example

This is a **plugin file**, not an `/eval` snippet. Install it as a plugin; do not paste it into
`/eval`. It turns on styled bubbles when it starts and guards for the bridge being off. Get
`showToast` from your plugin API (for example `vendetta.ui.toasts.showToast`); the guard below
falls back to a log so the sample runs anywhere.

```js
export default {
    start() {
        const native = window.placeholder?.native;
        if (!native) {
            console.warn("[my-plugin] Native Bridge is off; enable it to style bubbles");
            return;
        }
        native.bubbles.setEnabled(true);
        native.bubbles.configure({
            avatarRadius: 50,
            bubbleRadius: 40,
            bubbleColor: "#5865F2",
        });
    },
    stop() {
        window.placeholder?.native?.bubbles.setEnabled(false);
    },
};
```

## Notes

- The bridge needs a patched build with the current placeholderxposed module. If a call rejects
  with "FileReaderModule.readAsDataURL is unavailable", the native side is missing or out of date;
  repatch with the Manager.
- Config-style native changes (like bubbles) update native state immediately, but a message
  restyles only when its row is next drawn. Messages already on screen keep their old look until
  something re-renders them: scrolling, switching channels, a new message, or an app reload. You
  do not need to restart to see the change, just scroll the channel.
