const CONSTANTS = {
    //Session-ID
    SID: 'VOS-SID',
    //User-ID
    UID: 'VOS-UID',
    //Website ID
    WID: 'VOS-WID',
    IP_DATA: 'VOS-D',
    SESSION_START: 'VOS-ST',
    NEW_SESSION: 'NEW_SESSION',
    END_SESSION: 'END-SESSION',
    NEW_EVENT: 'NEW_EVENT',
    ALL_SESSIONS: 'ALL-SESSIONS',
    GET_SESSION: 'GET-SESSION',
    LAST_UNLOAD: 'VOS-LU',
    LAST_SEEN: 'VOS-LS',
    TABS_OPEN: 'VOS-TABS',
    INTERNAL: 'internal',
    OUTBOUND: 'outbound',
    UNKNOWN: 'unknown',
    CHECK_RANGE_CHANGE: 1,
    SELECT_CHANGE: 2,
}
window.Cookies = cookiesJS(() => {})
function timestamp() {
    return Date.now() - getSessionStart()
}
function waitUntil( predicate, timeout, interval) {
    var timerInterval = interval || 4;
    var timerTimeout = timeout || 5000;

    return new Promise(function promiseCallback(resolve, reject) {
        var timer;
        var timeoutTimer;
        var clearTimers;
        var doStep;

        clearTimers = function clearWaitTimers() {
            clearTimeout(timeoutTimer);
            clearInterval(timer);
        };

        doStep = function doTimerStep() {
            var result;

            try {
                result = predicate();

                if (result) {
                    clearTimers();
                    resolve(result);
                } else {
                    timer = setTimeout(doStep, timerInterval);
                }
            } catch (e) {
                clearTimers();
                reject(e);
            }
        };

        timer = setTimeout(doStep, timerInterval);
        timeoutTimer = setTimeout(function onTimeout() {
            clearTimers();
            reject(new Error('Timed out after waiting for ' + timerTimeout + 'ms'));
        }, timerTimeout);
    });
}
//NPM Package 'input-diff', modified for use with Proto3 Defs ):
const diffText = {
    insertionDiff: function (oldText, newText) {
        var oi = 0,
            ni = 0,
            result = [],
            start, part;
        if (!(oldText.length && newText.length)) return [{text: newText}];
        while (true) {
            if (oldText[oi] === newText[ni]) {
                start = oi;
                do {
                    oi++;
                    ni++;
                    if (ni === newText.length) {
                        result.push({index: [start, oi]});
                        return result;
                    }
                    if (oi === oldText.length) {
                        result.push({index: [start, oi]}, {text: newText.slice(ni)});
                        return result;
                    }
                } while (oldText[oi] === newText[ni]);
                result.push({index: [start, oi]});
            } else {
                part = '';
                do {
                    part += newText[ni];
                    ni++;
                    if (ni === newText.length) {
                        result.push({text: part});
                        return result;
                    }
                } while (oldText[oi] !== newText[ni]);
                result.push({text: part});
            }
        }
    },
    deletionDiff: function (oldText, newText) {
        let oi = 0, ni = 0, result = [], start;
        if (!(oldText.length && newText.length)){return [{text: newText}]}
        while (true) {
            if (oldText[oi] === newText[ni]) {
                start = oi;
                do {
                    oi++;
                    ni++;
                    if (ni === newText.length) {
                        result.push({index: [start, oi]});
                        return result;
                    }
                    if (oi === oldText.length) {
                        result.push({index: [start, oi]}, {text: newText.slice(ni)});
                        return result;
                    }
                } while (oldText[oi] === newText[ni]);
                result.push({index: [start, oi]});
            } else {
                do {
                    oi++;
                    if (oi === oldText.length) {
                        result.push({text: newText.slice(ni)});
                        return result;
                    }
                } while (oldText[oi] !== newText[ni]);
            }
        }
    },
    diff: function (oldText, newText) {
        oldText = (oldText || '') + '';
        newText = (newText || '') + '';
        if (oldText === newText) {return null}
        if (oldText.length < newText.length) {return this.insertionDiff(oldText, newText)}
        return this.deletionDiff(oldText, newText);
    },
    apply: function (text, diff) {
        let result = '',  i;
        text = (text || '') + '';
        for (i = 0; i < diff.length; i++) {
            if (diff[i].index) {
                result += text.slice(diff[i].index[0], diff[i].index[1])
            } else {
                result += diff[i].text
            }
        }
        return result;
    }
};

