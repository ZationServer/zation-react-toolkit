/*
Author: Ing. Luca Gian Scaringella
GitHub: LucaCode
Copyright(c) Ing. Luca Gian Scaringella

Tests of the built hooks (npm test builds first) in a DOM of jsdom with React's act.
 */

const {test, mock} = require('node:test');
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
const {useDatabox} = require('../dist/lib/useDatabox');
const {useConnected} = require('../dist/lib/useConnected');
const {useNextReconnect} = require('../dist/lib/useNextReconnect');
const {useAuthenticated} = require('../dist/lib/useAuthenticated');
const {useAuthTokenPayload} = require('../dist/lib/useAuthTokenPayload');
const {useRequest} = require('../dist/lib/useRequest');
const {DATABOX_RELEASE_DELAY} = require('../dist/lib/utils/sharedDatabox');
const {Client} = require('zation-client');

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

/** A client as useDatabox sees it: its databoxes count their connects and disconnects. */
function fakeDataboxClient() {
    const client = Object.create(Client.prototype);
    client.created = [];
    client.databox = (identifier) => {
        const db = fakeDatabox(undefined);
        db.identifier = identifier;
        db.connects = [];
        db.disconnects = 0;
        db.connect = async (member) => {db.connects.push(member);};
        db.disconnect = async () => {db.disconnects++;};
        client.created.push(db);
        return db;
    };
    return client;
}

function Box({client, identifier, member}) {
    const [data] = useDatabox(client, identifier, member).withTracking();
    return React.createElement('span', null, String(data));
}

test('useDatabox shares one databox and disconnects it a moment after the last component', async () => {
    mock.timers.enable({apis: ['setTimeout']});
    try {
        const client = fakeDataboxClient();
        const first = await render(React.createElement(Box, {client, identifier: 'cinema'}));
        const second = await render(React.createElement(Box, {client, identifier: 'cinema'}));
        assert.equal(client.created.length, 1);
        const [db] = client.created;
        assert.deepEqual(db.connects, [undefined]);

        await act(async () => db.set(7));
        assert.equal(first.container.textContent, '7');
        assert.equal(second.container.textContent, '7');

        await first.unmount();
        await second.unmount();
        mock.timers.tick(DATABOX_RELEASE_DELAY - 1);
        assert.equal(db.disconnects, 0);
        //mounted again within the delay: same databox, no new connect
        const again = await render(React.createElement(Box, {client, identifier: 'cinema'}));
        assert.equal(again.container.textContent, '7');
        assert.equal(client.created.length, 1);
        assert.equal(db.connects.length, 1);

        await again.unmount();
        mock.timers.tick(DATABOX_RELEASE_DELAY);
        assert.equal(db.disconnects, 1);
        const later = await render(React.createElement(Box, {client, identifier: 'cinema'}));
        assert.equal(client.created.length, 2);
        assert.deepEqual(client.created[1].connects, [undefined]);
        await later.unmount();
    }
    finally {mock.timers.reset();}
});

test('useDatabox keeps one databox per member', async () => {
    mock.timers.enable({apis: ['setTimeout']});
    try {
        const client = fakeDataboxClient();
        const one = await render(React.createElement(Box, {client, identifier: 'room', member: {id: 1}}));
        const same = await render(React.createElement(Box, {client, identifier: 'room', member: {id: 1}}));
        const two = await render(React.createElement(Box, {client, identifier: 'room', member: {id: 2}}));
        assert.equal(client.created.length, 2);
        assert.deepEqual(client.created.map((db) => db.connects), [[{id: 1}], [{id: 2}]]);
        await one.unmount();
        await same.unmount();
        await two.unmount();
        mock.timers.tick(DATABOX_RELEASE_DELAY);
        assert.deepEqual(client.created.map((db) => db.disconnects), [1, 1]);
    }
    finally {mock.timers.reset();}
});

function BoxWhen({client, identifier, enabled}) {
    const [data] = useDatabox(client, identifier, undefined, {enabled}).withTracking();
    return React.createElement('span', null, String(data));
}

test('useDatabox connects only while enabled', async () => {
    mock.timers.enable({apis: ['setTimeout']});
    try {
        const client = fakeDataboxClient();
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);
        const show = (enabled) => act(async () => root.render(React.createElement(BoxWhen, {client, identifier: 'identity', enabled})));

        await show(false);
        assert.equal(container.textContent, 'undefined');
        mock.timers.tick(DATABOX_RELEASE_DELAY);
        assert.deepEqual(client.created.map((db) => db.connects), [[]]);

        await show(true);
        const [db] = client.created;
        assert.deepEqual(db.connects, [undefined]);
        await act(async () => db.set('luca'));
        assert.equal(container.textContent, 'luca');

        await show(false);
        mock.timers.tick(DATABOX_RELEASE_DELAY - 1);
        assert.equal(db.disconnects, 0);
        mock.timers.tick(1);
        assert.equal(db.disconnects, 1);
        await act(async () => root.unmount());
    }
    finally {mock.timers.reset();}
});

