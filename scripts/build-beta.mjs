import {
  copyFileSync,
  cpSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repositoryRoot, "01_DESENVOLVIMENTO");
const outputRoot = resolve(repositoryRoot, "dist-beta");

if (dirname(outputRoot) !== repositoryRoot) {
  throw new Error("O destino de build está fora do repositório.");
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
copyFileSync(
  join(appRoot, "desvelar-v1-corrigido.html"),
  join(outputRoot, "index.html"),
);
cpSync(join(appRoot, "css"), join(outputRoot, "css"), { recursive: true });
cpSync(join(appRoot, "js"), join(outputRoot, "js"), { recursive: true });

console.log("Beta preparado em dist-beta/.");
