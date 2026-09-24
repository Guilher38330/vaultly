/**
 * Container Command Runner & Quality Verifier
 * 
 * Verifies R5 (Container Build & Quality):
 * - Auto-detects execution environment (inside Docker Sail container or host)
 * - Verifies PHPUnit test suite pass rate (87/87) with ANSI escape code stripping
 * - Verifies Pint formatting (0 violations)
 * - Verifies npm build asset compilation
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';

export class ContainerRunner {
  /**
   * Returns true if already executing inside the container.
   */
  static isInsideContainer() {
    return fs.existsSync('/var/www/html') || fs.existsSync('/.dockerenv');
  }

  /**
   * Executes a command inside the container context.
   * If already inside the container, runs the command directly.
   * If running on host, proxies via `docker compose exec -T laravel.test`.
   */
  static execInContainer(command, options = {}) {
    const isInside = this.isInsideContainer();
    const fullCmd = isInside ? command : `docker compose exec -T laravel.test ${command}`;
    const timeout = options.timeout || 120000;

    try {
      const stdout = execSync(fullCmd, {
        encoding: 'utf8',
        timeout,
        cwd: isInside ? '/var/www/html' : (options.cwd || process.cwd()),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return {
        success: true,
        exitCode: 0,
        output: stdout,
        error: null
      };
    } catch (err) {
      return {
        success: false,
        exitCode: err.status || 1,
        output: err.stdout ? err.stdout.toString() : '',
        error: err.stderr ? err.stderr.toString() : err.message
      };
    }
  }

  /**
   * Verifies PHPUnit test suite status.
   */
  static runPhpUnit(filter = null) {
    const filterArg = filter ? ` --filter=${filter}` : '';
    const res = this.execInContainer(`php artisan test${filterArg}`);
    // Strip ANSI escape codes
    const cleanOutput = (res.output || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const passedMatch = cleanOutput.match(/Tests:\s+(\d+)\s+passed/i);
    const passedCount = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const isPassing = res.exitCode === 0 && !cleanOutput.includes('FAILED');

    return {
      success: isPassing,
      exitCode: res.exitCode,
      passedCount,
      outputSnippet: cleanOutput.slice(-300)
    };
  }

  /**
   * Verifies Pint style check.
   */
  static runPintCheck() {
    const res = this.execInContainer(`./vendor/bin/pint --test`);
    const cleanOutput = (res.output || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const isPassing = res.exitCode === 0;

    return {
      success: isPassing,
      exitCode: res.exitCode,
      outputSnippet: cleanOutput.slice(-200)
    };
  }

  /**
   * Verifies asset compilation.
   */
  static runViteBuild() {
    const res = this.execInContainer(`npm run build`);
    const cleanOutput = (res.output || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    const isPassing = res.exitCode === 0 && cleanOutput.includes('built in');

    return {
      success: isPassing,
      exitCode: res.exitCode,
      outputSnippet: cleanOutput.slice(-300)
    };
  }
}
