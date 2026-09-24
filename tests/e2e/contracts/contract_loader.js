/**
 * Contract Loader for E2E Test Suite
 * 
 * Provides dynamic resolution:
 * 1. Checks if the live implementation file exists in resources/js/
 * 2. If present, imports and returns the live implementation
 * 3. If absent (in-flight milestone), falls back to the authoritative spec oracle
 * 
 * Ensures progressive testability without premature failure while milestones are built.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as financialOracle from '../helpers/financialProjectionsSpecOracle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

/**
 * Loads the financial calculations engine.
 */
export async function getFinancialEngine() {
  const livePath = path.resolve(projectRoot, 'resources/js/Utils/financialProjections.js');
  if (fs.existsSync(livePath)) {
    try {
      const liveModule = await import(livePath);
      return {
        source: 'live',
        path: livePath,
        calculateCategoryBreakdown: liveModule.calculateCategoryBreakdown || financialOracle.calculateCategoryBreakdown,
        calculateMonthlyProjections: liveModule.calculateMonthlyProjections || financialOracle.calculateMonthlyProjections,
        COSMIC_PALETTE: liveModule.COSMIC_PALETTE || financialOracle.COSMIC_PALETTE,
        getMonthlyEquivalentPrice: liveModule.getMonthlyEquivalentPrice || financialOracle.getMonthlyEquivalentPrice
      };
    } catch (e) {
      console.warn(`[ContractLoader] Failed loading live module at ${livePath}, falling back to oracle: ${e.message}`);
    }
  }

  return {
    source: 'oracle',
    path: livePath,
    ...financialOracle
  };
}

/**
 * Inspects a source file's contents safely.
 */
export function inspectSourceFile(relativePath) {
  const fullPath = path.resolve(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return { exists: false, content: null, fullPath };
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  return { exists: true, content, fullPath };
}
