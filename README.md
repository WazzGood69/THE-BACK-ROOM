# The Back Room — server edition

This version keeps the Figma UI, adds a real shared server for accounts/friends/chats, and is installable in Chrome as a PWA.

## Run the server laptop

1. Install Node.js 20+.
2. From this folder run:
   - `npm install`
   - `npm run build`
   - `npm run server`
3. The server listens on `0.0.0.0:8787`.
4. On another computer on the same network, open `http://SERVER-LAPTOP-IP:8787`.
5. The first screen lets the user choose the server address and create/log into an account.

The server stores its database in `backroom-data.json` beside `server.mjs`.

## Chrome app

Because this is a PWA, Chrome can install it as an app from the address-bar install button (or Chrome menu → Install The Back Room) when served over HTTPS or from localhost.

## Important networking limitation

This is designed for an authorized network/LAN. It does **not** provide a proxy or tunnel intended to bypass school/work network filtering, firewalls, or access controls. If client-to-client traffic is blocked by the network, the server laptop will need to be placed on a network where the clients are allowed to reach it, or the network administrator can allow TCP port 8787.

## Chat

Chat data is now server-side instead of browser-local. Friend requests, DMs, groups, and messages synchronize between clients every few seconds, so two laptops can use the same Back Room server.
