#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Simple test runner that bypasses complex React Native/Expo setup
const testFiles = [
  'src/hooks/__tests__/useCaptureLimits.test.ts',
  'src/hooks/__tests__/useOfflineCapture.test.ts', 
  'src/hooks/__tests__/useCaptureProcessing.test.ts',
];

console.log('Running hook tests with minimal setup...\n');

// Use ts-node to run TypeScript tests directly
const command = `npx ts-node --project tsconfig.json --transpile-only -r ${path.join(__dirname, 'test-bootstrap.js')} ${testFiles.join(' ')}`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
});