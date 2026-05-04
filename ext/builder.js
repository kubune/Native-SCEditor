import fs from 'fs';

const args = process.argv;

const COMPRESS = args.includes('-c');
console.log(`COMPRESS: ${COMPRESS}`);

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf-8'));
const formatBundle = (bundle) => bundle.split(/\r?\n/).slice(3).join('\n');

const project = process.cwd();
const TS_CONFIG = readJson(`${project}/tsconfig.json`);
const PACKAGE_JSON = readJson(`${project}/package.json`);

const main = PACKAGE_JSON.main;

async function build() {
    const frida = await import('frida');

    const compiler = new frida.Compiler();

    const options = {
        project,
        outputFormat: "unescaped",
        bundleFormat: "esm",
        typeCheck: "full",
        sourceMaps: "omitted",
        compression: COMPRESS ? "terser" : "none"
    }

    let bundle = formatBundle(await compiler.build(main, options));

    fs.existsSync("dist") || fs.mkdirSync("dist");

    fs.writeFileSync(`${project}/dist/index.js`, bundle);
    
    const dummy = await frida.attach(0);
    const bytecodeScript = await dummy.compileScript(bundle);

    fs.writeFileSync(`${project}/dist/index.bin`, bytecodeScript);
}

build();