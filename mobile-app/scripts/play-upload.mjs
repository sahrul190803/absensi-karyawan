#!/usr/bin/env node
/**
 * Upload an Android App Bundle to Google Play using a service account.
 *
 * Usage:
 *   PLAY_SERVICE_ACCOUNT_JSON=C:\path\play-service-account.json \
 *     node scripts/play-upload.mjs --track internal --version-code 3
 *
 * The script creates a Play edit, uploads the AAB, updates the selected track,
 * and commits the edit. It does not create the Play app, fill declarations, or
 * upload store listing graphics; complete those in Play Console first.
 */
import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);

function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}

const packageName = arg("package", "id.lecarassa.hadirku");
const track = arg("track", "internal");
const versionCode = Number(arg("version-code", "3"));
const aabPath = resolve(
  arg("aab", "android/app/build/outputs/bundle/release/app-release.aab"),
);
const notesPath = resolve(
  arg("notes", "store-listing/release-notes-1.2.txt"),
);
const serviceAccountPath = resolve(
  process.env.PLAY_SERVICE_ACCOUNT_JSON || "play-service-account.json",
);
const dryRun = args.includes("--dry-run");

const TRACKS = new Set(["internal", "alpha", "beta", "production"]);
if (!TRACKS.has(track)) {
  throw new Error(`Track must be one of: ${[...TRACKS].join(", ")}`);
}
if (!Number.isInteger(versionCode) || versionCode < 1) {
  throw new Error("--version-code must be a positive integer.");
}
if (!existsSync(aabPath)) {
  throw new Error(`AAB not found: ${aabPath}`);
}
if (!existsSync(notesPath)) {
  throw new Error(`Release notes not found: ${notesPath}`);
}
if (!dryRun && !existsSync(serviceAccountPath)) {
  throw new Error(
    `Service account JSON not found: ${serviceAccountPath}. Set PLAY_SERVICE_ACCOUNT_JSON to a local file outside the repo.`,
  );
}

const notes = readFileSync(notesPath, "utf8").trim();
const aab = existsSync(aabPath) ? readFileSync(aabPath) : null;

if (dryRun) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        packageName,
        track,
        versionCode,
        aabPath,
        aabBytes: aab?.byteLength ?? 0,
        notesPath,
        notesLength: notes.length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const account = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
if (!account.client_email || !account.private_key) {
  throw new Error(
    "Service account JSON must contain client_email and private_key.",
  );
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  )}.${base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(account.private_key)
    .toString("base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`OAuth failed (${response.status}): ${body}`);
  }
  const token = JSON.parse(body).access_token;
  if (!token) throw new Error("OAuth response did not contain access_token.");
  return token;
}

async function call(token, method, url, body, contentType = "application/json") {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": contentType }),
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed (${response.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

const token = await accessToken();
const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}`;
let editId = null;
let committed = false;

try {
  const edit = await call(token, "POST", `${base}/edits`, "{}");
  editId = edit.id;
  if (!editId) throw new Error("Play API did not return an edit id.");
  console.log(`Created edit ${editId}`);

  const upload = await call(
    token,
    "POST",
    `https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/${packageName}/edits/${editId}/bundles?uploadType=media`,
    aab,
    "application/octet-stream",
  );
  const uploadedVersionCode = upload?.versionCode ?? versionCode;
  console.log(`Uploaded AAB, versionCode=${uploadedVersionCode}`);

  await call(
    token,
    "PUT",
    `${base}/edits/${editId}/tracks/${track}`,
    JSON.stringify({
      track,
      releases: [
        {
          name: `${uploadedVersionCode} (${track})`,
          versionCodes: [String(uploadedVersionCode)],
          status: "completed",
          releaseNotes: [{ language: "id-ID", text: notes }],
        },
      ],
    }),
  );
  console.log(`Updated ${track} track`);

  await call(token, "POST", `${base}/edits/${editId}:commit`);
  committed = true;
  console.log(`Committed edit ${editId}`);
  console.log(
    JSON.stringify({ ok: true, packageName, track, versionCode: uploadedVersionCode }, null, 2),
  );
} finally {
  if (editId && !committed) {
    try {
      await call(token, "DELETE", `${base}/edits/${editId}`);
      console.log(`Deleted uncommitted edit ${editId}`);
    } catch (error) {
      console.warn(`Could not delete edit ${editId}:`, String(error));
    }
  }
}
