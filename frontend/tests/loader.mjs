import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const SRC_DIR = fileURLToPath(new URL("../src", import.meta.url));
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".mjs", "/index.ts", "/index.tsx", "/index.js"];

function resolveCandidate(basePath) {
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = resolveCandidate(path.join(SRC_DIR, specifier.slice(2)));
    if (target) {
      return nextResolve(target, context);
    }
  }

  if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const target = resolveCandidate(path.resolve(parentDir, specifier));
    if (target) {
      return nextResolve(target, context);
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && (url.endsWith(".ts") || url.endsWith(".tsx"))) {
    const filePath = fileURLToPath(url);
    const rawSource = readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(rawSource, {
      fileName: filePath,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    return {
      format: "module",
      shortCircuit: true,
      source: transpiled.outputText,
    };
  }
  return nextLoad(url, context);
}
