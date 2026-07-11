# placeholdercord native bridge

The native bridge lets a plugin call placeholdercord's native (Kotlin/placeholderxposed)
layer from JavaScript. You call a native method by name and get its result back as a promise.

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

## Read this first: never assume the bridge is on

Because the user can disable it, `window.placeholder` may be `undefined`. Destructuring it blindly
crashes the whole client:

```js
// WRONG. If the bridge is off this throws
// TypeError: Cannot read properties of undefined (reading 'native')
// and takes down the client.
const { native } = window.placeholder;
```

Always guard with optional chaining and bail with a message if it is missing:

```js
// RIGHT
const native = window.placeholder?.native;
if (!native) {
    showToast("Enable the Native Bridge plugin to use this feature");
    return;
}
await native.bubbles.configure({ avatarRadius: 30 });
```

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
await native.bubbles.setEnabled(true);          // or false
await native.bubbles.configure({
    avatarRadius: 30,      // percent, 0 square to 50 circle
    bubbleRadius: 40,      // corner radius
    bubbleColor: "#5865F2" // hex string, converted for you
});

// camera (virtual camera)
await native.camera.setMedia("/storage/emulated/0/DCIM/photo.jpg"); // path to jpg/mp4/gif
await native.camera.setMedia(null);             // disable, restore real camera

// files (inside the app's files/pyoncord directory)
const text = await native.fs.read("bubbles.json");
await native.fs.write("bubbles.json", JSON.stringify({ enabled: true }));
const there = await native.fs.exists("bubbles.json");

// app
await native.app.reload();

// discovery
const methods = await native.modules();
```

## Method catalog

The names below are what `native.modules()` returns. Anything here is callable via
`native.call(name, ...args)` even if it does not have a typed wrapper yet.

| Method | Purpose |
| --- | --- |
| `info` | Loader name and version code. |
| `modules` | List of every registered method name. |
| `test` | Echoes a sample object plus your args. Handy for a round-trip check. |
| `bubbles.hook` / `bubbles.unhook` | Turn native chat bubbles on or off. |
| `bubbles.configure` | Set avatar radius (percent), bubble radius, bubble color (int). |
| `camera.setMedia` | Pass a file path (jpg/mp4/gif) to replace the live camera feed in video calls; pass `null` to restore the real camera. |
| `fs.read` / `fs.write` / `fs.exists` / `fs.delete` | File access under files/pyoncord. |
| `fs.getConstants` | Native file path constants. |
| `app.reload` | Reload the app. |
| `plugins.states.read` / `plugins.states.write` | Read or write plugin enabled state. |
| `caches.modules.read` / `caches.modules.write` | Metro module cache. |
| `caches.assets.read` / `caches.assets.write` | Asset cache. |
| `alertError` | Show a native error alert. |
| `showRecoveryAlert` | Show the recovery alert. |
| `revenge.updater.clear` | Clear the updater state. |

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

Note this `await` restriction is only the `/eval` sandbox. Inside a real plugin (a normal module),
`await` works normally.

## Full example (a plugin)

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
