// lib/games/jsxHarness.test-helper.mjs
// TEST-ONLY: render a SERVER component (a .js file with JSX) to static HTML under plain `node --test`.
// Compiles the component with Next's own bundled SWC (next/dist/build/swc transformSync, automatic JSX
// runtime), rewrites its imports to absolute file URLs, swaps Next-runtime-only modules for tiny stubs
// (next/link -> <a href>, next/font/google -> a static className), and renders with react-dom/server.
// Not a *.test.mjs, so the suite runner does not execute it directly; tests import it.

import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const swc = require('next/dist/build/swc');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');

const JSX_RUNTIME = pathToFileURL(require.resolve('react/jsx-runtime')).href;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cnp-jsx-'));

function writeStub(name, code) {
  const f = path.join(TMP, name + '.mjs');
  fs.writeFileSync(f, code);
  return pathToFileURL(f).href;
}
const STUBS = {
  'next/link': writeStub('next-link', "import { jsx } from '" + JSX_RUNTIME + "';\nexport default function Link({ href, children, ...rest }) { return jsx('a', { href, ...rest, children }); }\n"),
  'next/font/google': writeStub('next-font', "const f = () => ({ variable: 'font-stub', className: 'font-stub' });\nexport const Exo_2 = f;\n"),
};

let n = 0;
// Compile + import a component module (path relative to the repo root). Returns the module namespace.
// opts.stubs (optional): { 'import specifier': 'module source' } -- replaces an import the harness cannot
// load as-is (e.g. a JSX child component, since only the target file is compiled). '@/x' imports resolve
// to <repo>/x(.js), mirroring jsconfig's alias, for plain-JS lib modules.
export async function loadComponent(relPath, opts) {
  const extra = {};
  for (const [spec, code] of Object.entries((opts && opts.stubs) || {})) {
    extra[spec] = writeStub('stub-' + spec.replace(/[^a-z0-9]+/gi, '-') + '-' + (n++), code);
  }
  if (swc.loadBindings) await swc.loadBindings();
  const abs = path.join(ROOT, relPath);
  const out = swc.transformSync(fs.readFileSync(abs, 'utf8'), {
    filename: path.basename(abs),
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } }, target: 'es2022' },
    module: { type: 'es6' }, sourceMaps: false,
  });
  const code = out.code.replace(/from\s+(['"])([^'"]+)\1/g, (m, q, spec) => {
    if (spec === 'react/jsx-runtime') return 'from ' + q + JSX_RUNTIME + q;
    if (extra[spec]) return 'from ' + q + extra[spec] + q;
    if (STUBS[spec]) return 'from ' + q + STUBS[spec] + q;
    if (spec.startsWith('@/')) {
      const target = path.join(ROOT, spec.slice(2));
      return 'from ' + q + pathToFileURL(path.extname(target) ? target : target + '.js').href + q;
    }
    if (spec.startsWith('.')) return 'from ' + q + pathToFileURL(path.resolve(path.dirname(abs), spec)).href + q;
    throw new Error('jsxHarness: unhandled import "' + spec + '" in ' + relPath);
  });
  const f = path.join(TMP, path.basename(abs, '.js') + '-' + (n++) + '.mjs');
  fs.writeFileSync(f, code);
  return import(pathToFileURL(f).href);
}

export function render(Component, props, children) {
  return renderToStaticMarkup(React.createElement(Component, props, children));
}
export { React };
