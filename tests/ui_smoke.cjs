const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/lab.html'), 'utf8');
const report = JSON.parse(fs.readFileSync(path.join(root, 'results.json'), 'utf8'));
const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(m => [m[1], {value: '', innerHTML: '', textContent: '', hidden: false}]));
nodes.get('mode').value = 'fixed';
const context = vm.createContext({document: {getElementById: id => {
  assert(nodes.has(id), `Unknown element: ${id}`); return nodes.get(id);
}}, fetch: async () => ({ok: true, json: async () => report}), setTimeout, Blob, URL});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
setImmediate(() => {
  assert.equal(nodes.get('status').hidden, true, nodes.get('status').textContent);
  assert.equal((nodes.get('methods').innerHTML.match(/<tr/g) || []).length, 13);
  assert.equal((nodes.get('draws').innerHTML.match(/<tr/g) || []).length, 11);
  assert(nodes.get('methodSummary').textContent.includes('Longest absence'));
  assert(nodes.get('methodSummary').textContent.includes('0 exact 6/6 matches'));
  assert(nodes.get('methodSummary').textContent.includes('objective has not been achieved'));
  assert.equal(nodes.get('exactStatus').textContent, '0 / 13');
  nodes.get('mode').value = 'rolling'; nodes.get('mode').onchange();
  assert(nodes.get('modeNote').textContent.includes('earlier September'));
  nodes.get('method').value = 'frequency'; nodes.get('method').onchange();
  assert(nodes.get('methodSummary').textContent.includes('Hot numbers'));
  assert(nodes.get('methodSummary').textContent.includes('0.82'));
  assert(nodes.get('draws').innerHTML.includes('Not matched'));
  console.log('Dashboard smoke check passed: initial render and both controls.');
});

