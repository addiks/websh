WebSH – Navigate and inspect websites using bash commands.
===================================

## What is this?
This is a small tool to enable writing end-to-end tests directly in bash scripts.
In cases where tools like cypress would be overkill or if you don't want to or can't install
anything into the actual project, this could be a useful zero-install & -config solution.

WebSH will start a mini-daemon when first called, this daemon then uses [jsdom][jsdom] internally
in order to emulate an actual browser. The daemon is tied to the process-ID of the process
that invoked WebSH, so all further calls to WebSH will use the same daemon-process.
The daemon will terminate when the associated parent (bash-) process exits or when
it has not been used for 5 minutes (to prevent zombie processes).
If a daemon for the current parent-process cannot be found, WebSH will traverse the
parental process-hierarchy to find a valid daemon/session, this enables you to
continue the WebSH-session in child-processes (f.e. bash sub-processes).

Please note that javascript execution is disabled by default and has to be enabled
per session using the "run-scripts-dangerously" command.
If you want to use this **MAKE SURE TO ONLY RUN TRUSTED JAVASCRIPT** because there
are ways to escape the JS sandbox and any untrusted javascript could (in theory)
execute arbitrary commands on your machine! You have been warned.
For more details, see the [jsdom][jsdom] documentation.

[jsdom]: https://github.com/jsdom/jsdom

## Usage

```
  websh close                         Closes the current session (if any)
  websh run-scripts-dangerously       Enables scripts (Only run trusted JS!)
  websh navigate-to <url>             open given URL
  websh click <selector>              Click on element(s)
  websh enter-text <selector> <text>  Enter text into element(s)
  websh get-html <selector>           Get element(s) HTML
```

## Example

```bash
#!/bin/bash

npm run internal-dev-server &

websh run-scripts-dangerously
websh navigate-to "http://localhost:8080/our-service-site/"

HEADER=$( websh get-html "a.title" )
if [[ $HEADER != *"Registration Page"* ]]; then
    echo "Failure: Could not load registration page!"
    exit 1
fi

websh click ".top_bar > #register_btn"
websh enter-text ".register-form > input#username" "Jim Exampleman"
websh enter-text ".register-form > input#email" "jim@example.orm"
websh enter-text ".register-form > input#password" "p@ssw0rd"
websh click ".register-form > button.submit"

RESULT=$( websh get-html ".content > p.result" )
if [[ $RESULT == *"Registration successful!"* ]]; then
    echo "Test successful"
    exit 0
else
    echo "Failure: Something went wrong during registration!"
    echo $( websh get-html ".error" )
    echo 2
fi
```

## Install

- Clone the repo
- `npm install`
- `npx exec tsc`

You can execute the `build/websh.js` file directly from bash (might need permissions first).
I would recommend to link the `build/websh.js` into your `$PATH` (f.e.: `~/.local/bin`, if your system supports that).

## TODO
- Add a "get-text" command (like get-text but with stripped html)
- Add a way to upload files to forms on page (an "enter-file <selector> <filepath>" command?)
- Provide a way to "install" (make executable) websh (from github?) with one command (Docker? webpack?)
- Maybe add a way to get the HTML in JSON format? Then one could use the "jq" command to traverse content.