const uuid = (function (globalCounter, slice) {
    return {
        generate: function (date = new Date()) {
            let nowHex = (1e16 + (1e4 * (+date + 122192928e5)).toString(16))[slice](-16)
            globalCounter %= 4096
            return [nowHex[slice](8, 16), '-', nowHex[slice](4, 8), -1, nowHex[slice](1, 4), -8, (1e3 + (globalCounter++).toString(16))[slice](-3), '-']
                .concat(('' + 1e11).split('').map(function () { return Math.random().toString(16)[2] })).join('')
        },
        parse: function (uuid) {
            const uuid_arr = uuid.split('-'),
                time_str = [uuid_arr[2].substring(1), uuid_arr[1], uuid_arr[0]].join( '' );
            return (parseInt( time_str, 16 ) - 122192928e9) / 10000
        }
    }
})(0, 'slice')

window.textNodeMap = {}
VOS__EVENT_BUFFER = []
function handleEvent(event) {
    if (window.VOS__SESSION_ESTABLISHED) {
        overlord.emit(CONSTANTS.NEW_EVENT, event)
    } else {
        VOS__EVENT_BUFFER.push(event)
    }
}

bootstrapOverSiteWatcher()

function bootstrapOverSiteConnection() {
    getUserID()
    if (isOldSessionActive()) {
        if (areThereMoreTabs()) {
            window.VOS__NEW_TAB = true
        } else {
            window.VOS__RECONNECTION = true
        }
    } else {
        startNewSession()
    }
    addNewTab()
    window.VOS__LAST_SEEN_TIMER = setInterval(setLastSeenTime, 5000)
}
function isOldSessionActive() {
    return getSessionID()
                && Date.now() - getLastSeenTime() <= 35000
                && (
                    document.referrer.match(new RegExp('^https?:\/\/' + document.location.hostname))
                    || (performance.navigation.type !== performance.navigation.TYPE_NAVIGATE || performance.getEntries()[0].type !== 'navigate')
                    || areThereMoreTabs()
                )
}
function areThereMoreTabs() {
    return getOpenTabs() > 0
}
function startNewSession() {
    window.VOS__NEW__SESSION = true
    sessionStorage.setItem(CONSTANTS.TABS_OPEN, '0')
    !getUserInfo() && fetchAndSetIpInfo()
    generateAndSetSessionIDAndStart()
}

bootstrapOverSiteConnection()


const overlord = socketCluster.create({hostname: 'visualatics.com'})
overlord.on('error', function (err) {
    console.log('Socket error - ' + err)
});

overlord.on('connect', async function () {
    console.log('OVERSITE: -> Initiating Overlord connection. Is this a new session, tab or a reconnect?', window.VOS__NEW__SESSION ? 'new session' : window.VOS__NEW_TAB ? 'new tab' : 'reconnect');
    await waitUntil(() => getUserInfo(), 20000, 0)
    if (window.VOS__NEW__SESSION) {
        overlord.emit(CONSTANTS.NEW_SESSION, {
            init: {
                userInfo: getUserInfo(),
                window: getWindowDimensions(),
                sid: getSessionID(),
                uid: getUserID(),
                wid: document.location.hostname,
            }
        }, console.log)
        window.VOS__NEW__SESSION = null
    } else if (window.VOS__NEW_TAB) {
        overlord.emit(CONSTANTS.NEW_EVENT, {
            init: {
                newTab: window.VOS__TAB_ID
            }
        })
        window.VOS__NEW_TAB = null
    }
    window.VOS__SESSION_ESTABLISHED = true;
    console.log('OVERSITE: -> Overlord connection established.');
    window.VOS__EVENT_BUFFER.forEach(handleEvent)
    window.VOS__EVENT_BUFFER = []
});

overlord.on('disconnect', () => {window.VOS__SESSION_ESTABLISHED = false})

