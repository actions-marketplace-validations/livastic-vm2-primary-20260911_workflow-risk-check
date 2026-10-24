import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../docs/index.html",import.meta.url),"utf8");
const readme=readFileSync(new URL("../README.md",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
const PAYEE="0x4e3106520E40af30870caFE78da1B1e7110eD98E";
const BASE_USDC="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";

test("free checker keeps a separate, plainly disclosed opt-in support section",()=>{
 assert.match(html,/<section class="container" id="support" aria-labelledby="support-title">/);
 assert.match(html,/<a href="#support">Support free tools<\/a>/);
 assert.match(html,/The local-first browser checker and GitHub Action are free/);
 assert.match(html,/This is <strong>not<\/strong> a product purchase, escrow, invoice or payment for a review/);
 assert.match(html,/No service, support priority, refund, or deliverable is promised in exchange/);
 assert.match(html,/neither a link click nor this donation address demonstrates that a tip or sale occurred/i);
 assert.match(html,/scanner itself never connects to your wallet/i);
});

test("one exact original public receiver, network and token are unambiguous",()=>{
 assert.ok(html.includes('id="support-address">'+PAYEE+'</code>'));
 assert.ok(html.includes("chain ID 8453"));
 assert.ok(html.includes(BASE_USDC));
 assert.ok(html.includes('https://basescan.org/address/'+PAYEE));
 assert.ok(readme.includes(PAYEE));
 assert.ok(readme.includes(BASE_USDC));
 assert.ok(readme.includes("does **not** buy an audit"));
});

test("published support is selectable on mobile and cannot induce a paid workflow",()=>{
 assert.match(css,/\.support-address\{[^}]*overflow-wrap:anywhere/);
 const support=html.slice(html.indexOf('id="support"'),html.indexOf('class="faq container"'));
 assert.doesNotMatch(support,/<script|onclick=|connectwallet|approve\(/i);
 assert.match(support,/Wrong-chain transfers and network fees are your responsibility/);
 assert.match(support,/Never share recovery phrases, private keys or approval permissions/);
 assert.match(html,/id="checker"/);
 assert.match(html,/id="preflight"/);
 assert.match(html,/id="service"/);
});
