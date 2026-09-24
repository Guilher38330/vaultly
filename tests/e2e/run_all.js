#!/usr/bin/env node

/**
 * Master E2E Test Runner for Vaultly/AuraSpace Frontend Enhancements
 * 
 * Orchestrates and executes tests across all tiers:
 * - Tier 1: Feature Coverage (R1A, R1B, R2, R3, R4, R5)
 * - Tier 2: Boundary & Corner Cases
 * - Tier 3: Pairwise Cross-Feature Interactions
 * - Tier 4: Real-World Application Scenarios (S1 - S5)
 * 
 * Usage:
 *   node tests/e2e/run_all.js
 *   or via Sail:
 *   docker compose exec -T laravel.test node tests/e2e/run_all.js
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIERS = [
  {
    id: 'Tier 1',
    name: 'Feature Coverage (R1A, R1B, R2, R3, R4, R5)',
    file: path.resolve(__dirname, 'tiers/tier1_feature_coverage.test.js'),
    minThreshold: 30
  },
  {
    id: 'Tier 2',
    name: 'Boundary & Corner Cases',
    file: path.resolve(__dirname, 'tiers/tier2_boundary_corner.test.js'),
    minThreshold: 30
  },
  {
    id: 'Tier 3',
    name: 'Pairwise Cross-Feature Interactions',
    file: path.resolve(__dirname, 'tiers/tier3_cross_feature.test.js'),
    minThreshold: 10
  },
  {
    id: 'Tier 4',
    name: 'Real-World Application Scenarios (S1-S5)',
    file: path.resolve(__dirname, 'tiers/tier4_real_world_scenarios.test.js'),
    minThreshold: 5
  },
  ...(process.argv.includes('--with-tier5') || process.argv.includes('--all') || process.env.RUN_TIER5 === '1' ? [{
    id: 'Tier 5',
    name: 'White-box Financial Engine & Math Hardening',
    file: path.resolve(__dirname, 'tiers/tier5_whitebox_financial_hardening.test.js'),
    minThreshold: 30
  }] : [])
];

function runTier(tier) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const child = spawn(process.execPath, ['--test', tier.file], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      const cleanStdout = stdout.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

      // Parse test counts from node:test TAP/spec reporter
      const totalMatch = cleanStdout.match(/ℹ tests\s+(\d+)/i);
      const passMatch = cleanStdout.match(/ℹ pass\s+(\d+)/i);
      const failMatch = cleanStdout.match(/ℹ fail\s+(\d+)/i);

      const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      const pass = passMatch ? parseInt(passMatch[1], 10) : (code === 0 ? total : 0);
      const fail = failMatch ? parseInt(failMatch[1], 10) : (code !== 0 ? 1 : 0);

      resolve({
        id: tier.id,
        name: tier.name,
        code,
        durationMs,
        total,
        pass,
        fail,
        passedThreshold: total >= tier.minThreshold,
        rawOutput: stdout,
        rawError: stderr
      });
    });
  });
}

async function main() {
  console.log('\n================================================================');
  console.log('  VAULTLY / AURASPACE FRONTEND ENHANCEMENTS — E2E TEST RUNNER   ');
  console.log('================================================================\n');

  const results = [];
  let grandTotal = 0;
  let grandPass = 0;
  let grandFail = 0;
  let allThresholdsPassed = true;
  const startTime = Date.now();

  for (const tier of TIERS) {
    process.stdout.write(`Executing ${tier.id}: ${tier.name}... `);
    const result = await runTier(tier);
    results.push(result);

    grandTotal += result.total;
    grandPass += result.pass;
    grandFail += result.fail;

    if (result.code === 0 && result.fail === 0) {
      console.log(`\x1b[32mPASS\x1b[0m (${result.pass}/${result.total} tests, ${result.durationMs}ms)`);
    } else {
      console.log(`\x1b[31mFAIL\x1b[0m (${result.fail} failed, ${result.durationMs}ms)`);
      if (result.rawError) {
        console.error(result.rawError);
      }
    }

    if (!result.passedThreshold) {
      allThresholdsPassed = false;
    }
  }

  const totalDuration = Date.now() - startTime;

  console.log('\n----------------------------------------------------------------');
  console.log('                       E2E SUMMARY MATRIX                       ');
  console.log('----------------------------------------------------------------');
  console.log(' Tier   | Target Area                     | Tests | Pass | Fail | Req ');
  console.log('--------|---------------------------------|-------|------|------|-----');
  for (const r of results) {
    const tierPad = r.id.padEnd(6, ' ');
    const namePad = r.name.slice(0, 31).padEnd(31, ' ');
    const totalPad = String(r.total).padStart(5, ' ');
    const passPad = String(r.pass).padStart(4, ' ');
    const failPad = String(r.fail).padStart(4, ' ');
    const reqStatus = r.passedThreshold ? ' PASS' : ' FAIL';
    console.log(` ${tierPad} | ${namePad} | ${totalPad} | ${passPad} | ${failPad} | ${reqStatus}`);
  }
  console.log('----------------------------------------------------------------');
  const grandTotalPad = String(grandTotal).padStart(5, ' ');
  const grandPassPad = String(grandPass).padStart(4, ' ');
  const grandFailPad = String(grandFail).padStart(4, ' ');
  console.log(` TOTAL  | All Tiers (Requirement >= 75)   | ${grandTotalPad} | ${grandPassPad} | ${grandFailPad} | ${grandTotal >= 75 ? ' PASS' : ' FAIL'}`);
  console.log('================================================================');

  if (grandFail === 0 && grandTotal >= 75 && allThresholdsPassed) {
    console.log(`\x1b[32m\n✓ ALL ${grandTotal} E2E TESTS PASSED SUCCESSFULLY IN ${totalDuration}ms!\x1b[0m\n`);
    process.exit(0);
  } else {
    console.error(`\x1b[31m\n✖ E2E SUITE FAILED: ${grandFail} failures or requirement unmet.\x1b[0m\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in E2E test runner:', err);
  process.exit(1);
});
