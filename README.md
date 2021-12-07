# tsl-umd-v5

### Installation
```
npm install tsl-umd-v5
```

### Example 
```javascript
const TSL5 = require('./tsl-umd-v5')

var umd = new TSL5()

//Listen for UDP tallies
umd.listenUDP(8900)

//Listen for TCP tallies
umd.listenTCP(9000)

umd.on('message', (msg) => {
    console.log("Tally Received:", msg)
})

//Sending tallies
tally = {
    "screen": 0,
    "index": 1,
    "display": {
        "rh_tally": 1,
        "text_tally": 0,
        "lh_tally": 0,
        "brightness": 3,
        "text": "Test Tally"
    }
}
//Send UDP tally
umd.sendTallyUDP('192.168.X.X', 8900, tally)

//Send TCP tally
umd.sendTallyTCP('192.168.X.X', 9000, tally)
```

### Tally Values

| Value | Colour |
|-------|--------|
| 0     | Off    |
| 1     | Red    |
| 2     | Green  |
| 3     | Amber  |

### npm

 - <https://www.npmjs.com/package/tsl-umd-v5>

### git

 - <https://github.com/NoahCallaway/tsl-umd-v5>

<br>

---

### DLE/STX Sequence

By default, the DLE/STX sequence is **enabled on TCP** packets and **disabled on UDP** packets as specified [here](https://tslproducts.com/media/1959/tsl-umd-protocol.pdf).

If necessary, use the `sequence` argument to override the defaults.

```javascript
//Send UDP tally with DLE/STX forced ON
umd.sendTallyUDP('192.168.X.X', 8900, tally, true)

//Send TCP tally with DLE/STX forced OFF
umd.sendTallyTCP('192.168.X.X', 9000, tally, false)
```