function getSessionID() {
    return  window[CONSTANTS.SID] || sessionStorage.getItem(CONSTANTS.SID)
}

function generateAndSetSessionIDAndStart() {
    const sessionID = window[CONSTANTS.SID] = uuid.generate();
    window[CONSTANTS.SESSION_START] = sessionStorage[CONSTANTS.SESSION_START] = Date.now();
    //Cookies.set(CONSTANTS.SID, sessionID) && sessionStorage.setItem(CONSTANTS.SID, sessionID)
    return sessionID
}

function getUserID() {
    const userID = Cookies.get(CONSTANTS.UID) || localStorage.getItem(CONSTANTS.UID) || ((1 + Math.random()).toString(36).substr(2).substr(0, 5) + '-' + (1 + Math.random()).toString(36).substr(2).substr(0, 5)).toUpperCase()
    setUserID(userID)
    return userID
}
function setUserID(userID) {
    Cookies.set(CONSTANTS.UID, userID, {expires: 3650}) && localStorage.setItem(CONSTANTS.UID, userID)
}

function fetchAndSetIpInfo() {
    fetch('https://api.ip.sb/geoip').then(ipData => ipData.json()).then(setUserInfo)
}

function setUserInfo({ip, country_code: country, continent_code, organization}) {
    console.log('Done ip')
    /*Full example data on https://ipapi.co/json/:
       {
        "city": "Tel Aviv",
        "organization": "AS47956 XFone 018 Ltd",
        "country": "Israel",
        "ip": "94.230.83.183",
        "continent_code": "AS",
        "country_code": "IL",
        }
     */
    window.VOS__UDATA = {ip, country, eu: continent_code === 'EU', isp: organization.replace(/AS\d*? /gi, '')}
    sessionStorage.setItem(CONSTANTS.IP_DATA, JSON.stringify(window.VOS__UDATA))
}
function getUserInfo() {
    return window.VOS__UDATA = window.VOS__UDATA || JSON.parse(sessionStorage.getItem(CONSTANTS.IP_DATA))
}

function getSessionStart() {
    return  window[CONSTANTS.SESSION_START] || sessionStorage.getItem(CONSTANTS.SESSION_START) || uuid.parse(getSessionID())
}

function getLastSeenTime() {
    return sessionStorage.getItem(CONSTANTS.LAST_SEEN)
}
function setLastSeenTime() {
    sessionStorage.setItem(CONSTANTS.LAST_SEEN, Date.now().toString())
}
function getOpenTabs() {
    return sessionStorage.getItem(CONSTANTS.TABS_OPEN)
}
function addNewTab() {
    window.VOS__TAB_ID = sessionStorage[CONSTANTS.TABS_OPEN] = Math.max(0, Number(sessionStorage.getItem(CONSTANTS.TABS_OPEN))) + 1
}
function removeThisTab() {
    sessionStorage.setItem(CONSTANTS.TABS_OPEN, '' + (Math.max(0, Number(sessionStorage.getItem(CONSTANTS.TABS_OPEN))) - 1))
}

function getWindowDimensions() {
    return {width: window.innerWidth, height: window.innerHeight}
}

function navigatingTo() {
    if (!document.activeElement || !document.activeElement.href) {
        return CONSTANTS.UNKNOWN
    } else if (document.activeElement.href.match(document.location.host)) {
        return CONSTANTS.INTERNAL
    } else {
        return CONSTANTS.OUTBOUND
    }
}

//OverSite code

