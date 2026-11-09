/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella

Tests of the built hooks (npm test builds first) in a DOM of jsdom with React's act.
 */

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = require('react');
const {act} = React;
const {createRoot} = require('react-dom/client');
const {useDataboxSelector} = require('../dist/lib/useDataboxSelector');
const {useDataboxTracking} = require('../dist/lib/useDataboxTracking');
const {shallowEqual} = require('../dist/lib/utils/shallowEqual');

/** A databox as the zation client hands it out: data and its change event. */
function fakeDatabox(data) {
    const listeners = new Set();
    return {
        data,
        onDataChange(listener) {listeners.add(listener);},
        offDataChange(listener) {listeners.delete(listener);},
        /** A change as the client makes it: new objects along the changed path. */
        set(next) {this.data = next; for (const listener of listeners) listener();},
        /** A change made in place (an older client). */
        mutate(change) {change(this.data); for (const listener of listeners) listener();},
        listenerCount: () => listeners.size
    };
}

async function render(element) {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(element));
    return {container, unmount: () => act(async () => root.unmount())};
}

test('useDataboxSelector re-renders a component only when its selected part changes', async () => {
    const db = fakeDatabox({volume: {level: 40}, mode: {id: 'film'}});
    const renders = {volume: 0, mode: 0};
    function Volume() {
        renders.volume++;
        const volume = useDataboxSelector(db, (data) => data && data.volume);
        return React.createElement('span', {id: 'volume'}, String(volume.level));
    }
    function Mode() {
        renders.mode++;
        const mode = useDataboxSelector(db, (data) => data && data.mode);
        return React.createElement('span', {id: 'mode'}, mode.id);
    }
    const {container, unmount} = await render(React.createElement(React.Fragment, null,
        React.createElement(Volume), React.createElement(Mode)));
    assert.deepEqual(renders, {volume: 1, mode: 1});

    await act(async () => db.set({...db.data, volume: {level: 41}}));
    assert.equal(container.querySelector('#volume').textContent, '41');
    assert.deepEqual(renders, {volume: 2, mode: 1});

    await act(async () => db.set({...db.data, mode: {id: 'music'}}));
    assert.equal(container.querySelector('#mode').textContent, 'music');
    assert.deepEqual(renders, {volume: 2, mode: 2});

    await unmount();
    assert.equal(db.listenerCount(), 0);
});

test('useDataboxSelector compares a built selection with shallowEqual', async () => {
    const one = {id: 'a', on: true}, two = {id: 'b', on: false}, three = {id: 'c', on: true};
    const db = fakeDatabox([one, two, three]);
    let renders = 0;
    function On() {
        renders++;
        const on = useDataboxSelector(db, (data) => (data || []).filter((item) => item.on), shallowEqual);
        return React.createElement('span', null, on.map((item) => item.id).join(','));
    }
    const {container, unmount} = await render(React.createElement(On));
    assert.equal(renders, 1);
    //b changes but stays off: the selection holds the same items
    await act(async () => db.set([one, {id: 'b', on: false, level: 3}, three]));
    assert.equal(renders, 1);
    await act(async () => db.set([one, {id: 'b', on: true}, three]));
    assert.equal(container.textContent, 'a,b,c');
    assert.equal(renders, 2);
    await unmount();
});

test('useDataboxTracking re-renders on every change, also when the data changes in place', async () => {
    const db = fakeDatabox({level: 1});
    let renders = 0;
    function Level() {
        renders++;
        const data = useDataboxTracking(db);
        return React.createElement('span', null, String(data.level));
    }
    const {container, unmount} = await render(React.createElement(Level));
    await act(async () => db.mutate((data) => {data.level = 2;}));
    assert.equal(container.textContent, '2');
    await act(async () => db.set({level: 3}));
    assert.equal(container.textContent, '3');
    assert.equal(renders, 3);
    await unmount();
});

test('shallowEqual compares one level deep', () => {
    const item = {id: 1};
    assert.equal(shallowEqual([item], [item]), true);
    assert.equal(shallowEqual([item], [{id: 1}]), false);
    assert.equal(shallowEqual({a: item, b: 2}, {a: item, b: 2}), true);
    assert.equal(shallowEqual({a: 1}, {a: 1, b: undefined}), false);
    assert.equal(shallowEqual([1], {0: 1}), false);
    assert.equal(shallowEqual(null, null), true);
});
