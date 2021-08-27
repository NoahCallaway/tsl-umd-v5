# tsl-umd-v5

### Installation
```
npm install tsl-umd
```

### Example 
```javascript
const TSL5 = require('./tsl-umd-v5')

var umd = new TSL5()

//Listening for tallies
umd.listenUDP(8900)

umd.on('message', (msg) => {
    console.log(msg)
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

umd.sendTallyUDP('192.168.X.X', 8900 ,tally)
```

