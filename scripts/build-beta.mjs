import { createRequire } from "node:module";
import {
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = join(repositoryRoot, "01_DESENVOLVIMENTO");
const outputRoot = resolve(repositoryRoot, "dist-beta");
const require = createRequire(join(appRoot, "package.json"));
const { build } = require("esbuild");

if (dirname(outputRoot) !== repositoryRoot) {
  throw new Error("O destino de build está fora do repositório.");
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });

const entries = {
  auth: join(appRoot, "js", "entries", "auth.js"),
  app: join(appRoot, "js", "entries", "app.js"),
  style: join(appRoot, "css", "style.css"),
};

const result = await build({
  absWorkingDir: repositoryRoot,
  bundle: true,
  entryNames: "assets/[name]-[hash]",
  entryPoints: entries,
  format: "iife",
  legalComments: "none",
  metafile: true,
  minify: true,
  outdir: outputRoot,
  platform: "browser",
  target: "es2020",
});

function outputUrl(entryPoint) {
  const output = Object.entries(result.metafile.outputs).find(([, metadata]) =>
    metadata.entryPoint &&
    resolve(repositoryRoot, metadata.entryPoint) === resolve(entryPoint),
  );

  if (!output) {
    throw new Error(`O build não gerou um arquivo para ${entryPoint}.`);
  }

  const outputPath = resolve(repositoryRoot, output[0]);
  return `./${relative(outputRoot, outputPath).split(sep).join("/")}`;
}

const authUrl = outputUrl(entries.auth);
const appUrl = outputUrl(entries.app);
const styleUrl = outputUrl(entries.style);
const sourceHtml = readFileSync(
  join(appRoot, "desvelar-v1-corrigido.html"),
  "utf8",
);
const stylesheetPattern = /<link rel="stylesheet" href="\.\/css\/style\.css"\s*\/>/;

if (!stylesheetPattern.test(sourceHtml)) {
  throw new Error("Não foi possível localizar a folha de estilos de origem.");
}

const scriptPattern = /<script src="(?:\.\/js\/[^\"]+|https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.118\.0)"><\/script>/g;
const scriptTags = sourceHtml.match(scriptPattern) || [];
if (scriptTags.length < 2) {
  throw new Error("Não foi possível localizar os scripts de origem do app.");
}

let html = sourceHtml
  .replace(stylesheetPattern, `<link rel="stylesheet" href="${styleUrl}" />`)
  .replace(scriptPattern, "");

if (/<script src="\.\/js\//.test(html)) {
  throw new Error("O HTML publicado ainda referencia scripts de origem.");
}

const deferredScripts = [
  '    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0" defer></script>',
  `    <script src="${authUrl}" data-app-src="${appUrl}" defer></script>`,
].join("\n");

if (!html.includes("</body>")) {
  throw new Error("Não foi possível localizar o fim do documento HTML.");
}

html = html.replace("</body>", `${deferredScripts}\n  </body>`);
writeFileSync(join(outputRoot, "index.html"), html);

const bundleSizes = Object.entries({ auth: authUrl, app: appUrl, style: styleUrl })
  .map(([name, url]) => {
    const filePath = join(outputRoot, url.replace(/^\.\//, ""));
    return `${name}: ${(statSync(filePath).size / 1024).toFixed(1)} KB`;
  })
  .join(", ");

console.log(`Beta otimizado preparado em dist-beta/ (${bundleSizes}).`);
