#!/usr/bin/env node
import { main } from '../lib/cli.js';
// Every error ends here as one line and a failing exit code, never a stack trace.
try { process.exitCode = await main(); }
catch (error) { console.error(`topo-workbench: ${error.message}`); process.exitCode = 1; }