function bootstrapOverSiteWatcher() {
    function OverSiteDOMWatcher (records) {
        if (window.checkMutationOnClick) {
            window.mutationOnClick = true
            window.checkMutationOnClick = false
        }
        let start = performance.now()
        let changed = {};
        let book = records.reduce((book, record) => {
            if (record.target.id) {changed[record.target.id] = changed[record.target.id] || {}}
            if (record.target.nodeName.match(filterElementRegex)) {return book}
            switch(record.type) {
                case 'childList':
                    if (record.addedNodes.length > 0) {
                        book.added = book.added || [];
                        function processAdd(node) {
                            if (!node.nodeName.match(filterElementRegex)) {
                                book.added.push({
                                    ...(node.data ? {} : !!node.id ? {id: node.id, start: window.OVERSITE__CURRENT__ID} : {id: window.OVERSITE__CURRENT__ID}),
                                    parent: record.target.id,
                                    ...(record.nextSibling ? {next: record.nextSibling.id} : {}),
                                    ...(node.outerHTML != null ? {html: serializeElement(node, 'outer')} : {text: node.textContent})
                                })
                                addUniqueIdToElementAndChildren(node);
                            }
                        }
                        record.addedNodes.forEach(processAdd)
                    }
                    if (record.removedNodes.length > 0) {
                        book.removed = book.removed || [];
                        function processRemove(node) {
                            node.id && !node.nodeName.match(filterElementRegex)
                                ? book.removed.push({id: node.id})
                                : record.target.id
                                    && book.removed.push({parent: record.target.id, index: record.previousSibling ? getTextNodeIndex(record.previousSibling) + 1 : 0})
                        }
                        record.removedNodes.forEach(processRemove)
                    }
                    break;
                case 'characterData':
                    if (record.target.textContent === record.oldValue) {break}
                    const index = getCleanedIndex(record.target);
                    const parent = record.target.parentNode;
                    const textID = parent.id + '-' + index;
                    if (changed[textID] && changed[textID].textContent) {break}
                    changed[textID] = {
                        textContent: {
                            oldValue: record.oldValue,
                            node: record.target,
                            parent,
                            index
                        }
                    };
                    break;
                case 'attributes':
                    let {attributeName} = record;
                    if (attributeName.match(filterAttributesRegex) || (changed[record.target.id] && changed[record.target.id][attributeName])) {break}
                    if (record.target.nodeName.match(/input/) && attributeName.match(/value/gi)) {break}
                    changed[record.target.id][attributeName] = {
                        oldValue: record.oldValue,
                        node: record.target
                    };
                    break
            }
            return book
        }, {});
        if (Object.keys(window.textNodeMap).length > 0) {
            book.textNodeMap = JSON.stringify(window.textNodeMap)
            window.textNodeMap = {}
        }
        if (book.added) {
            book.added = book.added.filter((change, i, list) => !change.text || list.findIndex(n => n.parent === change.parent && n.text === change.text) === i)
            let page = serializeElement(document.body, 'inner');
            if (JSON.stringify({added: book.added, removed: book.removed}).length > page.length) {
                book.newPage = page;
                book.added = undefined;
                book.removed = undefined
            }
        }
        for (let nodeId of Object.keys(changed)) {
            Object.keys(changed[nodeId]).forEach(attribute => {
                let change = changed[nodeId][attribute];
                if (attribute === 'textContent' && change.oldValue !== change.node.textContent) {
                    book.text = book.text || [];
                    book.text.push({
                        value: change.node.textContent,
                        parent: change.parent.OverSiteID,
                        index: change.index
                    })
                } else if (change.oldValue !== change.node.getAttribute(attribute) && (attribute !== 'id' || change.oldValue)) {
                    book.attribute = book.attribute || {};
                    book.attribute[nodeId] = book.attribute[nodeId] || {change: []};
                    let currentValue = change.node.getAttribute(attribute);
                    if (attribute.match(/style|class/i)) {
                        currentValue = currentValue ? currentValue.replace(/([:;]) | ([;!])/gi, '$1$2').replace(/;$/i, '') : '';
                        const delimiter = attribute === 'style' ? ';' : ' ';
                        let difference = diffArraysForClassAndStyle((change.oldValue || '').replace(/([:;]) | ([;!])/gi, '$1$2').replace(/;$/i, '').split(delimiter), currentValue.split(delimiter));
                        book.attribute[nodeId].change.push({
                            name: attribute.substr(0,1),
                            ...(JSON.stringify(difference).length < currentValue.length
                                ? {...difference}
                                : currentValue.length > 0 ? {value: currentValue} : {})
                        })
                    } else {
                        book.attribute[nodeId].change.push({
                            name: attribute,
                            value: currentValue
                        })
                    }
                }
            })
        }

        if (Object.keys(book).length > 0) {
            book.timestamp = timestamp();
            handleEvent(book)
        }
    };
    window.serializeHTMLRegex = /<(?:no)?script.*?>(?:.|\n)*?<\/(?:no)?script>|<meta(?!.*?(?:name="viewport"|charset)).*?>|item(?:prop|scope|type)=".*?"|<link(?!.*?rel=.stylesheet.).*?>|<!--[\s\S]*?-->|(?:\son\w*?|tabindex|title|allow|enctype|cite|download|alt|action|value|method|nochange|autocomplete|(<(?!base)a)\s*?(?:href))="?.*?"| (?:data|aria|fb)-.+?=".*?"|\s+(\s)/gi;
    window.stripExtraSpaceRegex = /(>)\s+(<)/g
    //TODO: Implement dynamic Stylesheet Link insertion observer
    window.filterElementRegex = /script|meta|link|#comment/gi;
    window.filterAttributesRegex = /^(data|aria|fb)\-/i;

    function serializeElement(el, outerOrInner = 'outer') {
        return el[outerOrInner + 'HTML'].replace(serializeHTMLRegex, '$1').replace(stripExtraSpaceRegex, '$1$2')
    }

    function diffArraysForClassAndStyle(a, b) {
        let added = b.filter(val => !a.includes(val));
        let removed =  a.filter(val => !b.find(bval => val === bval || val.split(':')[0] === bval.split(':')[0])).map(val => val.split(':')[0]).filter(String);
        return (added.length === 0 && removed.length === 0)
            ? null
            : {
                ...(added.length > 0 ? {added}: {}),
                ...(removed.length > 0 ? {removed} : {})
            }
    }

    const cssHoverRegex = /[^;,}\n]*?:hover((?!::)[^, {])*/i
    window.VOS__HOVER_STYLE = ''
    window.VOS__INSERTED_CSS_RULES = [];
    function extractHoverRules(sheet) {
        let array = [];
        //Check for styles added by dynamic style libraries i.e styled-components, which are embodied by style tags with no textContent
        const dynamicCSSExists = sheet.href === null && sheet.cssRules.length > 0 && sheet.ownerNode.textContent === '';
        [...sheet.cssRules].forEach((rule, index) => {
            if (dynamicCSSExists) {
                window.VOS__INSERTED_CSS_RULES.push({sheetID: sheet.ownerNode.id, rule: rule.cssText, index})
            }
            if (rule.selectorText && rule.selectorText.match(/:hover/i)) {
                rule.selectorText.split(',').forEach(selector => {
                    const hoverCss = selector.match(cssHoverRegex)
                    if (hoverCss) {
                        array.push(hoverCss[0].replace(':hover', '').trim())
                        window.VOS__HOVER_STYLE += ` ${rule.selectorText.replace(/:hover/gi, '.os-hover').trim()}{${rule.style.cssText}}`
                    }
                })
            } else if (rule.type === 4 && window.matchMedia(rule.conditionText).matches) {
                array = array.concat(extractHoverRules(rule))
            }
        })
        return array
    }
    window.VOS__HOVER_ARRAY = [...document.styleSheets].filter(sheet => {
        try {
            return sheet.cssRules && sheet.cssRules[0]
        } catch (err) {
            return false
        }
    }).reduce((array, sheet) => array.concat(extractHoverRules(sheet)), []);

    function sendCSSInsertRules() {
        if (window.VOS__INSERTED_CSS_RULES && Array.isArray(window.VOS__INSERTED_CSS_RULES) && window.VOS__INSERTED_CSS_RULES.length > 0) {
            const cssChangeEvent = {
                timestamp: timestamp(),
                css: window.VOS__INSERTED_CSS_RULES
            }
            handleEvent(cssChangeEvent)
            window.VOS__INSERTED_CSS_RULES = []
        }
    }
    const debouncedCSSChange = debounce(sendCSSInsertRules, 50)
    function captureCSSInsertRule(rule, index) {
        const sheetID = this.ownerNode.id
        window.VOS__INSERTED_CSS_RULES.push({sheetID, rule, index})
        debouncedCSSChange()
        this.originalInsertRule(rule, index)
    }
    CSSStyleSheet.prototype.originalInsertRule = CSSStyleSheet.prototype.insertRule
    CSSStyleSheet.prototype.insertRule = captureCSSInsertRule;

    function captureScrollEvent(event) {
        const scrollTarget = event.target;
        let scrollEvent = {
            timestamp: timestamp()
        };
        if (!scrollTarget.nodeName.match(/document/i)) {
            scrollEvent.targetID = scrollTarget.id;
            scrollEvent.scroll = {
                x: scrollTarget.scrollLeft,
                y: scrollTarget.scrollTop
            }
        } else {
            scrollEvent.scroll = {
                x: window.pageXOffset,
                y: window.pageYOffset
            }
        }
        handleEvent(scrollEvent);
    }
    window.addEventListener('scroll', captureScrollEvent, {capture: true, passive: true});

    function captureChangeEvent({target}) {
        if (window.checkMutationOnClick) {
            window.mutationOnClick = true
            window.checkMutationOnClick = false
        }
        let changeEvent = {
            timestamp: timestamp(),
            change: {id: target.id}
        };
        if (target.type.match(/radio|check/i)) {
            changeEvent.change.checked = target.checked
            changeEvent.change.type = CONSTANTS.CHECK_RANGE_CHANGE
        } else if (target.type.match(/select/i)) {
            //TODO: Check how to replicate select tag open and hover
            changeEvent.change.index = target.selectedIndex
            changeEvent.change.type = CONSTANTS.SELECT_CHANGE
        } else {
            return
        }
        handleEvent(changeEvent);
    }
    window.addEventListener('change', captureChangeEvent, {capture: true, passive: true})

    function saveOldInputValueOnFocus({target}) {
        target.VOS__oldValue = target.value
    }
    window.addEventListener('focus', saveOldInputValueOnFocus, {capture: true, passive: true})
    function sendTextInputDiff(input) {
        const diff = diffText.diff(input.VOS__oldValue, input.value)
        if (diff) {
            const event = {
                timestamp: timestamp(),
                input: {
                    diff,
                    id: input.id
                }
            }
            input.VOS__oldValue = input.value;
            handleEvent(event)
        }
    }
    const throttledInputDiff = throttle(sendTextInputDiff, 400)
    function captureInputEvent({target}) {
        const targetType = target.type;
        let event = {
            timestamp: timestamp(),
            input: {id: target.id}
        };
        if (!targetType.match(/radio|check|select/i)) {
            if (targetType.match(/text|tel|password|number|search|email/i) ) {
                throttledInputDiff(target)
            } else {
                event.input.value = target.value
                handleEvent(event);
            }
        }
    }
    window.addEventListener('input', captureInputEvent, {capture: true, passive: true});

    function captureMouseMove({target, clientX, clientY}) {
        const mouseEvent = {
            timestamp: timestamp(),
            mouse: {
                x: clientX,
                y: clientY
            }
        }
        handleEvent(mouseEvent)
    }
    const throttledMouseMove = throttle(captureMouseMove, 70)
    window.addEventListener('mousemove' , throttledMouseMove, {capture: true})

    function getSelectionRangeArray() {
        const selection = window.getSelection()
        const rangeArray = []
        for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i)
            rangeArray.push({
                start: {id: range.startContainer.id, parent: range.startContainer.parentElement.id, index: getCleanedIndex(range.startContainer), offset: range.startOffset},
                end: {id: range.endContainer.id, parent: range.endContainer.parentElement.id, index: getCleanedIndex(range.endContainer), offset: range.endOffset}
            })
        }
        return rangeArray
    }
    function captureSelection() {
        const rangeArray = getSelectionRangeArray()
        const selectionEvent = {
            timestamp: timestamp(),
            selection: rangeArray
        }
        handleEvent(selectionEvent)
    }
    const throttledCaptureSelection = debounce(captureSelection, 20)
    window.addEventListener('selectionchange', throttledCaptureSelection , {capture: true})

    const debouncedResetRageCounter = debounce(() => {window.VOS__RAGE_CLICK_COUNTER = 0}, 500)
    function clickErrorHandler(event) {
        window.VOS__CLICK_ERRORS.push(event.error ? event.error.stack : event.message + ` Sorry we can't provide a more useful message. This usually happens when the error originated from a third-party script. Please try adding the 'crossorigin="anonymous"' attribute to third-party script tags`)
    }
    function startClickCapture() {
        debouncedResetRageCounter()
        window.VOS__RAGE_CLICK_COUNTER++
        window.lastClick = timestamp()
        window.checkMutationOnClick = true
        addEventListener('error', clickErrorHandler)
    }
    function endClickTimeout({clientX, clientY, className, rageCounter, timestamp}) {
        removeEventListener('error', clickErrorHandler)
        const isDeadClick = !window.mutationOnClick && window.getSelection().toString().length === 0
        //console.log('Click ended. Dead:', isDeadClick)
        const clickEvent = {
            timestamp,
            click: {
                ...(window.VOS__CLICK_ERRORS.length > 0 ? {errors: window.VOS__CLICK_ERRORS} : {}),
                x: clientX,
                y: clientY,
                ...(className.length > 0 ? {className} : {}),
                ...(rageCounter >= 3 ? {rage: true} : {}),
                ...(isDeadClick ? {dead: true} : {}),
            }
        }
        handleEvent(clickEvent)
        window.VOS__CLICK_ERRORS = []
        window.mutationOnClick = false
    }
    function endClickCapture({clientX, clientY, target: {className}}) {
        const endClickTimestamp = timestamp()
        setTimeout(endClickTimeout, 0, {clientX, clientY, className, rageCounter: window.VOS__RAGE_CLICK_COUNTER, timestamp: endClickTimestamp - window.lastClick > 200 ? endClickTimestamp : window.lastClick})
    }
    window.addEventListener('mousedown' , startClickCapture, {capture: true})
    window.addEventListener('mouseup' , endClickCapture, {capture: true})
    window.VOS__CLICK_ERRORS = []
    window.VOS__RAGE_CLICK_COUNTER = 0

    function resizeCapture() {
        requestAnimationFrame(() => {
            handleEvent({
                timestamp: timestamp(),
                resize: getWindowDimensions()
            })
        })
    }
    const debouncedResize = debounce(resizeCapture, 100)
    window.addEventListener('resize', debouncedResize, {passive: true})

    window.VOS__INIT_HTML = serializeElement(document.documentElement, 'inner')
    handleEvent({
        timestamp: 0,
        newPage: VOS__INIT_HTML,
        textNodeMap: window.textNodeMap,
        hover: {
            array: VOS__HOVER_ARRAY,
            style: VOS__HOVER_STYLE
        }
    })
    addUniqueIdToElementAndChildren(document.body);
    window.textNodeMap = {}
    sendCSSInsertRules()

    window.VOS__OBSERVER = new MutationObserver(OverSiteDOMWatcher);
    window.VOS__OBSERVER.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributeOldValue: true,
        characterDataOldValue: true
    });
}

