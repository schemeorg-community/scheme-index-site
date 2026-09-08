import { createApplication } from '@angular/platform-browser';
import { createComponent, DOCUMENT } from '@angular/core';
import { DashEntryComponent } from './app/dash-entry-page/dash-entry-page.component';
import { SearchItem, SearchItemSingle } from './app/index.types';

import { JSDOM } from 'jsdom';
import * as fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';


const allowedNameRegex = /[^a-zA-Z0-9-_]/g;

function mangle(name: string): string {
  return name.replaceAll(allowedNameRegex, (str) => { return `u${str.codePointAt(0)}` });
}

async function main() {
  const dom = new JSDOM('<!DOCTYPE html><html><head><meta charset="utf-8"></head><body class="theme-dark"></body></html>');
  const window = dom.window;
  
  globalThis.document = window.document;
  
  const appRef = await createApplication({
    providers: [{
      provide: DOCUMENT,
      useValue: window.document
    }]
  });
  
  const hostElement = window.document.getElementsByTagName('body')[0];
  const environmentInjector = appRef.injector;
  const componentRef = createComponent(DashEntryComponent, { hostElement, environmentInjector });
  appRef.attachView(componentRef.hostView);
  
  const types = JSON.parse(fs.readFileSync('src/assets/types.json').toString()) as SearchItem[];
  
  fs.rmSync('./dist/dash/docsets', { force: true, recursive: true });

  const docsetRoot = './dist/dash/docsets/scheme_index.docset';
  const documentsRoot = docsetRoot + '/Contents/Resources/Documents'
  fs.mkdirSync(documentsRoot, { recursive: true });
  
  const db = new DatabaseSync(docsetRoot + '/Contents/Resources/docSet.dsidx');
  db.exec('CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT)');
  db.exec('CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path)');

  const insertStatement = db.prepare(`INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?)`);
  db.exec('BEGIN');
  
  for (const type of types) {
    let entries: SearchItemSingle[];
    if (type.kind == 'single') {
      entries = [type];
    } else {
      entries = type.entries;
    }
    const mangledLib = mangle(type.lib);
    const mangledFile = mangle(entries[0].name);
    const path = `${mangledLib}/${mangledFile}.html`;
    for (const e of entries) {
      let type = "Define";
      switch (e.signature.type) {
        case 'function':
          type = 'Function';
          break;
        case 'syntax':
          type = 'Macro';
          break;
        case 'value':
          type = 'Constant'
          break;
      }
      insertStatement.run(e.name, type, path);
    }
    
    componentRef.instance.item.set(type);
    componentRef.changeDetectorRef.detectChanges();
    await appRef.whenStable();

    if (!fs.existsSync(`${documentsRoot}/${mangledLib}`)) {
      fs.mkdirSync(`${documentsRoot}/${mangledLib}`);
    }
    fs.writeFileSync(`${documentsRoot}/${path}`, dom.serialize(), { encoding: 'utf-8', flush: true });
  }
  db.exec('COMMIT');

  fs.writeFileSync(docsetRoot + '/Contents/Info.plist',
   `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
    <key>CFBundleIdentifier</key>
    <string>scheme_index</string>
    <key>CFBundleName</key>
    <string>Scheme Index</string>
    <key>DocSetPlatformFamily</key>
    <string>Scheme</string>
    <key>isDashDocset</key>
    <true/>
    </dict>
    </plist>`)

  db.close();
  
}

main();
