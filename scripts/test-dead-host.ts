import { isDeadHostError, probeHost } from "../src/lib/publications/dead-host";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL ${msg}`);
  } else {
    console.log(`ok  ${msg}`);
  }
}

assert(isDeadHostError("dead-host: ENOTFOUND"), "classifies dead-host prefix");
assert(isDeadHostError("getaddrinfo ENOTFOUND weekly.example"), "classifies ENOTFOUND");
assert(isDeadHostError("connect ECONNREFUSED 1.2.3.4:443"), "classifies ECONNREFUSED");
assert(!isDeadHostError("pub-timeout-300s"), "timeouts are retryable, not dead");
assert(!isDeadHostError("robots.txt disallows crawling"), "robots block is not dead");
assert(!isDeadHostError(null), "null is not dead");

const missing = await probeHost("https://this-host-should-not-exist-aa-overnight-9f3.example/");
assert(!missing.ok && isDeadHostError(missing.reason), "DNS probe marks missing host dead");

const localhost = await probeHost("https://localhost/");
assert(localhost.ok, "localhost DNS resolves (alive for skip-dead purposes)");

if (failed) {
  console.error(`${failed} dead-host tests failed`);
  process.exit(1);
}
console.log("All dead-host tests passed.");
