import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const scanRoots = [path.join(appRoot, "src", "engine"), path.join(appRoot, "src", "game")];
const forbiddenPatterns = [
  { label: "Math.random", pattern: /\bMath\s*\.\s*random\b/g },
  { label: "Date.now", pattern: /\bDate\s*\.\s*now\b/g },
  { label: "new Date", pattern: /\bnew\s+Date\b/g },
  { label: "performance.now", pattern: /\bperformance\s*\.\s*now\b/g },
];

/**
 * 递归枚举目录下需要扫描的源码文件
 *
 * @param root 起始目录
 * @returns 源码文件绝对路径列表
 */
async function collectSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(entryPath));
      continue;
    }

    if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * 计算匹配项所在的源码行号
 *
 * @param source 完整源码文本
 * @param index 匹配项在源码文本中的字符下标
 * @returns 从 1 开始的行号
 */
function lineNumberForIndex(source, index) {
  let line = 1;

  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source.charCodeAt(cursor) === 10) {
      line += 1;
    }
  }

  return line;
}

/**
 * 扫描单个文件中的确定性禁用项
 *
 * @param filePath 待扫描文件绝对路径
 * @returns 命中的诊断信息列表
 */
async function scanFile(filePath) {
  const source = await readFile(filePath, "utf8");
  const hits = [];

  for (const { label, pattern } of forbiddenPatterns) {
    pattern.lastIndex = 0;

    for (const match of source.matchAll(pattern)) {
      const index = match.index ?? 0;
      const relativePath = path.relative(appRoot, filePath).split(path.sep).join("/");
      hits.push(`${relativePath}:${lineNumberForIndex(source, index)} ${label}`);
    }
  }

  return hits;
}

/**
 * 执行确定性扫描并设置进程退出码
 *
 * @returns 无返回值
 */
async function main() {
  const filesByRoot = await Promise.all(scanRoots.map((root) => collectSourceFiles(root)));
  const files = filesByRoot.flat();
  const hitsByFile = await Promise.all(files.map((filePath) => scanFile(filePath)));
  const hits = hitsByFile.flat();

  if (hits.length > 0) {
    console.error("Determinism guard failed");
    console.error(hits.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(`Determinism guard passed: scanned ${files.length} files`);
}

await main();