test('useDatabox shares one databox between an enabled and a disabled component', async () => {
    mock.timers.enable({apis: ['setTimeout']});
    try {
        const client = fakeDataboxClient();
        const off = await render(React.createElement(BoxWhen, {client, identifier: 'cinema', enabled: false}));
        const on = await render(React.createElement(BoxWhen, {client, identifier: 'cinema', enabled: true}));
        assert.equal(client.created.length, 1);
        const [db] = client.created;
        assert.deepEqual(db.connects, [undefined]);
        await act(async () => db.set(3));
        assert.equal(on.container.textContent, '3');
        assert.equal(off.container.textContent, '3');
        await on.unmount();
        mock.timers.tick(DATABOX_RELEASE_DELAY);
        assert.equal(db.disconnects, 1);
        await off.unmount();
    }
    finally {mock.timers.reset();}
});

/** A client with the connection, token and reconnect events. */
function fakeEventClient() {
    const listeners = {};
    const client = {connected: false, authenticated: false, authTokenPayload: null, nextReconnectAt: null};
    for (const event of ['Connect', 'Disconnect', 'Authenticate', 'Deauthenticate', 'NextReconnectChange']) {
        listeners[event] = new Set();
        client['on' + event] = (listener) => listeners[event].add(listener);
        client['off' + event] = (listener) => listeners[event].delete(listener);
    }
    client.emit = (event) => {for (const listener of listeners[event]) listener();};
    client.listenerCount = () => Object.values(listeners).reduce((sum, set) => sum + set.size, 0);
    return client;
}

test('useConnected, useAuthenticated and useAuthTokenPayload follow the client', async () => {
    const client = fakeEventClient();
    function State() {
        const connected = useConnected(client);
        const authenticated = useAuthenticated(client);
        const payload = useAuthTokenPayload(client);
        return React.createElement('span', null,
            `${connected ? 'on' : 'off'} ${authenticated ? 'in' : 'out'} ${payload ? payload.name : '-'}`);
    }
    const {container, unmount} = await render(React.createElement(State));
    assert.equal(container.textContent, 'off out -');

    await act(async () => {client.connected = true; client.emit('Connect');});
    assert.equal(container.textContent, 'on out -');
    await act(async () => {
        client.authenticated = true;
        client.authTokenPayload = {name: 'Tim'};
        client.emit('Authenticate');
    });
    assert.equal(container.textContent, 'on in Tim');
    //a new token with the same login
    await act(async () => {client.authTokenPayload = {name: 'Tom'}; client.emit('Authenticate');});
    assert.equal(container.textContent, 'on in Tom');
    await act(async () => {
        client.connected = false;
        client.authenticated = false;
        client.authTokenPayload = null;
        client.emit('Disconnect');
        client.emit('Deauthenticate');
    });
    assert.equal(container.textContent, 'off out -');

    await unmount();
    assert.equal(client.listenerCount(), 0);
});

test('useNextReconnect follows the planned reconnect of the client', async () => {
    const client = fakeEventClient();
    let renders = 0;
    function Retry() {
        renders++;
        const at = useNextReconnect(client);
        return React.createElement('span', null, at === null ? '-' : String(at));
    }
    const {container, unmount} = await render(React.createElement(Retry));
    assert.equal(container.textContent, '-');
    await act(async () => {client.nextReconnectAt = 1700000002000; client.emit('NextReconnectChange');});
    assert.equal(container.textContent, '1700000002000');
    //the other events of the client do not render it
    await act(async () => client.emit('Connect'));
    assert.equal(renders, 2);
    await act(async () => {client.nextReconnectAt = null; client.emit('NextReconnectChange');});
    assert.equal(container.textContent, '-');
    await unmount();
    assert.equal(client.listenerCount(), 0);
});

test('useRequest sends once, again with reload, keeps the data on an error and waits while disabled', async () => {
    const answers = [];
    let calls = 0;
    const request = () => {
        calls++;
        const answer = answers.shift();
        return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    };
    let state;
    function Ports({enabled}) {
        state = useRequest(request, enabled);
        return React.createElement('span', null, String(state.data));
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => root.render(React.createElement(Ports, {enabled: false})));
    assert.equal(calls, 0);
    assert.equal(state.data, undefined);

    answers.push(['a']);
    await act(async () => root.render(React.createElement(Ports, {enabled: true})));
    assert.equal(calls, 1);
    assert.deepEqual(state.data, ['a']);
    //a render does not ask again
    await act(async () => root.render(React.createElement(Ports, {enabled: true})));
    assert.equal(calls, 1);

    const failure = new Error('device not reachable');
    answers.push(failure);
    await act(async () => state.reload());
    assert.equal(calls, 2);
    assert.deepEqual(state.data, ['a']);
    assert.equal(state.error, failure);

    answers.push(['a', 'b']);
    await act(async () => state.reload());
    assert.deepEqual(state.data, ['a', 'b']);
    assert.equal(state.error, undefined);
    await act(async () => root.unmount());
});

test('useRequest drops the answer of an older request', async () => {
    const pending = [];
    const request = () => new Promise((resolve) => pending.push(resolve));
    let state;
    function Ports() {
        state = useRequest(request);
        return null;
    }
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(async () => root.render(React.createElement(Ports)));
    await act(async () => state.reload());
    assert.equal(pending.length, 2);
    await act(async () => pending[1]('new'));
    await act(async () => pending[0]('old'));
    assert.equal(state.data, 'new');
    await act(async () => root.unmount());
});
