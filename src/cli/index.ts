#!/usr/bin/env node
// Contour CLI Entry Point

import { Command } from 'commander';
import { createStartCommand, createCacheCommand, getVersion } from './commands/index.js';

const program = new Command();

program
    .name('contour')
    .description('Professional API mock server from OpenAPI specifications')
    .version(getVersion());

program.addCommand(createStartCommand());
program.addCommand(createCacheCommand());

program.parse();
