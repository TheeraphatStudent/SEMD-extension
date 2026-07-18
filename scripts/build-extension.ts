#!/usr/bin/env bun

import { createWriteStream, existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import archiver from "archiver";
import yaml from "js-yaml";

type BrowserTarget = "chrome" | "firefox";

type ExtensionConfig = {
  extension?: {
    manifest_version?: number;
    app?: {
      name?: string;
      version?: string;
      description?: string;
      title?: string;
    };
    chrome_extension?: {
      permissions?: string[];
      host_permissions?: string[];
    };
    firefox_addons?: {
      permissions?: string[];
      host_permissions?: string[];
      browser_specific_settings?: Record<string, unknown>;
    };
    api?: {
      default_base_url?: string;
      predict_path?: string;
      access_code_validation_path?: string;
    };
  };
};

const target = process.argv[2] as BrowserTarget | undefined;
const shouldPackage = process.argv.includes("--package");

if (target !== "chrome" && target !== "firefox") {
  throw new Error("Usage: bun scripts/build-extension.ts <chrome|firefox> [--package]");
}

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist", target);
const outDir = path.join(rootDir, "out");
const extensionAssetDir = "next";
const manifestTemplatePath = path.join(rootDir, "src", "extension", "manifests", `${target}.json`);
const configPath = path.join(rootDir, "extension.conf.yaml");
const iconSourceDir = path.join(rootDir, target === "chrome" ? "chrome_extension" : "firefox_addons", "icons");

await main();

async function main() {
  await ensurePopupBuild();
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });
  await copyPopupAssets(outDir, distDir);
  await bundleRuntime(target, distDir);
  await copyIcons(iconSourceDir, path.join(distDir, "icons"));
  await writeManifest(target, manifestTemplatePath, distDir, configPath);
  await validateManifest(distDir);

  if (shouldPackage) {
    await packageExtension(target, distDir);
  }
}

async function ensurePopupBuild() {
  if (
    existsSync(path.join(rootDir, "out", "index.html")) &&
    existsSync(path.join(rootDir, "out", "_next"))
  ) {
    return;
  }

  const build = Bun.spawnSync([process.execPath, "x", "next", "build"], {
    cwd: rootDir,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (build.exitCode !== 0) {
    throw new Error("Next.js popup build failed.");
  }
}

async function copyPopupAssets(source: string, destination: string) {
  const popupFiles = ["index.html", "404.html", "index.txt", "_next"];

  for (const entry of popupFiles) {
    const sourcePath = path.join(source, entry);
    if (!existsSync(sourcePath)) {
      if (entry === "404.html" || entry === "index.txt") {
        continue;
      }
      throw new Error(`Missing required popup asset: ${entry}`);
    }

    const destinationEntry = entry === "_next" ? extensionAssetDir : entry;
    await cp(sourcePath, path.join(destination, destinationEntry), { recursive: true });
  }

  await rewritePackagedAssetReferences(destination);
}

async function bundleRuntime(browserTarget: BrowserTarget, destination: string) {
  const config = await loadConfig();
  const runtimeConfig = config.extension?.api ?? {};
  const bundleTempDir = path.join(destination, ".runtime");

  const define = {
    SEMD_RUNTIME_CONFIG: JSON.stringify({
      defaultApiBaseUrl: runtimeConfig.default_base_url ?? process.env.SEMD_API_BASE_URL,
      predictPath: runtimeConfig.predict_path ?? "/api/v1/predict/predict",
      accessCodeValidationPath:
        runtimeConfig.access_code_validation_path ?? process.env.SEMD_ACCESS_CODE_VALIDATION_PATH,
    }),
  };

  for (const [entrypoint, outfile] of [
    [path.join(rootDir, "src", "extension", "background", "index.ts"), "background.js"],
    [path.join(rootDir, "src", "extension", "content", "index.ts"), "content.js"],
  ] as const) {
    await rm(bundleTempDir, { recursive: true, force: true });
    await mkdir(bundleTempDir, { recursive: true });

    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir: bundleTempDir,
      target: "browser",
      format: "iife",
      bundle: true,
      minify: true,
      sourcemap: "none",
      define,
    });

    if (!result.success) {
      throw new Error(`Runtime bundle failed for ${browserTarget}:${outfile}`);
    }

    const generatedFile = result.outputs[0]?.path ?? path.join(bundleTempDir, "index.js");
    await cp(generatedFile, path.join(destination, outfile));
  }

  await rm(bundleTempDir, { recursive: true, force: true });
}

async function copyIcons(source: string, destination: string) {
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true });
}