function getCleanedIndex(node) {
    return [...node.parentNode.childNodes].filter(node => !node.nodeName.match(filterElementRegex)).indexOf(node)
}
function getTextNodeIndex(node) {
    return [...node.parentNode.childNodes].indexOf(node)
}
function addUniqueIdToElementAndChildren(el){
    if (el.nodeType === document.ELEMENT_NODE && !el.nodeName.match(filterElementRegex)) {
        if (!el.id) {
            el.OverSiteID = window.OVERSITE__CURRENT__ID = window.OVERSITE__CURRENT__ID || 1;
            el.setAttribute('id', el.OverSiteID);
            window.OVERSITE__CURRENT__ID++
        } else {
            el.OverSiteID = el.id
        }
        if (el.hasChildNodes()) el.childNodes.forEach(addUniqueIdToElementAndChildren)
    }
    if (el.nodeType === document.TEXT_NODE && el.nextSibling && el.nextSibling.nodeType === document.TEXT_NODE) {
        textNodeMap[el.parentNode.OverSiteID] = textNodeMap[el.parentNode.OverSiteID] || {};
        let index = getCleanedIndex(el);
        if (index >= 0) {
            textNodeMap[el.parentNode.OverSiteID][index] = el.length
        }
    }
}

function unloadHandler() {
    clearInterval(window.VOS__LAST_SEEN_TIMER)
    removeThisTab()
    switch (navigatingTo()) {
        case CONSTANTS.OUTBOUND:
            if (!areThereMoreTabs()) {
                overlord.emit(CONSTANTS.END_SESSION, getSessionID())
                sessionStorage.removeItem(CONSTANTS.SID)
                sessionStorage.removeItem(CONSTANTS.SESSION_START)
            }
            break;
        default:
            setLastSeenTime()
    }
}
window.addEventListener('beforeunload', unloadHandler)


