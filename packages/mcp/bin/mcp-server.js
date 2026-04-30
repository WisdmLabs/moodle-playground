#!/usr/bin/env node
import { startServer } from "../src/index.js";

startServer(process.argv.slice(2));