async function writeManifest(
  browserTarget: BrowserTarget,
  templatePath: string,
  destination: string,
  configFile: string,
) {
  const rawTemplate = JSON.parse(await readFile(templatePath, "utf8")) as Record<string, unknown>;
  const config = await loadConfig(configFile);
  const extensionConfig = config.extension;
  const browserConfig:
    | ExtensionConfig["extension"]["chrome_extension"]
    | ExtensionConfig["extension"]["firefox_addons"]
    | undefined =
    browserTarget === "chrome"
      ? extensionConfig?.chrome_extension
      : extensionConfig?.firefox_addons;

  if (extensionConfig?.manifest_version) {
    rawTemplate.manifest_version = extensionConfig.manifest_version;
  }

  if (extensionConfig?.app) {
    rawTemplate.name = extensionConfig.app.name ?? rawTemplate.name;
    rawTemplate.version = extensionConfig.app.version ?? rawTemplate.version;
    rawTemplate.description = extensionConfig.app.description ?? rawTemplate.description;

    if (rawTemplate.action && typeof rawTemplate.action === "object") {
      (rawTemplate.action as Record<string, unknown>).default_title =
        extensionConfig.app.title ?? (rawTemplate.action as Record<string, unknown>).default_title;
    }
  }

  if (browserConfig?.permissions) {
    rawTemplate.permissions = browserConfig.permissions;
  }

  if (browserConfig?.host_permissions) {
    rawTemplate.host_permissions = browserConfig.host_permissions;
  }

  if (
    browserTarget === "firefox" &&
    browserConfig &&
    "browser_specific_settings" in browserConfig &&
    browserConfig.browser_specific_settings
  ) {
    rawTemplate.browser_specific_settings = browserConfig.browser_specific_settings;
  }

  await writeFile(path.join(destination, "manifest.json"), JSON.stringify(rawTemplate, null, 2));
}

async function validateManifest(destination: string) {
  const manifestPath = path.join(destination, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;

  const requiredFiles = new Set<string>(["index.html"]);

  const action = manifest.action as Record<string, unknown> | undefined;
  if (action?.default_popup && typeof action.default_popup === "string") {
    requiredFiles.add(action.default_popup);
  }

  const background = manifest.background as Record<string, unknown> | undefined;
  if (background?.service_worker && typeof background.service_worker === "string") {
    requiredFiles.add(background.service_worker);
  }

  if (Array.isArray(background?.scripts)) {
    for (const script of background.scripts) {
      if (typeof script === "string") requiredFiles.add(script);
    }
  }

  const contentScripts = manifest.content_scripts as Array<Record<string, unknown>> | undefined;
  for (const entry of contentScripts ?? []) {
    for (const script of (entry.js as string[] | undefined) ?? []) {
      requiredFiles.add(script);
    }
  }

  const icons = manifest.icons as Record<string, string> | undefined;
  for (const iconPath of Object.values(icons ?? {})) {
    requiredFiles.add(iconPath);
  }

  for (const relativePath of requiredFiles) {
    const absolutePath = path.join(destination, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`Manifest references missing file: ${relativePath}`);
    }
  }
}

async function rewritePackagedAssetReferences(destination: string) {
  const files = await collectFiles(destination);

  for (const filePath of files) {
    if (!isRewritableTextAsset(filePath)) {
      continue;
    }

    const contents = await readFile(filePath, "utf8");
    const rewritten = contents
      .replaceAll("/_next/", `/${extensionAssetDir}/`)
      .replaceAll('"_next/', `"${extensionAssetDir}/`)
      .replaceAll("'_next/", `'${extensionAssetDir}/`)
      .replaceAll("=/_next/", `=/${extensionAssetDir}/`);

    const finalContents = filePath.endsWith(".html")
      ? await externalizeInlineScripts(destination, filePath, rewritten)
      : rewritten;

    if (finalContents !== contents) {
      await writeFile(filePath, finalContents);
    }
  }
}

async function externalizeInlineScripts(destination: string, filePath: string, contents: string) {
  const matches = [...contents.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (matches.length === 0) {
    return contents;
  }

  const htmlName = path.basename(filePath, path.extname(filePath));
  const inlineDir = path.join(destination, extensionAssetDir, "static", "inline");
  await mkdir(inlineDir, { recursive: true });

  let index = 0;
  let rewritten = contents;

  for (const match of matches) {
    const [fullMatch, scriptBody] = match;
    const scriptFile = `${htmlName}-inline-${index}.js`;
    const outputPath = path.join(inlineDir, scriptFile);
    const srcPath = `/${extensionAssetDir}/static/inline/${scriptFile}`;

    await writeFile(outputPath, `${scriptBody.trim()}\n`);
    rewritten = rewritten.replace(fullMatch, `<script src="${srcPath}"></script>`);
    index += 1;
  }

  return rewritten;
}

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function isRewritableTextAsset(filePath: string) {
  return (
    filePath.endsWith(".html") ||
    filePath.endsWith(".txt") ||
    filePath.endsWith(".js") ||
    filePath.endsWith(".css")
  );
}

async function packageExtension(browserTarget: BrowserTarget, destination: string) {
  const exportDir = path.join(rootDir, "export");
  await mkdir(exportDir, { recursive: true });

  if (browserTarget === "chrome") {
    await createArchive(destination, path.join(exportDir, "semd-chrome.zip"));
    return;
  }

  await createArchive(destination, path.join(exportDir, "semd-addon.xpi"));
  await createArchive(destination, path.join(exportDir, "semd-addon.zip"));
}

async function createArchive(sourceDir: string, outputPath: string) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const stream = createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  const done = new Promise<void>((resolve, reject) => {
    stream.on("close", () => resolve());
    archive.on("error", reject);
  });

  archive.pipe(stream);
  archive.directory(sourceDir, false);
  await archive.finalize();
  await done;
}

async function loadConfig(filePath = configPath): Promise<ExtensionConfig> {
  if (!existsSync(filePath)) {
    return {};
  }

  const contents = await readFile(filePath, "utf8");
  return (yaml.load(contents) as ExtensionConfig | undefined) ?? {};
}
