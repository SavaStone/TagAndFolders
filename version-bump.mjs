import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// 1. Update manifest.json
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { version } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// 2. Update versions.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = `Release ${targetVersion}`;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));