function extend() {
    var i = 0;
    var result = {};
    for (; i < arguments.length; i++) {
        var attributes = arguments[i];
        for (var key in attributes) {
            result[key] = attributes[key];
        }
    }
    return result;
}
function cookiesJS(converter) {
    function api(key, value, attributes) {
        var result;
        if (typeof document === 'undefined') {
            return;
        }

        // Write

        if (arguments.length > 1) {
            attributes = extend({
                path: '/'
            }, api.defaults, attributes);

            if (typeof attributes.expires === 'number') {
                var expires = new Date();
                expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
                attributes.expires = expires;
            }

            // We're using "expires" because "max-age" is not supported by IE
            attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';
            try {
                result = JSON.stringify(value);
                if (/^[\{\[]/.test(result)) {
                    value = result;
                }
            } catch (e) {
            }

            if (!converter.write) {
                value = encodeURIComponent(String(value))
                    .replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
            } else {
                value = converter.write(value, key);
            }

            key = encodeURIComponent(String(key));
            key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
            key = key.replace(/[\(\)]/g, escape);

            var stringifiedAttributes = '';

            for (var attributeName in attributes) {
                if (!attributes[attributeName]) {
                    continue;
                }
                stringifiedAttributes += '; ' + attributeName;
                if (attributes[attributeName] === true) {
                    continue;
                }
                stringifiedAttributes += '=' + attributes[attributeName];
            }
            return (document.cookie = key + '=' + value + stringifiedAttributes);
        }

        // Read

        if (!key) {
            result = {};
        }

        // To prevent the for loop in the first place assign an empty array
        // in case there are no cookies at all. Also prevents odd result when
        // calling "get()"
        var cookies = document.cookie ? document.cookie.split('; ') : [];
        var rdecode = /(%[0-9A-Z]{2})+/g;
        var i = 0;

        for (; i < cookies.length; i++) {
            var parts = cookies[i].split('=');
            var cookie = parts.slice(1).join('=');

            if (!this.json && cookie.charAt(0) === '"') {
                cookie = cookie.slice(1, -1);
            }

            try {
                var name = parts[0].replace(rdecode, decodeURIComponent);
                cookie = converter.read ?
                    converter.read(cookie, name) : converter(cookie, name) ||
                    cookie.replace(rdecode, decodeURIComponent);

                if (this.json) {
                    try {
                        cookie = JSON.parse(cookie);
                    } catch (e) {
                    }
                }

                if (key === name) {
                    result = cookie;
                    break;
                }

                if (!key) {
                    result[name] = cookie;
                }
            } catch (e) {
            }
        }

        return result;
    }

    api.set = api;
    api.get = function (key) {
        return api.call(api, key);
    };
    api.getJSON = function () {
        return api.apply({
            json: true
        }, [].slice.call(arguments));
    };
    api.defaults = {};
    api.remove = function (key, attributes) {
        api(key, '', extend(attributes, {
            expires: -1
        }));
    };

    api.withConverter = cookiesJS;
    return api;
}

function throttle(func, limit) {
    let lastFunc
    let lastRan
    return function() {
        const context = this
        const args = arguments
        if (!lastRan) {
            func.apply(context, args)
            lastRan = Date.now()
        } else {
            clearTimeout(lastFunc)
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args)
                    lastRan = Date.now()
                }
            }, limit - (Date.now() - lastRan))
        }
    }
}
function debounce(func, delay) {
    let inDebounce
    return function() {
        const context = this
        const args = arguments
        clearTimeout(inDebounce)
        inDebounce = setTimeout(() => func.apply(context, args), delay)
    }
}
