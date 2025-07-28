WebSH – Navigate and inspect websites using bash commands.
===================================

## Install

- Clone the repo
- `npm install`
- `npx exec tsc`

You can execute the `build/websh.js` file directly from bash (might need permissions first).
I would recommend to link the `build/websh.js` into your `$PATH` (f.e.: `~/.local/bin`, if your system supports that).

## Usage

```
  websh close                         Closes the current session (if any)
  websh navigate-to <url>             open given URL
  websh click <selector>              Click on element(s)
  websh enter-text <selector> <text>  Enter text into element(s)
  websh get-html <selector>           Get element(s) HTML
```

