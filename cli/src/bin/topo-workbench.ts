#!/usr/bin/env node
import { main } from '../lib/cli.ts';
// Every error ends here as one line and a failing exit code, never a stack trace.
try { process.exitCode = await main(); }
catch (error) { console.error(`topo-workbench: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }
