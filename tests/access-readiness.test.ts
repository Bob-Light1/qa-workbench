import { describe, expect, it } from "vitest";
import { waitForAccess } from "../scripts/wait-for-access.mjs";

const origin = "http://localhost:5178";
const options = {
  url: "http://127.0.0.1:55321",
  origin,
  timeoutMs: 60,
  pollMs: 1,
};
const reply = (status: number, cors = origin) =>
  new Response(null, {
    status,
    headers: { "Access-Control-Allow-Origin": cors },
  });

describe("Access function readiness", () => {
  it("accepts the local gateway's wildcard for bearer-token requests", async () => {
    await waitForAccess({
      ...options,
      timeoutMs: 2000,
      request: async (_url: URL, init: RequestInit) =>
        reply(init.method === "OPTIONS" ? 204 : 401, "*"),
    });
  });
  it("waits through a gateway failure and checks the request handler", async () => {
    const methods: string[] = [];
    await waitForAccess({
      ...options,
      timeoutMs: 2000,
      request: async (_url: URL, init: RequestInit) => {
        methods.push(init.method!);
        expect(init.headers).not.toHaveProperty("Authorization");
        return reply(
          methods.length === 1 ? 503 : init.method === "OPTIONS" ? 204 : 401,
        );
      },
    });
    expect(methods).toEqual(["OPTIONS", "OPTIONS", "POST"]);
  });
  it("fails when preflight works but the request handler is unavailable", async () => {
    await expect(
      waitForAccess({
        ...options,
        request: async (_url: URL, init: RequestInit) =>
          reply(init.method === "OPTIONS" ? 204 : 503),
      }),
    ).rejects.toThrow("POST HTTP 503");
  });
  it("rejects anonymous success and a mismatched browser origin", async () => {
    for (const request of [
      async (_url: URL, init: RequestInit) =>
        reply(init.method === "OPTIONS" ? 204 : 200),
      async () => reply(204, "https://other.example"),
    ])
      await expect(waitForAccess({ ...options, request })).rejects.toThrow(
        "Access function unavailable",
      );
  });
  it("bounds unresponsive requests without exposing provider errors", async () => {
    await expect(
      waitForAccess({
        ...options,
        requestTimeoutMs: 10,
        request: async (_url: URL, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal!.addEventListener(
              "abort",
              () => reject(new Error("private-provider-details")),
              { once: true },
            );
          }),
      }),
    ).rejects.toThrow("request failed or timed out");
  });
});
