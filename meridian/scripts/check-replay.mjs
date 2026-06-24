/**
 * 回放校验入口（Node 端）
 *
 * 目的：用 Vite SSR 把 TS 模块加载进 Node，调用 `runReplaySuite`，对每个 segment
 * 的解法路径做自动化通关校验。任何路径未通关、超时、触发非预期重置或缺路径
 * 都会让脚本以非零退出码结束，从而挡住 CI。
 *
 * 保持与 `check-determinism.mjs` 一致风格：纯 Node，无新依赖。
 */

import { createServer } from "vite";

const failures = [];

/**
 * 把单个回放结果折叠为可读诊断行
 *
 * @param result 单条回放结果
 * @returns 形如 "segment/path: <reason> ..." 的字符串
 */
function describe(result) {
  return `${result.segmentId}/${result.pathId}: reason=${result.reason} reachedExit=${result.reachedExit} resets=${result.resetCount} frames=${result.framesRun}`;
}

/**
 * 启动 Vite 开发服务器（中间件模式），加载回放模块并执行套件
 *
 * @returns 无返回值；以进程退出码表达成败
 */
async function main() {
  const server = await createServer({ server: { middlewareMode: true } });
  try {
    const replayModule = await server.ssrLoadModule("/src/dev/replay.ts");
    const dataModule = await server.ssrLoadModule("/src/data/index.ts");

    // 消费与 main.ts 同一份有序 segment 列表，避免 fixture 漂移
    const segments = dataModule.segments;
    const results = replayModule.runReplaySuite(segments);

    for (const result of results) {
      console.log(describe(result));
      const ok =
        result.reason === "won" &&
        result.reachedExit &&
        result.resetCount === 0;
      if (!ok) {
        failures.push(result);
      }
    }

    if (failures.length > 0) {
      console.error(`Replay harness failed: ${failures.length} path(s) did not win`);
      process.exitCode = 1;
      return;
    }

    console.log(`Replay harness passed: ${results.length} path(s) won`);

    // M4：选择点分支覆盖（每个 choicePoint 段需 whole + shortcut，且代价行为正确）
    const branchProblems = replayModule.checkBranchCoverage(segments);
    if (branchProblems.length > 0) {
      console.error("Branch coverage failed:");
      for (const problem of branchProblems) {
        console.error(`  ${problem}`);
      }
      process.exitCode = 1;
      return;
    }
    console.log("Branch coverage passed: all choice points cover whole + shortcut");

    // M4：结局可达性（四种结局都能由 authored 选择组合命中）
    const reach = replayModule.endingReachabilityReport(segments);
    console.log(`Endings reachable: ${reach.observed.join(", ")}`);
    if (reach.missing.length > 0) {
      console.error(`Ending reachability failed: missing ${reach.missing.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    console.log("Ending reachability passed: all four endings reachable");
  } finally {
    await server.close();
  }
}

main().catch((err) => {
  console.error("Replay harness crashed");
  console.error(err);
  process.exitCode = 1;
});
