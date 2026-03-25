#!/usr/bin/env node
import chalk from "chalk";
import { program, Option } from "commander";
import frida from "frida";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";
import { performance } from "node:perf_hooks";
const styleReset = chalk.reset;
const styleFile = chalk.cyan.bold;
const styleLocation = chalk.yellow.bold;
const styleCode = chalk.gray;
const CATEGORY_STYLE = {
    error: chalk.red.bold,
    warning: chalk.yellow.bold,
    info: chalk.blueBright,
    suggestion: chalk.greenBright,
};
async function main() {
    program
        .usage("[options]")
        .argument("<module>", "TypeScript/JavaScript module to compile")
        .option("-o, --output <file>", "write output to <file>", "-")
        .option("-w, --watch", "watch for changes and recompile", false)
        .option("-S, --no-source-maps", "omit source-maps", false)
        .option("-c, --compress", "minify code", false)
        .option("-v, --verbose", "be verbose", false)
        .addOption(new Option("-F, --output-format <format>", "desired output format")
        .choices(["unescaped", "hex-bytes", "c-string"])
        .default("unescaped"))
        .addOption(new Option("-B, --bundle-format <format>", "desired bundle format")
        .choices(["esm", "iife"])
        .default("esm"))
        .addOption(new Option("-T, --type-check <mode>", "desired type-checking mode")
        .choices(["full", "none"])
        .default("full"));
    program.parse();
    const opts = program.opts();
    const projectRoot = process.cwd();
    const entrypoint = ".";
    const outputPath = opts.output;
    const verbose = opts.watch || opts.verbose;
    const compilerOpts = {
        projectRoot,
        outputFormat: opts.outputFormat,
        bundleFormat: opts.bundleFormat,
        typeCheck: opts.typeCheck,
        sourceMaps: opts.sourceMaps
            ? frida.SourceMaps.Included
            : frida.SourceMaps.Omitted,
        compression: opts.compress
            ? frida.JsCompression.Terser
            : frida.JsCompression.None,
    };
    let compilationStarted = null;
    const compiler = new frida.Compiler();
    if (verbose) {
        compiler.starting.connect(onStarting);
        compiler.finished.connect(onFinished);
    }
    compiler.diagnostics.connect(onDiagnostics);
    if (opts.watch) {
        compiler.output.connect(onOutput);
        try {
            await compiler.watch(entrypoint, compilerOpts);
        }
        catch (e) {
            stop();
            throw e;
        }
        process.on("SIGINT", stop);
        process.on("SIGTERM", stop);
        function onOutput(bundle) {
            try {
                writeBundle(bundle);
            }
            catch (e) {
                console.error(chalk.redBright(e.message));
                process.exitCode = 1;
                stop();
            }
        }
        function stop() {
            compiler.output.disconnect(onOutput);
        }
    }
    else {
        const bundle = await compiler.build(entrypoint, compilerOpts);
        writeBundle(bundle);
    }
    function writeBundle(bundle) {
        if (outputPath === "-") {
            process.stdout.write(bundle.replace(/📦[\s\S]*?✄\n?/, ''));
        }
        else {
            try {
                fs.writeFileSync(outputPath, bundle.replace(/📦[\s\S]*?✄\n?/, ''), {
                    encoding: "utf-8",
                });
                console.log(chalk.blueBright(`Compiled in ${Math.round(performance.now() - compilationStarted)}ms`));
                console.log(chalk.greenBright(`Wrote bundle to ${outputPath}`));
            }
            catch (e) {
                throw new Error(`Unable to write bundle: ${e.message}`);
            }
        }
    }
    function onStarting() {
        compilationStarted = performance.now();
        if (opts.watch) {
            readline.cursorTo(process.stdout, 0, 0);
            readline.clearScreenDown(process.stdout);
        }
        console.log(formatCompiling(entrypoint, projectRoot));
    }
    function onFinished() {
        const timeFinished = performance.now();
        console.log(formatCompiled(entrypoint, projectRoot, compilationStarted, timeFinished));
    }
    function onDiagnostics(diagnostics) {
        for (const diag of diagnostics) {
            console.log(formatDiagnostic(diag, projectRoot));
        }
    }
}
function formatCompiling(scriptPath, cwd) {
    const name = formatFilename(scriptPath, cwd);
    return (styleReset("") +
        "Compiling " +
        styleFile(name) +
        styleReset("") +
        "...");
}
function formatCompiled(scriptPath, cwd, timeStarted, timeFinished) {
    const name = formatFilename(scriptPath, cwd);
    const elapsed = Math.floor(timeFinished - timeStarted);
    return (styleReset("") +
        "Compiled " +
        styleFile(name) +
        styleReset("") +
        styleCode(` (${elapsed} ms)`) +
        styleReset(""));
}
function formatDiagnostic(diag, cwd) {
    const { category, code, text, file } = diag;
    let prefix = "";
    if (file !== undefined) {
        const filename = formatFilename(file.path, cwd);
        const line = file.line + 1;
        const character = file.character + 1;
        const pathSegment = styleFile(filename);
        const lineSegment = styleLocation(String(line));
        const charSegment = styleLocation(String(character));
        prefix = `${pathSegment}:${lineSegment}:${charSegment} - `;
    }
    const categoryStyler = CATEGORY_STYLE[category] ?? styleReset;
    const styledCategory = categoryStyler(category);
    const styledCode = styleCode(`TS${code}`);
    return `${prefix}${styledCategory}${styleReset("")} ${styledCode}${styleReset("")}: ${text}`;
}
function formatFilename(filePath, cwd) {
    const absoluteCwd = path.resolve(cwd);
    const absolutePath = path.resolve(filePath);
    if (absolutePath.startsWith(absoluteCwd + path.sep)) {
        return absolutePath.slice(absoluteCwd.length + 1);
    }
    return filePath;
}
main().catch((e) => {
    setImmediate(() => {
        console.error(chalk.red.bold(e.message));
        process.exitCode = 1;
    });
});
